//! Board view widget — specs grouped by status.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    prelude::StatefulWidget,
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Widget},
};

use leanspec_core::SpecInfo;

use super::app::{App, FocusPane, PrimaryView};
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let is_focused = app.focus == FocusPane::Left && app.primary_view == PrimaryView::Board;
    let border_style = if is_focused {
        theme::border_focused_style()
    } else {
        theme::border_unfocused_style()
    };

    let filter_indicator = if !app.filter.is_empty() { " [F]" } else { "" };
    let board_title = format!(" Board [{}]{} ", app.sort_option.label(), filter_indicator);

    let block = Block::default()
        .title(board_title)
        .borders(Borders::ALL)
        .border_style(border_style);
    let inner = block.inner(area);
    block.render(area, buf);

    let mut lines: Vec<Line> = Vec::new();

    for (gi, group) in app.board_groups.iter().enumerate() {
        // Group header with collapse indicator
        let header_style = theme::status_style(&group.status).add_modifier(Modifier::BOLD);
        let symbol = theme::status_symbol(&group.status);
        let collapse_indicator = if group.collapsed { "▶" } else { "▼" };
        let collapsed_label = if group.collapsed { " [collapsed]" } else { "" };

        let is_group_selected = gi == app.board_group_idx && is_focused;
        let group_header_style = if is_group_selected {
            header_style.bg(ratatui::style::Color::Rgb(50, 50, 80))
        } else {
            header_style
        };

        lines.push(Line::from(vec![
            Span::styled(
                format!(
                    " {} {} {} {}",
                    collapse_indicator, symbol, group.label, collapsed_label
                ),
                group_header_style,
            ),
            Span::styled(
                format!(" ({}) ", group.indices.len()),
                theme::dimmed_style(),
            ),
        ]));

        if !group.collapsed {
            // Items in group
            for (ii, &spec_idx) in group.indices.iter().enumerate() {
                let spec = &app.specs[spec_idx];
                let is_current = gi == app.board_group_idx && ii == app.board_item_idx;

                let style = if is_current && is_focused {
                    theme::selected_style()
                } else if is_current {
                    theme::inactive_selected_style()
                } else {
                    Style::default()
                };

                let pri = theme::priority_symbol(spec.frontmatter.priority.as_ref());
                let dep_count = app
                    .dep_graph
                    .get_complete_graph(&spec.path)
                    .map_or(0, |g| g.depends_on.len());
                let line = format_spec_line(pri, spec, dep_count);
                lines.push(Line::styled(line, style));
            }
        }

        // Blank line between groups
        lines.push(Line::from(""));
    }

    if lines.is_empty() {
        lines.push(Line::styled("  No specs found", theme::dimmed_style()));
    }

    let total_lines = lines.len();
    let viewport_height = inner.height as usize;

    // Compute scroll offset to keep the selected item visible
    let scroll = app.board_scroll(viewport_height);
    let paragraph = Paragraph::new(lines).scroll((scroll as u16, 0));
    paragraph.render(inner, buf);

    // Scrollbar — only render if content exceeds viewport
    if total_lines > viewport_height {
        let mut scrollbar_state = ScrollbarState::new(total_lines)
            .position(scroll)
            .viewport_content_length(viewport_height);
        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .track_symbol(Some("▐"))
            .thumb_symbol("█");
        scrollbar.render(inner, buf, &mut scrollbar_state);
    }
}

fn format_spec_line(priority: &str, spec: &SpecInfo, dep_count: usize) -> String {
    let title = if spec.title.chars().count() > 36 {
        let truncated: String = spec.title.chars().take(33).collect();
        format!("{}...", truncated)
    } else {
        spec.title.clone()
    };
    let dep_str = if dep_count > 0 {
        format!(" deps:{}", dep_count)
    } else {
        String::new()
    };
    format!("  {} {} {}{}", priority, spec.path, title, dep_str)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::super::app::App;

    fn buffer_text(buf: &ratatui::buffer::Buffer) -> String {
        buf.content().iter().map(|c| c.symbol()).collect()
    }

    #[test]
    fn test_board_renders_group_headers() {
        let mut app = App::empty_for_test();
        app.board_groups = vec![super::super::app::BoardGroup {
            status: leanspec_core::SpecStatus::Draft,
            label: "Draft".to_string(),
            indices: vec![],
            collapsed: false,
        }];
        let backend = TestBackend::new(60, 20);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut(), &app);
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("Board"));
        assert!(buf_str.contains("Draft"));
    }

    #[test]
    fn test_board_collapsed_group_shows_indicator() {
        let mut app = App::empty_for_test();
        app.board_groups = vec![super::super::app::BoardGroup {
            status: leanspec_core::SpecStatus::Planned,
            label: "Planned".to_string(),
            indices: vec![],
            collapsed: true,
        }];
        let backend = TestBackend::new(60, 20);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut(), &app);
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("▶"));
    }

    #[test]
    fn test_board_shows_sort_label() {
        let app = App::empty_for_test();
        let backend = TestBackend::new(60, 20);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut(), &app);
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("Board"));
        assert!(buf_str.contains("ID"));
    }
}
