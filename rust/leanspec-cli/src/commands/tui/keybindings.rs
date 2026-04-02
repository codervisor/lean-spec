//! Mode-based input dispatch for keybindings.

use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers, MouseEvent};
use std::path::PathBuf;

use super::app::{App, AppMode, FocusPane};

/// Expand `~` in a path to the user's home directory.
fn expand_tilde(path: &str) -> PathBuf {
    if let Some(stripped) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(stripped);
        }
    }
    PathBuf::from(path)
}

/// Tab-complete the path buffer in the AddingProject action.
/// On Tab: expand to the longest unique directory prefix matching the current input.
fn tab_complete_path(app: &mut App) {
    use super::app::ProjectMgmtAction;
    let buffer = match app.project_mgmt.as_ref() {
        Some(m) => match &m.action {
            ProjectMgmtAction::AddingProject { buffer, .. } => buffer.clone(),
            _ => return,
        },
        None => return,
    };

    let expanded = expand_tilde(buffer.trim());
    // Determine parent dir and the prefix to match
    let (parent, prefix) = if expanded.is_dir() {
        // Buffer is already a complete dir; list its children
        (expanded, String::new())
    } else {
        let parent = expanded
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));
        let prefix = expanded
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        (parent, prefix)
    };

    let Ok(entries) = std::fs::read_dir(&parent) else {
        return;
    };
    let mut matches: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|name| !name.starts_with('.') && name.starts_with(&prefix))
        .collect();
    matches.sort();

    if matches.is_empty() {
        return;
    }

    let completed = if matches.len() == 1 {
        // Single match: complete fully with trailing slash
        parent.join(&matches[0]).to_string_lossy().into_owned() + "/"
    } else {
        // Multiple matches: complete to the longest common prefix
        let common = matches[1..].iter().fold(matches[0].clone(), |acc, s| {
            acc.chars()
                .zip(s.chars())
                .take_while(|(a, b)| a == b)
                .map(|(c, _)| c)
                .collect()
        });
        if common.len() > prefix.len() {
            parent.join(&common).to_string_lossy().into_owned()
        } else {
            return; // Nothing new to add
        }
    };

    // Write completed path back to buffer, collapsing HOME back to ~
    let display = if let Ok(home) = std::env::var("HOME") {
        if completed.starts_with(&home) {
            format!("~{}", &completed[home.len()..])
        } else {
            completed
        }
    } else {
        completed
    };

    if let Some(ref mut mgmt) = app.project_mgmt {
        if let ProjectMgmtAction::AddingProject { ref mut buffer, .. } = mgmt.action {
            *buffer = display;
        }
    }
}

/// Handle a key event based on the current app mode.
pub fn handle_key(app: &mut App, key: KeyEvent) {
    match app.mode {
        AppMode::Normal => handle_normal(app, key),
        AppMode::Search => handle_search(app, key),
        AppMode::Help => handle_help(app, key),
        AppMode::Filter => handle_filter(app, key),
        AppMode::Toc => handle_toc(app, key),
        AppMode::ProjectSwitcher => handle_project_switcher(app, key),
        AppMode::ProjectManagement => handle_project_management(app, key),
    }
}

