//! Project management view — list, add, rename, delete, favorite projects.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph, Widget},
};

use super::app::{App, ProjectMgmtAction, PRESET_COLORS};
use super::theme;
use leanspec_core::storage::project_registry::ProjectSource;

/// Render the project management overlay/view.
pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let Some(ref mgmt) = app.project_mgmt else {
        return;
    };

    let overlay_width = area.width.clamp(54, 72);
    let overlay_height = area.height.clamp(12, 30);
    let x = (area.width.saturating_sub(overlay_width)) / 2;
    let y = (area.height.saturating_sub(overlay_height)) / 2;
    let overlay_area = Rect::new(x, y, overlay_width, overlay_height);

    Clear.render(overlay_area, buf);

    let block = Block::default()
        .title(" Projects ")
        .borders(Borders::ALL)
        .border_style(theme::overlay_border_style());
    let inner = block.inner(overlay_area);
    block.render(overlay_area, buf);

    if inner.height == 0 {
        return;
    }

    // Sub-action dialogs render on top
    match &mgmt.action {
        ProjectMgmtAction::AddingProject { buffer, message } => {
            render_add_project(inner, buf, buffer, message.as_deref());
            return;
        }
        ProjectMgmtAction::ConfirmDelete { id } => {
            render_confirm_delete(inner, buf, id);
            return;
        }
        ProjectMgmtAction::Renaming { buffer, .. } => {
            render_rename(inner, buf, buffer);
            return;
        }
        ProjectMgmtAction::ChangingColor { color_idx, .. } => {
            render_changing_color(inner, buf, *color_idx);
            return;
        }
        ProjectMgmtAction::None => {}
    }

    // Main project list
    let chunks = Layout::vertical([
        Constraint::Min(1),    // project list
        Constraint::Length(1), // message / status
        Constraint::Length(1), // hint
    ])
    .split(inner);

    let list_area = chunks[0];
    let visible = list_area.height as usize;

    // Scroll offset based on selection
    let offset = if mgmt.selected >= visible {
        mgmt.selected - visible + 1
    } else {
        0
    };

    if mgmt.projects.is_empty() {
        Paragraph::new(Line::styled(
            " No projects registered. Press [a] to add one.",
            theme::dimmed_style(),
        ))
        .render(list_area, buf);
    } else {
        let mut lines: Vec<Line> = Vec::new();
        for (idx, p) in mgmt.projects.iter().enumerate().skip(offset).take(visible) {
            let is_selected = idx == mgmt.selected;
            let star = if p.favorite { "★" } else { " " };
            let source_icon = match p.source {
                ProjectSource::Git => "◐",
                ProjectSource::Local => " ",
            };
            let valid_icon = if p.exists() { "✓" } else { "✗" };

            let path_str = p.path.to_string_lossy();
            let max_path = (overlay_width as usize).saturating_sub(p.name.len() + 14);
            let displayed_path = if path_str.len() > max_path && max_path > 3 {
                format!("{}…", &path_str[..max_path - 1])
            } else {
                path_str.to_string()
            };

            let label = format!(
                " {} {} {} {:<24} {}",
                star, source_icon, valid_icon, p.name, displayed_path
            );

            let style = if is_selected {
                theme::overlay_selected_style()
            } else if !p.exists() {
                theme::error_style()
            } else if p.favorite {
                theme::favorite_style()
            } else {
                ratatui::style::Style::default()
            };

            lines.push(Line::styled(label, style));
        }
        Paragraph::new(lines).render(list_area, buf);
    }

    // Message line
    let msg_line = if let Some(ref msg) = mgmt.message {
        Line::styled(format!(" {}", msg), theme::success_style())
    } else {
        Line::raw("")
    };
    Paragraph::new(msg_line).render(chunks[1], buf);

    // Hint line
    let hint = Line::from(vec![
        Span::styled(" [a]", theme::dimmed_style()),
        Span::raw("dd  "),
        Span::styled("[r]", theme::dimmed_style()),
        Span::raw("ename  "),
        Span::styled("[c]", theme::dimmed_style()),
        Span::raw("olor  "),
        Span::styled("[f]", theme::dimmed_style()),
        Span::raw("avorite  "),
        Span::styled("[d]", theme::dimmed_style()),
        Span::raw("elete  "),
        Span::styled("[v]", theme::dimmed_style()),
        Span::raw("alidate  "),
        Span::styled("[Enter]", theme::dimmed_style()),
        Span::raw("open  "),
        Span::styled("[Esc]", theme::dimmed_style()),
        Span::raw("close"),
    ]);
    Paragraph::new(hint).render(chunks[2], buf);
}

