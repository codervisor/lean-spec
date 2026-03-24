//! Terminal UI (TUI) for interactive spec management.
//!
//! Provides a terminal-based interface for browsing, searching,
//! and viewing specs using ratatui + crossterm.

mod app;
mod board;
mod deps;
mod detail;
mod filter;
mod headless;
mod help;
mod keybindings;
mod list;
mod markdown;
mod project_switcher;
mod projects;
mod search;
mod theme;
mod toc;

use std::error::Error;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;

use notify::{RecursiveMode, Watcher};
use ratatui::{
    crossterm::event::{self, Event},
    crossterm::event::{DisableMouseCapture, EnableMouseCapture},
    crossterm::execute,
    layout::{Constraint, Layout, Rect},
    DefaultTerminal, Frame,
};

use app::{App, AppMode, DetailMode, PrimaryView};

/// Parse the --view CLI argument into a PrimaryView.
fn parse_view(view: &str) -> PrimaryView {
    match view {
        "board" => PrimaryView::Board,
        _ => PrimaryView::List,
    }
}

/// Resolve the specs directory for the TUI.
/// Returns `(specs_dir, project, registry_was_empty)`.
///
/// 1. If `--specs-dir` is given, use it directly (backward compat).
/// 2. If `--project <name>` is given, look up in registry.
/// 3. Check if CWD matches a registered project.
/// 4. Otherwise, auto-load the most recently accessed project from registry.
/// 5. If the registry is empty, fall back to "specs" (legacy behaviour) and signal first-launch.
fn resolve_specs_dir(
    specs_dir: Option<&str>,
    project_name: Option<&str>,
) -> Result<(PathBuf, Option<leanspec_core::storage::Project>, bool), Box<dyn Error>> {
    // Explicit --specs-dir always wins.
    if let Some(dir) = specs_dir {
        return Ok((PathBuf::from(dir), None, false));
    }

    // Try to load the project registry.
    let registry = leanspec_core::storage::ProjectRegistry::new();
    let registry = match registry {
        Ok(r) => r,
        Err(_) => {
            // Registry unavailable — fall back to legacy "specs" dir.
            return Ok((PathBuf::from("specs"), None, false));
        }
    };

    // --project flag: look up by name or id.
    if let Some(name) = project_name {
        let name_lower = name.to_lowercase();
        let projects = registry.all();
        let found = projects
            .into_iter()
            .find(|p| p.id.to_lowercase() == name_lower || p.name.to_lowercase() == name_lower);
        if let Some(p) = found {
            return Ok((p.specs_dir.clone(), Some(p.clone()), false));
        }
        return Err(format!("No project named '{}' found in registry.", name).into());
    }

    // Step 3: Check if CWD matches a registered project.
    let cwd = std::env::current_dir().ok();
    let projects = registry.all();
    if let Some(ref cwd) = cwd {
        let cwd_match = projects.iter().find(|p| {
            let specs_dir = &p.specs_dir;
            specs_dir == cwd
                || specs_dir.starts_with(cwd)
                || cwd.starts_with(specs_dir.parent().unwrap_or(specs_dir.as_path()))
        });
        if let Some(p) = cwd_match {
            return Ok((p.specs_dir.clone(), Some((*p).clone()), false));
        }
    }

    // Step 4: Use most recently accessed.
    if let Some(p) = projects.first() {
        return Ok((p.specs_dir.clone(), Some((*p).clone()), false));
    }

    // Step 5: Empty registry — fall back, signal first-launch.
    Ok((PathBuf::from("specs"), None, true))
}

/// Entry point for the TUI command.
pub fn run(
    specs_dir: Option<&str>,
    view: &str,
    project_name: Option<&str>,
    headless: Option<&str>,
) -> Result<(), Box<dyn Error>> {
    // Headless mode: replay key sequence and print JSON state, then exit.
    if let Some(script) = headless {
        return run_headless(specs_dir, view, project_name, script);
    }

    let initial_view = parse_view(view);

    let (resolved_dir, initial_project, registry_was_empty) =
        resolve_specs_dir(specs_dir, project_name)?;
    let dir_str = resolved_dir.to_string_lossy();
    let mut app = App::new(&dir_str, initial_view, initial_project)?;

    if registry_was_empty {
        app.open_first_launch_prompt();
    }

    // Spawn a file watcher on the specs directory. Changes to .md files signal a reload.
    let (tx, rx) = mpsc::channel::<()>();
    let _watcher = {
        let tx = tx.clone();
        notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                let is_md = event
                    .paths
                    .iter()
                    .any(|p| p.extension().is_some_and(|e| e == "md"));
                let is_change = matches!(
                    event.kind,
                    notify::EventKind::Modify(_)
                        | notify::EventKind::Create(_)
                        | notify::EventKind::Remove(_)
                );
                if is_md && is_change {
                    let _ = tx.send(());
                }
            }
        })
        .and_then(|mut w| {
            w.watch(resolved_dir.as_path(), RecursiveMode::Recursive)?;
            Ok(w)
        })
    };

    // Install custom panic hook to restore terminal on panic
    let original_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        ratatui::restore();
        original_hook(info);
    }));

    let mut terminal = ratatui::init();
    execute!(std::io::stdout(), EnableMouseCapture)?;
    let result = run_event_loop(&mut terminal, &mut app, &rx);
    // Save prefs for the current project on exit
    app.save_prefs();
    execute!(std::io::stdout(), DisableMouseCapture).ok();
    ratatui::restore();
    result
}