fn handle_normal(app: &mut App, key: KeyEvent) {
    let page_size = (app.layout_left.height.saturating_sub(4) as usize).max(5);

    match key.code {
        KeyCode::Char('q') => app.should_quit = true,
        KeyCode::Char('j') | KeyCode::Down => {
            if app.focus == FocusPane::Right {
                app.scroll_detail_down();
            } else {
                app.move_down();
            }
        }
        KeyCode::Char('k') | KeyCode::Up => {
            if app.focus == FocusPane::Right {
                app.scroll_detail_up();
            } else {
                app.move_up();
            }
        }
        KeyCode::Char('g') | KeyCode::Home => {
            if app.focus == FocusPane::Right {
                app.detail_scroll = 0;
            } else {
                app.move_first();
            }
        }
        KeyCode::Char('G') | KeyCode::End => {
            if app.focus == FocusPane::Right {
                app.detail_scroll = app.detail_scroll.saturating_add(999);
            } else {
                app.move_last();
            }
        }
        KeyCode::PageDown => {
            if app.focus == FocusPane::Right {
                for _ in 0..page_size {
                    app.scroll_detail_down();
                }
            } else {
                app.page_down(page_size);
            }
        }
        KeyCode::PageUp => {
            if app.focus == FocusPane::Right {
                for _ in 0..page_size {
                    app.scroll_detail_up();
                }
            } else {
                app.page_up(page_size);
            }
        }
        KeyCode::Char('h') | KeyCode::Left => app.focus_left(),
        KeyCode::Char('l') | KeyCode::Right | KeyCode::Enter => {
            if app.tree_mode && app.focus == FocusPane::Left {
                // Enter on a parent node in tree mode toggles expand/collapse
                let is_parent = app
                    .tree_rows
                    .get(app.list_selected)
                    .is_some_and(|r| r.has_children);
                if is_parent {
                    app.toggle_current_tree_node();
                    return;
                }
            }
            app.focus_right();
        }
        KeyCode::Char(' ') => {
            if app.tree_mode && app.focus == FocusPane::Left {
                app.toggle_current_tree_node();
            }
        }
        KeyCode::Tab => {
            if key.modifiers.contains(KeyModifiers::SHIFT) {
                app.prev_group();
            } else {
                app.next_group();
            }
        }
        KeyCode::BackTab => app.prev_group(),
        KeyCode::Char('1') => app.set_board_view(),
        KeyCode::Char('2') => app.set_list_view(),
        KeyCode::Char('d') => app.toggle_detail_mode(),
        KeyCode::Char('/') => app.enter_search(),
        KeyCode::Char('?') => app.enter_help(),
        KeyCode::Char('[') => app.sidebar_narrow(),
        KeyCode::Char(']') => app.sidebar_widen(),
        KeyCode::Char('\\') => app.sidebar_toggle_collapse(),
        KeyCode::Char('s') => app.cycle_sort(),
        KeyCode::Char('f') => app.open_filter(),
        KeyCode::Char('F') => app.clear_filters(),
        KeyCode::Char('t') => app.toggle_tree(),
        KeyCode::Char('z') => app.collapse_all(),
        KeyCode::Char('Z') => app.expand_all(),
        KeyCode::Char('c') => {
            if app.primary_view == super::app::PrimaryView::Board {
                app.toggle_current_board_group();
            }
        }
        KeyCode::Char('C') => {
            if app.primary_view == super::app::PrimaryView::Board {
                app.collapse_all_board_groups();
            }
        }
        KeyCode::Char('E') => {
            if app.primary_view == super::app::PrimaryView::Board {
                app.expand_all_board_groups();
            }
        }
        KeyCode::Char('T') => {
            if app.focus == FocusPane::Right {
                app.open_toc();
            }
        }
        KeyCode::Char('p') => app.open_project_switcher(),
        KeyCode::Char('P') => app.open_project_management(),
        KeyCode::Esc => app.focus_left(),
        _ => {}
    }
}

/// Handle mouse events.
pub fn handle_mouse(app: &mut App, mouse: MouseEvent) {
    use ratatui::crossterm::event::{MouseButton, MouseEventKind};
    // Always consume scroll events — never let them propagate to the outer terminal.
    match mouse.kind {
        MouseEventKind::ScrollDown => {
            if app.sidebar_collapsed || mouse.column >= app.layout_right.x {
                app.scroll_detail_down();
            } else {
                app.move_down();
            }
        }
        MouseEventKind::ScrollUp => {
            if app.sidebar_collapsed || mouse.column >= app.layout_right.x {
                app.scroll_detail_up();
            } else {
                app.move_up();
            }
        }
        MouseEventKind::Down(MouseButton::Left) | MouseEventKind::Drag(MouseButton::Left) => {
            let col = mouse.column;
            let row = mouse.row;

            // Handle drag resize separately when already in drag mode
            if matches!(mouse.kind, MouseEventKind::Drag(_)) && app.drag_resize {
                app.resize_drag_to(col);
                return;
            }

            // Filter overlay: handle click on filter items when filter popup is open
            if app.mode == super::app::AppMode::Filter {
                handle_filter_click(app, col, row);
                return;
            }

            // Check scrollbar gutter click/drag
            let scrollbar_col = app.layout_left.x + app.layout_left.width.saturating_sub(1);
            if !app.sidebar_collapsed
                && app.layout_left.width > 0
                && col == scrollbar_col
                && row >= app.layout_left.y
                && row < app.layout_left.y + app.layout_left.height
            {
                let track_top = app.layout_left.y;
                let track_height = app.layout_left.height as usize;
                let total = app.visible_list_len();
                if track_height > 0 && total > 0 {
                    let click_offset = (row - track_top) as usize;
                    let new_selected =
                        (click_offset * total / track_height).min(total.saturating_sub(1));
                    if app.primary_view == super::app::PrimaryView::List {
                        app.list_selected = new_selected;
                        app.update_list_scroll();
                        app.load_selected_detail();
                    }
                }
                return;
            }

            // Check if near split boundary (drag handle)
            let split_col = if app.last_frame_width > 0 {
                (app.last_frame_width as u32 * app.sidebar_width_pct as u32 / 100) as u16
            } else {
                0
            };
            if !app.sidebar_collapsed
                && app.last_frame_width > 0
                && (col == split_col || col == split_col.saturating_sub(1) || col == split_col + 1)
            {
                app.drag_resize = true;
            } else if !app.sidebar_collapsed
                && app.layout_left.width > 0
                && col < app.layout_left.x + app.layout_left.width
            {
                // Click on the sidebar title bar (top border row) → cycle sort
                if row == app.layout_left.y {
                    app.cycle_sort();
                } else {
                    app.click_sidebar(row);
                }
            } else if col >= app.layout_right.x {
                app.focus = FocusPane::Right;
            }
        }
        MouseEventKind::Up(MouseButton::Left) => {
            app.drag_resize = false;
        }
        _ => {}
    }
}

