use std::{env, net::TcpStream, path::{Path, PathBuf}, process::{Child, Command, Stdio}, thread, time::Duration};

use anyhow::{anyhow, Context, Result};
use dunce::canonicalize;
use parking_lot::Mutex;
use portpicker::pick_unused_port;
use tauri::api::path::resolve_path;
use tauri::{AppHandle, Manager};

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
    let server = standalone.join("server.js");
    if !server.exists() {
        return Err(anyhow!("Missing server.js in embedded UI build"));
    }

    let mut command = Command::new("node");
    command.arg(&server).env("PORT", port.to_string()).env("HOSTNAME", "127.0.0.1");
    apply_env(&mut command, project);
    command.stdout(Stdio::null()).stderr(Stdio::null());
    command.spawn().context("Failed to start embedded UI server")
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

    let resource = resolve_path(&app.config(), app.package_info(), &app.env(), "ui-standalone", None)?;
    if resource.exists() {
        return Ok(resource);
    }

    Err(anyhow!("Unable to locate embedded UI standalone build"))
}
