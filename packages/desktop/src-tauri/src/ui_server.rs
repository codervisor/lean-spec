use std::{env, net::TcpStream, path::{Path, PathBuf}, process::{Child, Command, Stdio}, thread, time::Duration};

use anyhow::{anyhow, Context, Result};
use dunce::canonicalize;
use parking_lot::Mutex;
use portpicker::pick_unused_port;
use tauri::{path::BaseDirectory, AppHandle, Manager};

use crate::projects::DesktopProject;

const DEV_SERVER_DEFAULT_PORT: u16 = 4319;

pub struct UiServerManager {
    child: Mutex<Option<Child>>,
    url: Mutex<Option<String>>,
}

impl UiServerManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            url: Mutex::new(None),
        }
    }

    pub fn stop(&self) {
        if let Some(mut child) = self.child.lock().take() {
            let _ = child.kill();
        }
        *self.url.lock() = None;
    }

    pub fn ensure_running(&self, app: &AppHandle, project: Option<&DesktopProject>) -> Result<String> {
        if let Ok(url) = env::var("LEAN_SPEC_UI_URL") {
            *self.url.lock() = Some(url.clone());
            return Ok(url);
        }

        if let Some(existing) = self.url.lock().clone() {
            return Ok(existing);
        }

        let port = pick_unused_port().unwrap_or(DEV_SERVER_DEFAULT_PORT);
        let child = if cfg!(debug_assertions) {
            spawn_dev_server(port, project)?
        } else {
            spawn_embedded_server(app, port, project)?
        };

        let url = format!("http://127.0.0.1:{port}");
        wait_for_server(port)?;

        *self.child.lock() = Some(child);
        *self.url.lock() = Some(url.clone());

        Ok(url)
    }
}

impl Drop for UiServerManager {
    fn drop(&mut self) {
        self.stop();
    }
}

fn spawn_dev_server(port: u16, project: Option<&DesktopProject>) -> Result<Child> {
    let pnpm = env::var("PNPM_PATH").unwrap_or_else(|_| "pnpm".into());
    let mut command = Command::new(pnpm);
    command
        .current_dir(project_root()?)
        .arg("--filter")
        .arg("@leanspec/ui")
        .arg("dev")
        .arg("--")
        .arg("--hostname")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string());

    apply_env(&mut command, project);

    command.stdout(Stdio::null()).stderr(Stdio::null());

    command.spawn().context("Failed to start pnpm dev server")
}

fn spawn_embedded_server(app: &AppHandle, port: u16, project: Option<&DesktopProject>) -> Result<Child> {
    let standalone = find_embedded_standalone_dir(app)?;
    let server = standalone.join("packages/ui/server.js");
    if !server.exists() {
        return Err(anyhow!("Missing server.js in embedded UI build at {:?}", server));
    }

    // Try to find Node.js executable
    let node_exe = find_node_executable(app)?;
    
    let mut command = Command::new(node_exe);
    command.arg(&server).env("PORT", port.to_string()).env("HOSTNAME", "127.0.0.1");
    apply_env(&mut command, project);
    command.stdout(Stdio::null()).stderr(Stdio::null());
    command.spawn().context("Failed to start embedded UI server. Please ensure Node.js >= 20 is installed.")
}

fn apply_env(command: &mut Command, project: Option<&DesktopProject>) {
    command.env("SPECS_MODE", "filesystem");
    if let Some(project) = project {
        command.env("SPECS_DIR", &project.specs_dir);
        command.env("LEAN_SPEC_PROJECT_NAME", &project.name);
    }
}

fn wait_for_server(port: u16) -> Result<()> {
    let address = format!("127.0.0.1:{port}");
    for _ in 0..80 {
        if TcpStream::connect(&address).is_ok() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(150));
    }

    Err(anyhow!("UI server did not become ready"))
}

fn project_root() -> Result<PathBuf> {
    let current = env::current_dir()?;
    for ancestor in current.ancestors() {
        if ancestor.join("pnpm-workspace.yaml").exists() {
            return Ok(ancestor.to_path_buf());
        }
    }
    Err(anyhow!("Unable to locate workspace root"))
}

fn find_embedded_standalone_dir(app: &AppHandle) -> Result<PathBuf> {
    if let Ok(path) = env::var("LEAN_SPEC_UI_STANDALONE") {
        let resolved = canonicalize(path)?;
        if resolved.exists() {
            return Ok(resolved);
        }
    }

    let resource = app.path().resolve("ui-standalone", BaseDirectory::Resource)?;
    if resource.exists() {
        return Ok(resource);
    }

    Err(anyhow!("Unable to locate embedded UI standalone build"))
}

fn find_node_executable(app: &AppHandle) -> Result<String> {
    // Highest priority: explicit override
    if let Ok(path) = env::var("LEAN_SPEC_NODE_PATH") {
        if Path::new(&path).exists() {
            return Ok(path);
        }
    }

    // Next: bundled runtime inside resources
    if let Some(path) = bundled_node_path(app) {
        return Ok(path);
    }

    // Fallback: system-installed Node.js
    let node_paths = if cfg!(target_os = "linux") {
        vec![
            "node",                              // In PATH
            "/usr/bin/node",                     // Standard location
            "/usr/local/bin/node",               // Alternative location
            "/opt/nodejs/bin/node",              // Optional location
            "/snap/bin/node",                    // Snap package
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            "node",                              // In PATH
            "/usr/local/bin/node",               // Homebrew
            "/opt/homebrew/bin/node",            // Apple Silicon Homebrew
        ]
    } else if cfg!(target_os = "windows") {
        vec![
            "node.exe",                          // In PATH
            "C:\\Program Files\\nodejs\\node.exe",
        ]
    } else {
        vec!["node"]
    };

    for path in node_paths {
        if let Ok(output) = Command::new(path).arg("--version").output() {
            if output.status.success() {
                return Ok(path.to_string());
            }
        }
    }

    Err(anyhow!(
        "Node.js not found. Please install Node.js >= 20 from https://nodejs.org/ or your system package manager.\n\
        On Debian/Ubuntu: sudo apt install nodejs\n\
        On Fedora/RHEL: sudo dnf install nodejs\n\
        On Arch: sudo pacman -S nodejs"
    ))
}

fn bundled_node_path(app: &AppHandle) -> Option<String> {
    // Map OS/arch to resource folder names used by the bundling script
    let target = match (env::consts::OS, env::consts::ARCH) {
        ("linux", "x86_64") => "linux-x64",
        ("linux", "aarch64") => "linux-arm64",
        _ => return None,
    };

    let candidate = app
        .path()
        .resolve(format!("node/{target}/node"), BaseDirectory::Resource)
        .ok()?;

    if candidate.exists() {
        Some(candidate.to_string_lossy().to_string())
    } else {
        None
    }
}