/// Handle a mouse click inside the filter overlay.
/// The overlay geometry mirrors filter.rs render() so we can map (col, row) to an item.
fn handle_filter_click(app: &mut App, _col: u16, row: u16) {
    use super::app::{FILTER_PRIORITIES, FILTER_STATUSES};

    let w = app.last_frame_width;
    let h = app.last_frame_height;
    if w == 0 || h == 0 {
        return;
    }
    let _overlay_width = (w * 50 / 100).max(44).min(w);
    let overlay_height = 16u16.min(h.saturating_sub(4));
    let overlay_y = h.saturating_sub(overlay_height) / 2;
    // Inner area starts one row below the border
    let inner_y = overlay_y + 1;

    // Layout within inner (mirrors filter.rs chunks):
    // 0: STATUS header
    // 1..n_statuses: status items
    // n_statuses+1: blank
    // n_statuses+2: PRIORITY header
    // n_statuses+3..n_statuses+3+n_priorities: priority items
    let n_statuses = FILTER_STATUSES.len() as u16;
    let status_start = inner_y + 1; // skip STATUS header row
    let priority_start = status_start + n_statuses + 2; // skip blank + PRIORITY header

    if row >= status_start && row < status_start + n_statuses {
        let idx = (row - status_start) as usize;
        app.filter_cursor = idx;
        app.filter_toggle_current();
    } else if row >= priority_start && row < priority_start + FILTER_PRIORITIES.len() as u16 {
        let idx = FILTER_STATUSES.len() + (row - priority_start) as usize;
        app.filter_cursor = idx;
        app.filter_toggle_current();
    }
}

fn handle_search(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Esc => app.exit_search(),
        KeyCode::Enter => app.search_select(),
        KeyCode::Backspace => app.search_backspace(),
        KeyCode::Char(c) => app.search_type_char(c),
        _ => {}
    }
}

fn handle_help(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Esc | KeyCode::Char('?') | KeyCode::Char('q') => app.exit_overlay(),
        _ => {}
    }
}

fn handle_filter(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Esc => app.close_filter(),
        KeyCode::Char('j') | KeyCode::Down => app.filter_cursor_down(),
        KeyCode::Char('k') | KeyCode::Up => app.filter_cursor_up(),
        KeyCode::Char(' ') | KeyCode::Enter => app.filter_toggle_current(),
        KeyCode::Char('F') => {
            app.clear_filters();
            app.mode = super::app::AppMode::Filter; // stay in filter popup
        }
        KeyCode::Char('a') | KeyCode::Char('A') => {
            app.filter.hide_archived = !app.filter.hide_archived;
            app.apply_filter_and_sort();
        }
        _ => {}
    }
}

fn handle_toc(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Esc | KeyCode::Char('T') => app.close_toc(),
        KeyCode::Char('j') | KeyCode::Down => app.toc_move_down(),
        KeyCode::Char('k') | KeyCode::Up => app.toc_move_up(),
        KeyCode::Enter => app.toc_jump(),
        _ => {}
    }
}