fn run_event_loop(
    terminal: &mut DefaultTerminal,
    app: &mut App,
    rx: &mpsc::Receiver<()>,
) -> Result<(), Box<dyn Error>> {
    loop {
        terminal.draw(|frame| draw(frame, app))?;

        if app.should_quit {
            break;
        }

        // Non-blocking poll so the loop can react to file-watch signals every 200ms.
        if event::poll(Duration::from_millis(200))? {
            match event::read()? {
                Event::Key(key) => keybindings::handle_key(app, key),
                Event::Mouse(mouse) => keybindings::handle_mouse(app, mouse),
                _ => {}
            }
        }

        // Drain file-change signals and trigger a reload (debounced inside reload_from_watch).
        let mut got_file_event = false;
        while rx.try_recv().is_ok() {
            got_file_event = true;
        }
        if got_file_event {
            app.reload_from_watch();
        }
    }
    Ok(())
}

fn run_headless(
    specs_dir: Option<&str>,
    view: &str,
    project_name: Option<&str>,
    script: &str,
) -> Result<(), Box<dyn Error>> {
    let initial_view = parse_view(view);
    let (resolved_dir, initial_project, _) = resolve_specs_dir(specs_dir, project_name)?;
    let dir_str = resolved_dir.to_string_lossy();
    let mut app = App::new(&dir_str, initial_view, initial_project)?;

    let keys = headless::parse_key_sequence(script);
    for key in keys {
        keybindings::handle_key(&mut app, key);
    }

    let state = app.debug_state();
    println!("{}", serde_json::to_string_pretty(&state)?);
    Ok(())
}

