//! Terminal UI entry point — schema-driven, adapter-agnostic.
//!
//! The TUI talks exclusively to the active [`leanspec_core::adapters::Adapter`]
//! and renders every status / priority / filter using the adapter's
//! [`leanspec_core::model::SpecSchema`]. There is no markdown-only guard:
//! GitHub / ADO / Jira projects open with the same code path.

pub mod app;
pub mod board;
pub mod deps;
pub mod detail;
pub mod filter;
pub mod headless;
pub mod help;
pub mod keybindings;
pub mod list;
pub mod markdown;
pub mod project_switcher;
pub mod projects;
pub mod search;
pub mod theme;
pub mod toc;

use std::error::Error;
use std::io;
use std::time::Duration;

use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{Adapter, AdapterRegistry};
use ratatui::crossterm::event::{self, DisableMouseCapture, EnableMouseCapture, Event};
use ratatui::crossterm::execute;
use ratatui::crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    Terminal,
};

use app::{App, AppMode, PrimaryView};

/// Run the TUI.
///
/// `specs_dir` is the markdown-only override (mirrors other commands). When
/// `None` and a project name is given, the project registry resolves the
/// adapter. When both are `None`, the active project config is used.
pub fn run(
    specs_dir: Option<&str>,
    view: &str,
    project_name: Option<&str>,
    headless: Option<&str>,
) -> Result<(), Box<dyn Error>> {
    let initial_view = match view {
        "list" => PrimaryView::List,
        _ => PrimaryView::Board,
    };

    // Resolve adapter + (optional) initial project.
    let (adapter, initial_project) = resolve_startup(specs_dir, project_name)?;

    if let Some(script) = headless {
        let mut app = App::new(adapter, initial_view, initial_project)?;
        run_headless(&mut app, script)?;
        return Ok(());
    }

    let mut terminal = setup_terminal()?;
    let result = (|| -> Result<(), Box<dyn Error>> {
        let mut app = App::new(adapter, initial_view, initial_project)?;
        event_loop(&mut terminal, &mut app)
    })();
    restore_terminal(&mut terminal)?;
    result
}

type StartupResolution = (Box<dyn Adapter>, Option<leanspec_core::storage::Project>);

fn resolve_startup(
    specs_dir: Option<&str>,
    project_name: Option<&str>,
) -> Result<StartupResolution, Box<dyn Error>> {
    // 1. Explicit --specs-dir wins (markdown-only).
    if let Some(dir) = specs_dir {
        let config = AdapterRegistry::project_config().ok();
        if let Some(cfg) = config {
            if cfg.adapter != "markdown" {
                return Err(format!(
                    "--specs-dir is not applicable to the '{}' adapter \
                     (only applies to markdown projects)",
                    cfg.adapter
                )
                .into());
            }
        }
        return Ok((Box::new(MarkdownAdapter::new(dir)), None));
    }

    // 2. --project resolves through the registry. Honour the project's own
    //    adapter.yaml if it has one (so GitHub / ADO / Jira projects open
    //    with their configured backend), falling back to markdown.
    if let Some(name) = project_name {
        if let Ok(registry) = leanspec_core::storage::ProjectRegistry::new() {
            if let Some(project) = registry
                .all()
                .iter()
                .find(|p| p.name == name || p.id == name)
                .cloned()
                .cloned()
            {
                let adapter = app::resolve_adapter_for_project(&project)?;
                return Ok((adapter, Some(project)));
            }
        }
        return Err(format!("Project '{}' not found in registry", name).into());
    }

    // 3. Fall back to the active project config (GitHub / ADO / Jira / markdown).
    let adapter = AdapterRegistry::from_project()?;
    Ok((adapter, None))
}

fn setup_terminal() -> Result<Terminal<CrosstermBackend<io::Stdout>>, Box<dyn Error>> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    Ok(Terminal::new(backend)?)
}

fn restore_terminal(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
) -> Result<(), Box<dyn Error>> {
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;
    Ok(())
}

fn event_loop(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    app: &mut App,
) -> Result<(), Box<dyn Error>> {
    while !app.should_quit {
        terminal.draw(|frame| draw(frame, app))?;
        if event::poll(Duration::from_millis(100))? {
            match event::read()? {
                Event::Key(key) => keybindings::handle_key(app, key),
                Event::Mouse(mouse) => keybindings::handle_mouse(app, mouse),
                Event::Resize(_, _) => {}
                _ => {}
            }
        }
    }
    app.save_prefs();
    Ok(())
}

fn draw(frame: &mut ratatui::Frame, app: &mut App) {
    let area = frame.area();
    app.last_frame_width = area.width;
    app.last_frame_height = area.height;

    let chunks = if app.sidebar_collapsed {
        Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(100)])
            .split(area)
    } else {
        let split = app.sidebar_width_pct;
        Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(split),
                Constraint::Percentage(100 - split),
            ])
            .split(area)
    };

    if app.sidebar_collapsed {
        app.layout_left = ratatui::layout::Rect::default();
        app.layout_right = chunks[0];
        render_right_pane(frame, app);
    } else {
        app.layout_left = chunks[0];
        app.layout_right = chunks[1];
        render_left_pane(frame, app);
        render_right_pane(frame, app);
    }

    // Overlays
    match app.mode {
        AppMode::Search => search::render(area, frame.buffer_mut(), app),
        AppMode::Help => help::render(area, frame.buffer_mut()),
        AppMode::Filter => filter::render(area, frame.buffer_mut(), app),
        AppMode::Toc => toc::render(area, frame.buffer_mut(), app),
        AppMode::ProjectSwitcher => project_switcher::render(area, frame.buffer_mut(), app),
        AppMode::ProjectManagement => projects::render(area, frame.buffer_mut(), app),
        AppMode::Normal => {}
    }
}

fn render_left_pane(frame: &mut ratatui::Frame, app: &App) {
    match app.primary_view {
        PrimaryView::Board => board::render(app.layout_left, frame.buffer_mut(), app),
        PrimaryView::List => list::render(app.layout_left, frame.buffer_mut(), app),
    }
}

fn render_right_pane(frame: &mut ratatui::Frame, app: &App) {
    match app.detail_mode {
        app::DetailMode::Content => detail::render(app.layout_right, frame.buffer_mut(), app),
        app::DetailMode::Dependencies => deps::render(app.layout_right, frame.buffer_mut(), app),
    }
}

/// Headless mode: replay a scripted key sequence then print app state as JSON.
///
/// Used by integration tests (see `tests/tui_e2e.rs`) to assert TUI behaviour
/// without a real terminal.
fn run_headless(app: &mut App, script: &str) -> Result<(), Box<dyn Error>> {
    let keys = headless::parse_key_sequence(script);
    for key in keys {
        keybindings::handle_key(app, key);
        if app.should_quit {
            break;
        }
    }
    let state = app.debug_state();
    println!("{}", serde_json::to_string_pretty(&state)?);
    Ok(())
}