fn handle_project_switcher(app: &mut App, key: KeyEvent) {
    use super::app::ProjectMgmtAction;

    // If search is active, route typing to search
    let searching = app.project_switcher.as_ref().is_some_and(|s| s.searching);

    if searching {
        match key.code {
            KeyCode::Esc => {
                if let Some(ref mut sw) = app.project_switcher {
                    sw.searching = false;
                    sw.search.clear();
                    sw.update_filter();
                }
            }
            KeyCode::Backspace => {
                if let Some(ref mut sw) = app.project_switcher {
                    sw.search.pop();
                    sw.update_filter();
                }
            }
            KeyCode::Char(c) => {
                if let Some(ref mut sw) = app.project_switcher {
                    sw.search.push(c);
                    sw.update_filter();
                }
            }
            KeyCode::Enter => {
                if let Some(ref mut sw) = app.project_switcher {
                    sw.searching = false;
                }
            }
            _ => {}
        }
        return;
    }

    match key.code {
        KeyCode::Esc => app.close_overlay(),
        KeyCode::Char('j') | KeyCode::Down => {
            if let Some(ref mut sw) = app.project_switcher {
                if !sw.filtered.is_empty() && sw.selected + 1 < sw.filtered.len() {
                    sw.selected += 1;
                }
            }
        }
        KeyCode::Char('k') | KeyCode::Up => {
            if let Some(ref mut sw) = app.project_switcher {
                sw.selected = sw.selected.saturating_sub(1);
            }
        }
        KeyCode::Enter => {
            // Switch to selected project
            let project = app
                .project_switcher
                .as_ref()
                .and_then(|sw| sw.selected_project())
                .cloned();
            if let Some(p) = project {
                app.switch_project(p);
            } else {
                app.close_overlay();
            }
        }
        KeyCode::Char('/') => {
            if let Some(ref mut sw) = app.project_switcher {
                sw.searching = true;
                sw.search.clear();
                sw.update_filter();
            }
        }
        KeyCode::Char('m') => {
            // Open project management
            app.open_project_management();
        }
        KeyCode::Char('a') => {
            // Open project management in add mode
            app.open_project_management();
            if let Some(ref mut mgmt) = app.project_mgmt {
                mgmt.action = ProjectMgmtAction::AddingProject {
                    buffer: String::new(),
                    message: None,
                };
            }
        }
        _ => {}
    }
}