pub fn draw(frame: &mut Frame, app: &mut App) {
    let area = frame.area();

    // Main layout: content + status bar
    let main_chunks = Layout::vertical([Constraint::Min(1), Constraint::Length(1)]).split(area);

    let content_area = main_chunks[0];
    let status_area = main_chunks[1];

    // Responsive layout: split pane for wide terminals, single pane for narrow
    if content_area.width >= 80 {
        draw_split_pane(frame, content_area, app);
    } else {
        draw_single_pane(frame, content_area, app);
    }

    draw_status_bar(frame, status_area, app);

    // Draw overlays on top
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

fn draw_split_pane(frame: &mut Frame, area: Rect, app: &mut App) {
    app.last_frame_width = area.width;
    app.last_frame_height = area.height;

    let left_constraint = if app.sidebar_collapsed {
        Constraint::Length(0)
    } else {
        Constraint::Percentage(app.sidebar_width_pct)
    };
    let chunks = Layout::horizontal([left_constraint, Constraint::Min(1)]).split(area);
    app.layout_left = chunks[0];
    app.layout_right = chunks[1];

    // Left pane: Board or List
    if !app.sidebar_collapsed {
        match app.primary_view {
            PrimaryView::Board => board::render(chunks[0], frame.buffer_mut(), app),
            PrimaryView::List => list::render(chunks[0], frame.buffer_mut(), app),
        }
    }

    // Right pane: Detail or Dependencies
    match app.detail_mode {
        DetailMode::Content => detail::render(chunks[1], frame.buffer_mut(), app),
        DetailMode::Dependencies => deps::render(chunks[1], frame.buffer_mut(), app),
    }
}

fn draw_single_pane(frame: &mut Frame, area: Rect, app: &mut App) {
    app.last_frame_width = area.width;
    app.last_frame_height = area.height;
    app.layout_left = area;
    app.layout_right = area;

    match app.focus {
        app::FocusPane::Left => match app.primary_view {
            PrimaryView::Board => board::render(area, frame.buffer_mut(), app),
            PrimaryView::List => list::render(area, frame.buffer_mut(), app),
        },
        app::FocusPane::Right => match app.detail_mode {
            DetailMode::Content => detail::render(area, frame.buffer_mut(), app),
            DetailMode::Dependencies => deps::render(area, frame.buffer_mut(), app),
        },
    }
}

fn draw_status_bar(frame: &mut Frame, area: Rect, app: &App) {
    use ratatui::text::{Line, Span};

    let mode_str = match app.mode {
        AppMode::Normal => "NORMAL",
        AppMode::Search => "SEARCH",
        AppMode::Help => "HELP",
        AppMode::Filter => "FILTER",
        AppMode::Toc => "TOC",
        AppMode::ProjectSwitcher => "PROJECTS",
        AppMode::ProjectManagement => "PROJECTS",
    };

    let view_str = match app.primary_view {
        PrimaryView::Board => "Board",
        PrimaryView::List => "List",
    };

    let detail_str = match app.detail_mode {
        DetailMode::Content => "Content",
        DetailMode::Dependencies => "Deps",
    };

    let completion = app.stats.completion_percentage();

    // Selected spec path
    let selected_path = app
        .selected_detail
        .as_ref()
        .map(|s| format!(" {} ", s.path))
        .unwrap_or_default();

    // Project name indicator
    let project_span = if let Some(ref p) = app.current_project {
        Span::styled(format!(" {} │ ", p.name), theme::project_name_style())
    } else {
        Span::raw("")
    };

    // Show [↺] briefly after an auto-reload
    let reload_span = if app
        .reload_flash_until
        .is_some_and(|until| std::time::Instant::now() < until)
    {
        Span::styled(" [↺]", theme::highlight_style())
    } else {
        Span::raw("")
    };

    let status_line = Line::from(vec![
        project_span,
        Span::styled(format!(" {} ", mode_str), theme::highlight_style()),
        Span::styled(
            format!(" {} | {} ", view_str, detail_str),
            theme::status_bar_style(),
        ),
        Span::styled(
            format!(" {} specs | {:.0}% complete ", app.stats.total, completion),
            theme::status_bar_style(),
        ),
        Span::styled(selected_path, theme::status_bar_style()),
        reload_span,
        Span::styled(
            if app.primary_view == PrimaryView::Board {
                " q:quit  /?:search/help  1/2:view  c:collapse  C/E:all  Tab:next-group  s:sort  f:filter  p:projects "
            } else {
                " q:quit  /:search  ?:help  1/2:view  s:sort  f:filter  t:tree  d:deps  p:projects  [/]:sidebar "
            },
            theme::status_bar_style(),
        ),
    ]);

    let paragraph = ratatui::widgets::Paragraph::new(status_line).style(theme::status_bar_style());
    frame.render_widget(paragraph, area);
}

#[cfg(test)]
mod snapshot_tests {
    use super::app::{App, PrimaryView};

    fn fixtures_dir() -> String {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/tui-sample")
            .to_string_lossy()
            .into_owned()
    }

    fn make_app() -> App {
        App::new(&fixtures_dir(), PrimaryView::List, None).expect("failed to create test app")
    }

    fn render_to_string(app: &mut App, width: u16, height: u16) -> String {
        use ratatui::backend::TestBackend;
        use ratatui::Terminal;
        let backend = TestBackend::new(width, height);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal.draw(|frame| super::draw(frame, app)).unwrap();
        terminal
            .backend()
            .buffer()
            .content()
            .iter()
            .map(|c| c.symbol())
            .collect::<Vec<_>>()
            .chunks(width as usize)
            .map(|row| row.join("").trim_end().to_string())
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn test_list_view_default() {
        let mut app = make_app();
        let out = render_to_string(&mut app, 100, 25);
        assert!(
            out.contains("List [ID"),
            "missing list title with sort indicator"
        );
        assert!(out.contains("001-draft-spec"), "missing fixture spec");
    }

    #[test]
    fn test_list_view_sort_changed() {
        let mut app = make_app();
        app.cycle_sort(); // ID ↓ → ID ↑
        let out = render_to_string(&mut app, 100, 25);
        assert!(out.contains("List [ID"), "missing list title");
        assert!(out.contains("↑"), "missing ascending sort indicator");
    }

    #[test]
    fn test_board_view() {
        let mut app = make_app();
        app.set_board_view();
        let out = render_to_string(&mut app, 100, 25);
        assert!(out.contains("Board"), "missing board title");
        assert!(out.contains("In Progress"), "missing status group");
    }

    #[test]
    fn test_board_view_collapsed() {
        let mut app = make_app();
        app.set_board_view();
        app.toggle_current_board_group();
        let out = render_to_string(&mut app, 100, 25);
        assert!(out.contains("Board"), "missing board title");
        // After collapse, the group header should still appear
        assert!(
            out.contains("▶") || out.contains("▼"),
            "missing group expand/collapse indicator"
        );
    }

    #[test]
    fn test_help_overlay() {
        let mut app = make_app();
        app.enter_help();
        let out = render_to_string(&mut app, 100, 25);
        assert!(out.contains("Help"), "missing help overlay title");
        assert!(out.contains("Navigation"), "missing navigation section");
    }

    #[test]
    fn test_filter_overlay() {
        let mut app = make_app();
        app.open_filter();
        let out = render_to_string(&mut app, 100, 25);
        assert!(out.contains("Filter"), "missing filter overlay");
        assert!(out.contains("STATUS"), "missing status section");
    }
}
