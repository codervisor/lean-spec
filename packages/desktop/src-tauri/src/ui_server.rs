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
    let project_root = project_root()?;
    
    eprintln!("[DEBUG] Starting dev server:");
    eprintln!("[DEBUG]   pnpm: {}", pnpm);
    eprintln!("[DEBUG]   cwd: {:?}", project_root);
    eprintln!("[DEBUG]   port: {}", port);
    
    let mut command = Command::new(pnpm);
    command
        .current_dir(&project_root)
        .arg("--filter")
        .arg("@leanspec/ui")
        .arg("dev")
        .arg("--")
        .arg("--hostname")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string());

    apply_env(&mut command, project);

    command.stdout(Stdio::null()).stderr(Stdio::inherit());

    command.spawn().context("Failed to start pnpm dev server")
}

fn spawn_embedded_server(app: &AppHandle, port: u16, project: Option<&DesktopProject>) -> Result<Child> {
    let standalone = find_embedded_standalone_dir(app)?;
    eprintln!("[DEBUG] Standalone dir: {:?}", standalone);
    
    let server = standalone.join("packages/ui/server.js");
    eprintln!("[DEBUG] Server.js path: {:?}", server);
    eprintln!("[DEBUG] Server.js exists: {}", server.exists());
    
    if !server.exists() {
        return Err(anyhow!("Missing server.js in embedded UI build at {:?}", server));
    }

    // Try to find Node.js executable
    let node_exe = find_node_executable(app)?;
    eprintln!("[DEBUG] Node executable: {}", node_exe);
    
    // Get the directory containing server.js
    let server_dir = standalone.join("packages/ui");
    eprintln!("[DEBUG] Server working dir: {:?}", server_dir);
    eprintln!("[DEBUG] Server dir exists: {}", server_dir.exists());
    
    // Check for .next directory
    let next_dir = server_dir.join(".next");
    eprintln!("[DEBUG] .next dir: {:?}", next_dir);
    eprintln!("[DEBUG] .next exists: {}", next_dir.exists());
    
    // Set NODE_PATH to include the pnpm module structure
    let pnpm_modules = standalone.join("node_modules/.pnpm");
    eprintln!("[DEBUG] PNPM modules dir: {:?}", pnpm_modules);
    
    let mut command = Command::new(&node_exe);
    command
        .current_dir(&server_dir)
        .arg("server.js")
        .env("PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1");
    
    // Add NODE_PATH to help Node.js find dependencies in pnpm structure
    if pnpm_modules.exists() {
        command.env("NODE_PATH", pnpm_modules.to_string_lossy().to_string());
        eprintln!("[DEBUG] Set NODE_PATH to: {:?}", pnpm_modules);
    }
    
    apply_env(&mut command, project);
    
    eprintln!("[DEBUG] Starting server with command: {:?}", command);
    eprintln!("[DEBUG] Environment PORT={}, HOSTNAME=127.0.0.1", port);
    
    // Capture stderr to see any startup errors
    command.stdout(Stdio::inherit()).stderr(Stdio::inherit());
    
    let child = command.spawn().context("Failed to start embedded UI server. Please ensure Node.js >= 20 is installed.")?;
    eprintln!("[DEBUG] Server process spawned with PID: {:?}", child.id());
    
    Ok(child)
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
    eprintln!("[DEBUG] Waiting for server on {}", address);
    
    for attempt in 0..80 {
        if TcpStream::connect(&address).is_ok() {
            eprintln!("[DEBUG] Server is ready after {} attempts", attempt + 1);
            return Ok(());
        }
        if attempt % 10 == 0 {
            eprintln!("[DEBUG] Still waiting... (attempt {}/80)", attempt + 1);
        }
        thread::sleep(Duration::from_millis(150));
    }

    eprintln!("[ERROR] UI server did not become ready after 80 attempts (12 seconds)");
    Err(anyhow!("UI server did not become ready on {}", address))
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
    eprintln!("[DEBUG] Searching for Node.js executable...");
    
    // Highest priority: explicit override
    if let Ok(path) = env::var("LEAN_SPEC_NODE_PATH") {
        eprintln!("[DEBUG] Checking LEAN_SPEC_NODE_PATH: {}", path);
        if Path::new(&path).exists() {
            eprintln!("[DEBUG] Using Node from LEAN_SPEC_NODE_PATH");
            return Ok(path);
        }
        eprintln!("[DEBUG] LEAN_SPEC_NODE_PATH does not exist");
    }

    // Next: bundled runtime inside resources
    eprintln!("[DEBUG] Checking for bundled Node.js...");
    if let Some(path) = bundled_node_path(app) {
        eprintln!("[DEBUG] Found bundled Node.js at: {}", path);
        return Ok(path);
    }
    eprintln!("[DEBUG] No bundled Node.js found");

    // Fallback: system-installed Node.js
    eprintln!("[DEBUG] Checking system Node.js...");
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
        eprintln!("[DEBUG] Trying Node.js path: {}", path);
        if let Ok(output) = Command::new(path).arg("--version").output() {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout);
                eprintln!("[DEBUG] Found Node.js at {} (version: {})", path, version.trim());
                return Ok(path.to_string());
            }
        }
    }

    eprintln!("[ERROR] No Node.js executable found in any location");

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
        _ => {
            eprintln!("[DEBUG] No bundled Node for OS={}, ARCH={}", env::consts::OS, env::consts::ARCH);
            return None;
        }
    };
    
    eprintln!("[DEBUG] Looking for bundled resources/node/{}/node", target);

    let candidate = app
        .path()
        .resolve(format!("resources/node/{target}/node"), BaseDirectory::Resource)
        .or_else(|_| app.path().resolve(format!("node/{target}/node"), BaseDirectory::Resource))
        .ok()?;

    eprintln!("[DEBUG] Bundled node candidate: {:?}", candidate);
    if candidate.exists() {
        eprintln!("[DEBUG] Bundled node exists");
        Some(candidate.to_string_lossy().to_string())
    } else {
        eprintln!("[DEBUG] Bundled node does not exist at {:?}", candidate);
        None
    }
}
