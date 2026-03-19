//! Board view widget — specs grouped by status.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Widget},
};

use leanspec_core::SpecInfo;

use super::app::{App, FocusPane, PrimaryView};
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let is_focused = app.focus == FocusPane::Left && app.primary_view == PrimaryView::Board;
    let border_style = if is_focused {
        Style::default().fg(ratatui::style::Color::Cyan)
    } else {
        Style::default().fg(ratatui::style::Color::DarkGray)
    };

    let block = Block::default()
        .title(" Board ")
        .borders(Borders::ALL)
        .border_style(border_style);
    let inner = block.inner(area);
    block.render(area, buf);

    let mut lines: Vec<Line> = Vec::new();

    for (gi, group) in app.board_groups.iter().enumerate() {
        // Group header
        let header_style = theme::status_style(&group.status).add_modifier(Modifier::BOLD);
        let symbol = theme::status_symbol(&group.status);
        lines.push(Line::from(vec![
            Span::styled(format!(" {} {} ", symbol, group.label), header_style),
            Span::styled(format!("({})", group.indices.len()), theme::dimmed_style()),
        ]));

        // Items in group
        for (ii, &spec_idx) in group.indices.iter().enumerate() {
            let spec = &app.specs[spec_idx];
            let is_selected = is_focused && gi == app.board_group_idx && ii == app.board_item_idx;

            let style = if is_selected {
                theme::selected_style()
            } else {
                Style::default()
            };

            let pri = theme::priority_symbol(spec.frontmatter.priority.as_ref());
            let line = format_spec_line(pri, spec);
            lines.push(Line::styled(line, style));
        }

        // Blank line between groups
        lines.push(Line::from(""));
    }

    if lines.is_empty() {
        lines.push(Line::styled("  No specs found", theme::dimmed_style()));
    }

    let paragraph = Paragraph::new(lines);
    paragraph.render(inner, buf);
}

fn format_spec_line(priority: &str, spec: &SpecInfo) -> String {
    let title = if spec.title.len() > 40 {
        format!("{}...", &spec.title[..37])
    } else {
        spec.title.clone()
    };
    format!("  {} {} {}", priority, spec.path, title)
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
}