fn render_add_project(area: Rect, buf: &mut Buffer, buffer: &str, message: Option<&str>) {
    let dialog_width = area.width.clamp(40, 52);
    let dialog_height = 6u16;
    let dx = (area.width.saturating_sub(dialog_width)) / 2;
    let dy = (area.height.saturating_sub(dialog_height)) / 2;
    let dialog_area = Rect::new(area.x + dx, area.y + dy, dialog_width, dialog_height);

    Clear.render(dialog_area, buf);
    let block = Block::default()
        .title(" Add Project ")
        .borders(Borders::ALL)
        .border_style(theme::overlay_border_style());
    let inner = block.inner(dialog_area);
    block.render(dialog_area, buf);

    let chunks = Layout::vertical([
        Constraint::Length(1), // path label
        Constraint::Length(1), // blank
        Constraint::Length(1), // message
        Constraint::Length(1), // hint
    ])
    .split(inner);

    Paragraph::new(format!(" Path: {}_ ", buffer)).render(chunks[0], buf);

    if let Some(msg) = message {
        let style = if msg.starts_with("Error") {
            theme::error_style()
        } else {
            theme::success_style()
        };
        Paragraph::new(Line::styled(format!(" {} ", msg), style)).render(chunks[2], buf);
    }

    let hint = Line::from(vec![
        Span::styled(" [Enter]", theme::dimmed_style()),
        Span::raw(":add  "),
        Span::styled("[Esc]", theme::dimmed_style()),
        Span::raw(":cancel"),
    ]);
    Paragraph::new(hint).render(chunks[3], buf);
}

fn render_confirm_delete(area: Rect, buf: &mut Buffer, id: &str) {
    let dialog_width = area.width.clamp(36, 48);
    let dialog_height = 4u16;
    let dx = (area.width.saturating_sub(dialog_width)) / 2;
    let dy = (area.height.saturating_sub(dialog_height)) / 2;
    let dialog_area = Rect::new(area.x + dx, area.y + dy, dialog_width, dialog_height);

    Clear.render(dialog_area, buf);
    let block = Block::default()
        .title(" Confirm Delete ")
        .borders(Borders::ALL)
        .border_style(theme::error_style());
    let inner = block.inner(dialog_area);
    block.render(dialog_area, buf);

    let chunks = Layout::vertical([Constraint::Length(1), Constraint::Length(1)]).split(inner);

    Paragraph::new(format!(" Delete '{}'? (files kept)", id)).render(chunks[0], buf);
    let hint = Line::from(vec![
        Span::styled(" [y]", theme::error_style()),
        Span::raw(":yes  "),
        Span::styled("[any]", theme::dimmed_style()),
        Span::raw(":cancel"),
    ]);
    Paragraph::new(hint).render(chunks[1], buf);
}

fn render_rename(area: Rect, buf: &mut Buffer, buffer: &str) {
    let dialog_width = area.width.clamp(36, 48);
    let dialog_height = 4u16;
    let dx = (area.width.saturating_sub(dialog_width)) / 2;
    let dy = (area.height.saturating_sub(dialog_height)) / 2;
    let dialog_area = Rect::new(area.x + dx, area.y + dy, dialog_width, dialog_height);

    Clear.render(dialog_area, buf);
    let block = Block::default()
        .title(" Rename Project ")
        .borders(Borders::ALL)
        .border_style(theme::overlay_border_style());
    let inner = block.inner(dialog_area);
    block.render(dialog_area, buf);

    let chunks = Layout::vertical([Constraint::Length(1), Constraint::Length(1)]).split(inner);

    Paragraph::new(format!(" Name: {}_ ", buffer)).render(chunks[0], buf);
    let hint = Line::from(vec![
        Span::styled(" [Enter]", theme::dimmed_style()),
        Span::raw(":save  "),
        Span::styled("[Esc]", theme::dimmed_style()),
        Span::raw(":cancel"),
    ]);
    Paragraph::new(hint).render(chunks[1], buf);
}

fn render_changing_color(area: Rect, buf: &mut Buffer, color_idx: usize) {
    let n = PRESET_COLORS.len() as u16;
    let dialog_width = area.width.clamp(28, 36);
    let dialog_height = (n + 4).min(area.height);
    let dx = (area.width.saturating_sub(dialog_width)) / 2;
    let dy = (area.height.saturating_sub(dialog_height)) / 2;
    let dialog_area = Rect::new(area.x + dx, area.y + dy, dialog_width, dialog_height);

    Clear.render(dialog_area, buf);
    let block = Block::default()
        .title(" Pick Color ")
        .borders(Borders::ALL)
        .border_style(theme::overlay_border_style());
    let inner = block.inner(dialog_area);
    block.render(dialog_area, buf);

    if inner.height == 0 {
        return;
    }

    let list_height = inner.height.saturating_sub(1) as usize;
    let mut lines: Vec<Line> = Vec::new();
    for (i, (name, hex)) in PRESET_COLORS.iter().enumerate().take(list_height) {
        let is_selected = i == color_idx;
        let indicator = if is_selected { ">" } else { " " };
        let color_block = if hex.is_empty() { "  " } else { "██" };
        let label = format!(" {} {} {}", indicator, color_block, name);
        let style = if is_selected {
            theme::overlay_selected_style()
        } else {
            ratatui::style::Style::default()
        };
        lines.push(Line::styled(label, style));
    }

    let hint_area = Rect::new(
        inner.x,
        inner.y + inner.height.saturating_sub(1),
        inner.width,
        1,
    );
    let list_area = Rect::new(
        inner.x,
        inner.y,
        inner.width,
        inner.height.saturating_sub(1),
    );

    Paragraph::new(lines).render(list_area, buf);
    let hint = Line::from(vec![
        Span::styled(" [Enter]", theme::dimmed_style()),
        Span::raw(":set  "),
        Span::styled("[Esc]", theme::dimmed_style()),
        Span::raw(":cancel"),
    ]);
    Paragraph::new(hint).render(hint_area, buf);
}
