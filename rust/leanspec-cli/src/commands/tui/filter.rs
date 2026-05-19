//! Filter popup overlay — schema-driven multi-select over enum fields.
//!
//! Rows come from `App::filter_entries()`: status values first, then
//! priority values (or whatever enum-typed semantic fields the schema
//! exposes). Each row toggles a `(key, value)` pair on `FilterState`.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph, Widget},
};

use super::app::App;
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let entries = app.filter_entries();
    let total_rows = entries.len() as u16;

    let overlay_width = (area.width * 50 / 100).max(44).min(area.width);
    let overlay_height = (total_rows + 6).min(area.height.saturating_sub(4));
    let x = (area.width.saturating_sub(overlay_width)) / 2;
    let y = (area.height.saturating_sub(overlay_height)) / 2;
    let overlay_area = Rect::new(x, y, overlay_width, overlay_height);

    Clear.render(overlay_area, buf);

    let filter_label = if app.filter.is_empty(&app.schema) {
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

    // Group entries by field key so we can render section headers between
    // them (STATUS / PRIORITY etc).
    let mut grouped: Vec<(String, Vec<(usize, String)>)> = Vec::new();
    for (i, (key, value)) in entries.iter().enumerate() {
        if grouped.last().map(|(k, _)| k.as_str()) != Some(key.as_str()) {
            grouped.push((key.clone(), Vec::new()));
        }
        grouped.last_mut().unwrap().1.push((i, value.clone()));
    }

    // Layout: each section header + N rows; then a hint line.
    let mut constraints: Vec<Constraint> = Vec::new();
    for (_, rows) in &grouped {
        constraints.push(Constraint::Length(1)); // header
        constraints.push(Constraint::Length(rows.len() as u16));
        constraints.push(Constraint::Length(1)); // blank
    }
    constraints.push(Constraint::Min(1)); // hint
    let chunks = Layout::vertical(constraints).split(inner);

    let mut chunk_idx = 0;
    for (key, rows) in &grouped {
        let header_label = format!(" {}", key.to_uppercase());
        Paragraph::new(Line::styled(header_label, theme::header_style()))
            .render(chunks[chunk_idx], buf);
        chunk_idx += 1;

        let mut row_lines: Vec<Line> = Vec::new();
        for (cursor_idx, value) in rows {
            let checked = app.filter.is_selected(key, value);
            let is_cursor = app.filter_cursor == *cursor_idx;
            let check = if checked { "[x]" } else { "[ ]" };
            let label = super::app::field_label(value, key, &app.schema);
            let sym = theme::field_symbol(value, key, &app.schema);
            let style = if is_cursor {
                theme::highlight_style()
            } else {
                Style::default()
            };
            row_lines.push(Line::styled(
                format!("  {} {} {} ", check, sym, label),
                style,
            ));
        }
        Paragraph::new(row_lines).render(chunks[chunk_idx], buf);
        chunk_idx += 1;

        // skip blank chunk
        chunk_idx += 1;
    }

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
    if chunk_idx < chunks.len() {
        Paragraph::new(hint).render(chunks[chunk_idx], buf);
    }
}
