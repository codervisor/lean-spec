//! Filter popup overlay — status and priority multi-select.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph, Widget},
};

use super::app::{App, FILTER_PRIORITIES, FILTER_STATUSES};
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let overlay_width = (area.width * 50 / 100).max(44).min(area.width);
    let overlay_height = 16.min(area.height.saturating_sub(4));
    let x = (area.width.saturating_sub(overlay_width)) / 2;
    let y = (area.height.saturating_sub(overlay_height)) / 2;
    let overlay_area = Rect::new(x, y, overlay_width, overlay_height);

    Clear.render(overlay_area, buf);

    let filter_label = if app.filter.is_empty() {
        " Filter (no active filters) "
    } else {
        " Filter (active) "
    };
    let block = Block::default()
        .title(filter_label)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(ratatui::style::Color::Yellow));
    let inner = block.inner(overlay_area);
    block.render(overlay_area, buf);

    let chunks = Layout::vertical([
        Constraint::Length(1), // STATUS header
        Constraint::Length(FILTER_STATUSES.len() as u16),
        Constraint::Length(1), // blank
        Constraint::Length(1), // PRIORITY header
        Constraint::Length(FILTER_PRIORITIES.len() as u16),
        Constraint::Min(1), // hint
    ])
    .split(inner);

    // Status section
    Paragraph::new(Line::styled(" STATUS", theme::header_style())).render(chunks[0], buf);

    let mut status_lines: Vec<Line> = Vec::new();
    for (i, &status) in FILTER_STATUSES.iter().enumerate() {
        let checked = app.filter.statuses.contains(&status);
        let cursor = i;
        let is_cursor = app.filter_cursor == cursor;
        let check = if checked { "[x]" } else { "[ ]" };
        let label = format!("{}", status);
        let sym = theme::status_symbol(&status);
        let style = if is_cursor {
            theme::highlight_style()
        } else {
            Style::default()
        };
        status_lines.push(Line::styled(
            format!("  {} {} {} ", check, sym, label),
            style,
        ));
    }
    Paragraph::new(status_lines).render(chunks[1], buf);

    // Priority section
    Paragraph::new(Line::styled(" PRIORITY", theme::header_style())).render(chunks[3], buf);

    let mut priority_lines: Vec<Line> = Vec::new();
    let n_statuses = FILTER_STATUSES.len();
    for (i, &priority) in FILTER_PRIORITIES.iter().enumerate() {
        let checked = app.filter.priorities.contains(&priority);
        let cursor = n_statuses + i;
        let is_cursor = app.filter_cursor == cursor;
        let check = if checked { "[x]" } else { "[ ]" };
        let label = format!("{}", priority);
        let sym = theme::priority_symbol(Some(&priority));
        let style = if is_cursor {
            theme::highlight_style()
        } else {
            Style::default()
        };
        priority_lines.push(Line::styled(
            format!("  {} {} {} ", check, sym, label),
            style,
        ));
    }
    Paragraph::new(priority_lines).render(chunks[4], buf);

    // Hint line
    let archived_hint = if app.filter.hide_archived {
        "  [A]:show archived"
    } else {
        "  [A]:hide archived"
    };
    let hint = Line::from(vec![
        Span::styled(" j/k", theme::dimmed_style()),
        Span::raw(":move  "),
        Span::styled("Space", theme::dimmed_style()),
        Span::raw(":toggle  "),
        Span::styled("F", theme::dimmed_style()),
        Span::raw(":clear all  "),
        Span::styled("Esc", theme::dimmed_style()),
        Span::raw(":close"),
        Span::styled(archived_hint, theme::dimmed_style()),
    ]);
    Paragraph::new(hint).render(chunks[5], buf);
}