fn handle_project_management(app: &mut App, key: KeyEvent) {
    use super::app::ProjectMgmtAction;
    use leanspec_core::storage::{ProjectRegistry, ProjectUpdate};

    // Handle active sub-actions first
    let mut action = app
        .project_mgmt
        .as_ref()
        .map(|m| m.action.clone())
        .unwrap_or(ProjectMgmtAction::None);

    match action {
        ProjectMgmtAction::Renaming { id, buffer } => {
            match key.code {
                KeyCode::Esc => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        mgmt.action = ProjectMgmtAction::None;
                    }
                }
                KeyCode::Enter => {
                    let new_name = buffer.trim().to_string();
                    if !new_name.is_empty() {
                        if let Ok(mut registry) = ProjectRegistry::new() {
                            let result = registry.update(
                                &id,
                                ProjectUpdate {
                                    name: Some(new_name),
                                    favorite: None,
                                    color: None,
                                },
                            );
                            if let Some(ref mut mgmt) = app.project_mgmt {
                                match result {
                                    Ok(_) => {
                                        mgmt.message = Some("Project renamed.".to_string());
                                    }
                                    Err(e) => {
                                        mgmt.message = Some(format!("Error: {}", e));
                                    }
                                }
                                mgmt.action = ProjectMgmtAction::None;
                                // Reload project list
                                mgmt.projects = super::app::load_projects_sorted();
                            }
                        }
                    } else if let Some(ref mut mgmt) = app.project_mgmt {
                        mgmt.action = ProjectMgmtAction::None;
                    }
                }
                KeyCode::Backspace => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        if let ProjectMgmtAction::Renaming { ref mut buffer, .. } = mgmt.action {
                            buffer.pop();
                        }
                    }
                }
                KeyCode::Char(c) => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        if let ProjectMgmtAction::Renaming { ref mut buffer, .. } = mgmt.action {
                            buffer.push(c);
                        }
                    }
                }
                _ => {}
            }
            return;
        }
        ProjectMgmtAction::ConfirmDelete { id } => {
            match key.code {
                KeyCode::Char('y') | KeyCode::Char('Y') => {
                    if let Ok(mut registry) = ProjectRegistry::new() {
                        let result = registry.remove(&id);
                        if let Some(ref mut mgmt) = app.project_mgmt {
                            match result {
                                Ok(_) => {
                                    mgmt.message = Some("Project removed.".to_string());
                                }
                                Err(e) => {
                                    mgmt.message = Some(format!("Error: {}", e));
                                }
                            }
                            mgmt.action = ProjectMgmtAction::None;
                            mgmt.projects = super::app::load_projects_sorted();
                            mgmt.selected =
                                mgmt.selected.min(mgmt.projects.len().saturating_sub(1));
                        }
                        // If the deleted project was current, clear it
                        if let Some(ref p) = app.current_project.clone() {
                            if p.id == id {
                                app.current_project = None;
                            }
                        }
                    }
                }
                _ => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        mgmt.action = ProjectMgmtAction::None;
                        mgmt.message = Some("Delete cancelled.".to_string());
                    }
                }
            }
            return;
        }
        ProjectMgmtAction::AddingProject { buffer, .. } => {
            match key.code {
                KeyCode::Esc => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        mgmt.action = ProjectMgmtAction::None;
                    }
                }
                KeyCode::Enter => {
                    let path_str = buffer.trim().to_string();
                    let expanded = expand_tilde(&path_str);

                    if let Ok(mut registry) = ProjectRegistry::new() {
                        match registry.add(&expanded) {
                            Ok(p) => {
                                if let Some(ref mut mgmt) = app.project_mgmt {
                                    mgmt.message = Some(format!("Added project '{}'.", p.name));
                                    mgmt.action = ProjectMgmtAction::None;
                                    mgmt.projects = super::app::load_projects_sorted();
                                }
                            }
                            Err(e) => {
                                if let Some(ref mut mgmt) = app.project_mgmt {
                                    mgmt.action = ProjectMgmtAction::AddingProject {
                                        buffer: path_str,
                                        message: Some(format!("Error: {}", e)),
                                    };
                                }
                            }
                        }
                    }
                }
                KeyCode::Tab => {
                    tab_complete_path(app);
                }
                KeyCode::Backspace => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        if let ProjectMgmtAction::AddingProject { ref mut buffer, .. } = mgmt.action
                        {
                            buffer.pop();
                        }
                    }
                }
                KeyCode::Char(c) => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        if let ProjectMgmtAction::AddingProject { ref mut buffer, .. } = mgmt.action
                        {
                            buffer.push(c);
                        }
                    }
                }
                _ => {}
            }
            return;
        }
        ProjectMgmtAction::ChangingColor {
            id,
            ref mut color_idx,
        } => {
            match key.code {
                KeyCode::Esc => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        mgmt.action = ProjectMgmtAction::None;
                    }
                }
                KeyCode::Enter => {
                    let (_, hex) = super::app::PRESET_COLORS[*color_idx];
                    let color_value = if hex.is_empty() {
                        None
                    } else {
                        Some(hex.to_string())
                    };
                    if let Ok(mut registry) = ProjectRegistry::new() {
                        let _ = registry.update(
                            &id,
                            ProjectUpdate {
                                name: None,
                                favorite: None,
                                color: color_value,
                            },
                        );
                    }
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        mgmt.action = ProjectMgmtAction::None;
                        mgmt.projects = super::app::load_projects_sorted();
                        mgmt.message = Some("Color updated.".to_string());
                    }
                }
                KeyCode::Char('j') | KeyCode::Down => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        if let ProjectMgmtAction::ChangingColor {
                            ref mut color_idx, ..
                        } = mgmt.action
                        {
                            *color_idx = (*color_idx + 1) % super::app::PRESET_COLORS.len();
                        }
                    }
                }
                KeyCode::Char('k') | KeyCode::Up => {
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        if let ProjectMgmtAction::ChangingColor {
                            ref mut color_idx, ..
                        } = mgmt.action
                        {
                            let len = super::app::PRESET_COLORS.len();
                            *color_idx = (*color_idx + len - 1) % len;
                        }
                    }
                }
                _ => {}
            }
            return;
        }
        ProjectMgmtAction::None => {}
    }

    // Normal project management navigation
    match key.code {
        KeyCode::Esc => app.close_overlay(),
        KeyCode::Char('j') | KeyCode::Down => {
            if let Some(ref mut mgmt) = app.project_mgmt {
                if !mgmt.projects.is_empty() && mgmt.selected + 1 < mgmt.projects.len() {
                    mgmt.selected += 1;
                }
            }
        }
        KeyCode::Char('k') | KeyCode::Up => {
            if let Some(ref mut mgmt) = app.project_mgmt {
                mgmt.selected = mgmt.selected.saturating_sub(1);
            }
        }
        KeyCode::Enter => {
            // Open/switch to selected project
            let project = app
                .project_mgmt
                .as_ref()
                .and_then(|m| m.selected_project())
                .cloned();
            if let Some(p) = project {
                app.switch_project(p);
            }
        }
        KeyCode::Char('a') => {
            if let Some(ref mut mgmt) = app.project_mgmt {
                mgmt.action = ProjectMgmtAction::AddingProject {
                    buffer: String::new(),
                    message: None,
                };
            }
        }
        KeyCode::Char('r') => {
            let info = app
                .project_mgmt
                .as_ref()
                .and_then(|m| m.selected_project())
                .map(|p| (p.id.clone(), p.name.clone()));
            if let Some((id, name)) = info {
                if let Some(ref mut mgmt) = app.project_mgmt {
                    mgmt.action = ProjectMgmtAction::Renaming { id, buffer: name };
                }
            }
        }
        KeyCode::Char('f') => {
            let id = app
                .project_mgmt
                .as_ref()
                .and_then(|m| m.selected_project())
                .map(|p| p.id.clone());
            if let Some(id) = id {
                if let Ok(mut registry) = ProjectRegistry::new() {
                    let result = registry.toggle_favorite(&id);
                    if let Some(ref mut mgmt) = app.project_mgmt {
                        match result {
                            Ok(is_fav) => {
                                mgmt.message = Some(if is_fav {
                                    "Marked as favorite.".to_string()
                                } else {
                                    "Removed from favorites.".to_string()
                                });
                            }
                            Err(e) => {
                                mgmt.message = Some(format!("Error: {}", e));
                            }
                        }
                        mgmt.projects = super::app::load_projects_sorted();
                    }
                }
            }
        }
        KeyCode::Char('d') => {
            let id = app
                .project_mgmt
                .as_ref()
                .and_then(|m| m.selected_project())
                .map(|p| p.id.clone());
            if let Some(id) = id {
                if let Some(ref mut mgmt) = app.project_mgmt {
                    mgmt.action = ProjectMgmtAction::ConfirmDelete { id };
                }
            }
        }
        KeyCode::Char('c') => {
            let info = app
                .project_mgmt
                .as_ref()
                .and_then(|m| m.selected_project())
                .map(|p| {
                    let current_color = p.color.as_deref().unwrap_or("");
                    let color_idx = super::app::PRESET_COLORS
                        .iter()
                        .position(|(_, hex)| *hex == current_color)
                        .unwrap_or(0);
                    (p.id.clone(), color_idx)
                });
            if let Some((id, color_idx)) = info {
                if let Some(ref mut mgmt) = app.project_mgmt {
                    mgmt.action = ProjectMgmtAction::ChangingColor { id, color_idx };
                }
            }
        }
        KeyCode::Char('v') => {
            // Validate project path
            let (id, exists) = app
                .project_mgmt
                .as_ref()
                .and_then(|m| m.selected_project())
                .map(|p| (p.id.clone(), p.exists()))
                .unwrap_or_default();
            if let Some(ref mut mgmt) = app.project_mgmt {
                mgmt.message = Some(if exists {
                    format!("Project '{}' path is valid.", id)
                } else {
                    format!("Project '{}' path is INVALID.", id)
                });
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::super::app::{AppMode, DetailMode, FocusPane, PrimaryView};
    use super::*;

    fn make_test_app() -> App {
        App::empty_for_test()
    }

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    #[test]
    fn test_q_quits() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('q')));
        assert!(app.should_quit);
    }

    #[test]
    fn test_slash_enters_search() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('/')));
        assert_eq!(app.mode, AppMode::Search);
    }

    #[test]
    fn test_question_mark_enters_help() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('?')));
        assert_eq!(app.mode, AppMode::Help);
    }

    #[test]
    fn test_f_enters_filter() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('f')));
        assert_eq!(app.mode, AppMode::Filter);
    }

    #[test]
    fn test_esc_in_search_returns_to_normal() {
        let mut app = make_test_app();
        app.mode = AppMode::Search;
        handle_key(&mut app, key(KeyCode::Esc));
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_esc_in_help_returns_to_normal() {
        let mut app = make_test_app();
        app.mode = AppMode::Help;
        handle_key(&mut app, key(KeyCode::Esc));
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_esc_in_filter_returns_to_normal() {
        let mut app = make_test_app();
        app.mode = AppMode::Filter;
        handle_key(&mut app, key(KeyCode::Esc));
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_1_2_switch_views() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('2')));
        assert_eq!(app.primary_view, PrimaryView::List);

        handle_key(&mut app, key(KeyCode::Char('1')));
        assert_eq!(app.primary_view, PrimaryView::Board);
    }

    #[test]
    fn test_d_toggles_detail_mode() {
        let mut app = make_test_app();
        assert_eq!(app.detail_mode, DetailMode::Content);

        handle_key(&mut app, key(KeyCode::Char('d')));
        assert_eq!(app.detail_mode, DetailMode::Dependencies);
    }

    #[test]
    fn test_h_l_switch_focus() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('l')));
        assert_eq!(app.focus, FocusPane::Right);

        handle_key(&mut app, key(KeyCode::Char('h')));
        assert_eq!(app.focus, FocusPane::Left);
    }

    #[test]
    fn test_bracket_keys_resize_sidebar() {
        let mut app = make_test_app();
        assert_eq!(app.sidebar_width_pct, 30);

        handle_key(&mut app, key(KeyCode::Char(']')));
        assert_eq!(app.sidebar_width_pct, 35);

        handle_key(&mut app, key(KeyCode::Char('[')));
        assert_eq!(app.sidebar_width_pct, 30);
    }

    #[test]
    fn test_backslash_toggles_sidebar_collapse() {
        let mut app = make_test_app();
        assert!(!app.sidebar_collapsed);

        handle_key(&mut app, key(KeyCode::Char('\\')));
        assert!(app.sidebar_collapsed);

        handle_key(&mut app, key(KeyCode::Char('\\')));
        assert!(!app.sidebar_collapsed);
    }

    #[test]
    fn test_s_cycles_sort() {
        use super::super::app::SortOption;
        let mut app = make_test_app();
        assert_eq!(app.sort_option, SortOption::IdDesc);

        handle_key(&mut app, key(KeyCode::Char('s')));
        assert_eq!(app.sort_option, SortOption::IdAsc);

        handle_key(&mut app, key(KeyCode::Char('s')));
        assert_eq!(app.sort_option, SortOption::PriorityDesc);
    }

    #[test]
    fn test_t_toggles_tree() {
        let mut app = make_test_app();
        assert!(!app.tree_mode);

        handle_key(&mut app, key(KeyCode::Char('t')));
        assert!(app.tree_mode);

        handle_key(&mut app, key(KeyCode::Char('t')));
        assert!(!app.tree_mode);
    }

    #[test]
    fn test_home_end_list() {
        let mut app = make_test_app();
        app.set_list_view();
        app.filtered_specs = vec![0, 1, 2, 3, 4];
        app.list_selected = 2;

        handle_key(&mut app, key(KeyCode::Home));
        assert_eq!(app.list_selected, 0);

        handle_key(&mut app, key(KeyCode::End));
        assert_eq!(app.list_selected, 4);
    }

    #[test]
    fn test_search_mode_typing() {
        let mut app = make_test_app();
        app.mode = AppMode::Search;

        handle_key(&mut app, key(KeyCode::Char('t')));
        handle_key(&mut app, key(KeyCode::Char('e')));
        handle_key(&mut app, key(KeyCode::Char('s')));
        assert_eq!(app.search_query, "tes");

        handle_key(&mut app, key(KeyCode::Backspace));
        assert_eq!(app.search_query, "te");
    }

    #[test]
    fn test_filter_j_k_moves_cursor() {
        let mut app = make_test_app();
        app.mode = AppMode::Filter;
        assert_eq!(app.filter_cursor, 0);

        handle_key(&mut app, key(KeyCode::Char('j')));
        assert_eq!(app.filter_cursor, 1);

        handle_key(&mut app, key(KeyCode::Char('k')));
        assert_eq!(app.filter_cursor, 0);
    }
}
