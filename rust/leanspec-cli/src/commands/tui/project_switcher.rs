//! Project switcher popup overlay.
//!
//! Opened with `p` from any normal view, shows all registered projects
//! with search, favorites, and Enter-to-switch.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph, Widget},
};

use super::app::App;
use super::theme;
use leanspec_core::storage::project_registry::ProjectSource;

/// Render the project switcher overlay.
pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let Some(ref sw) = app.project_switcher else {
        return;
    };

    let overlay_width = area.width.clamp(44, 56);
    let max_items = sw.filtered.len().min(12) as u16;
    let overlay_height = (max_items + 6).min(area.height.saturating_sub(2));
    let x = (area.width.saturating_sub(overlay_width)) / 2;
    let y = (area.height.saturating_sub(overlay_height)) / 2;
    let overlay_area = Rect::new(x, y, overlay_width, overlay_height);

    Clear.render(overlay_area, buf);

    let block = Block::default()
        .title(" Switch Project ")
        .borders(Borders::ALL)
        .border_style(theme::overlay_border_style());
    let inner = block.inner(overlay_area);
    block.render(overlay_area, buf);

    if inner.height == 0 {
        return;
    }

    // Layout: search bar + list + hint
    let chunks = Layout::vertical([
        Constraint::Length(1), // search line
        Constraint::Length(1), // blank
        Constraint::Min(1),    // project list
        Constraint::Length(1), // hint
    ])
    .split(inner);

    // Search line
    let search_text = if sw.searching {
        format!(" Search: {}_ ", sw.search)
    } else if !sw.search.is_empty() {
        format!(" Filter: {} ", sw.search)
    } else {
        " Search: (press / to search) ".to_string()
    };
    let search_style = if sw.searching {
        theme::highlight_style()
    } else {
        theme::dimmed_style()
    };
    Paragraph::new(search_text)
        .style(search_style)
        .render(chunks[0], buf);

    // Project list
    let list_area = chunks[2];
    let visible = list_area.height as usize;
    let offset = if sw.selected >= visible {
        sw.selected - visible + 1
    } else {
        0
    };

    if sw.filtered.is_empty() {
        Paragraph::new(Line::styled(" No projects found. ", theme::dimmed_style()))
            .render(list_area, buf);
    } else {
        let mut lines: Vec<Line> = Vec::new();
        for (display_idx, &proj_idx) in sw.filtered.iter().enumerate().skip(offset).take(visible) {
            let Some(p) = sw.projects.get(proj_idx) else {
                continue;
            };
            let is_selected = display_idx == sw.selected;

            let star = if p.favorite { "★ " } else { "  " };
            let source_icon = match p.source {
                ProjectSource::Git => "◐ ",
                ProjectSource::Local => "  ",
            };

            // Truncate path for display
            let path_str = p.path.to_string_lossy();
            let max_path = (overlay_width as usize).saturating_sub(p.name.len() + 8);
            let displayed_path = if path_str.len() > max_path && max_path > 3 {
                format!("{}…", &path_str[..max_path - 1])
            } else {
                path_str.to_string()
            };

            let line_text = format!("{}{}{:<20} {}", star, source_icon, p.name, displayed_path);

            let style = if is_selected {
                theme::overlay_selected_style()
            } else if p.favorite {
                theme::favorite_style()
            } else {
                ratatui::style::Style::default()
            };

            lines.push(Line::styled(line_text, style));
        }
        Paragraph::new(lines).render(list_area, buf);
    }

    // Hint line
    let hint = Line::from(vec![
        Span::styled(" [a]", theme::dimmed_style()),
        Span::raw("dd  "),
        Span::styled("[m]", theme::dimmed_style()),
        Span::raw("anage  "),
        Span::styled("[/]", theme::dimmed_style()),
        Span::raw("search  "),
        Span::styled("[Enter]", theme::dimmed_style()),
        Span::raw("switch  "),
        Span::styled("[Esc]", theme::dimmed_style()),
        Span::raw("cancel"),
    ]);
    Paragraph::new(hint).render(chunks[3], buf);
}
