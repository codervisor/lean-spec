//! List view widget — flat table with filtering.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Widget},
};

use super::app::{App, FocusPane, PrimaryView};
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let is_focused = app.focus == FocusPane::Left && app.primary_view == PrimaryView::List;
    let border_style = if is_focused {
        Style::default().fg(ratatui::style::Color::Cyan)
    } else {
        Style::default().fg(ratatui::style::Color::DarkGray)
    };

    let block = Block::default()
        .title(" List ")
        .borders(Borders::ALL)
        .border_style(border_style);
    let inner = block.inner(area);
    block.render(area, buf);

    let mut lines: Vec<Line> = Vec::new();

    // Header row
    lines.push(Line::from(vec![
        Span::styled(" S ", theme::header_style()),
        Span::styled("P ", theme::header_style()),
        Span::styled(format!("{:<30}", "Path"), theme::header_style()),
        Span::styled("Title", theme::header_style()),
    ]));
    lines.push(Line::styled(
        " ".to_string() + &"-".repeat(inner.width.saturating_sub(2) as usize),
        theme::dimmed_style(),
    ));

    // Determine visible range based on terminal height
    let visible_rows = inner.height.saturating_sub(3) as usize;
    let total = app.filtered_specs.len();

    // Calculate scroll offset to keep selected item visible
    let offset = if app.list_selected >= visible_rows {
        app.list_selected - visible_rows + 1
    } else {
        0
    };

    for (vi, &spec_idx) in app
        .filtered_specs
        .iter()
        .enumerate()
        .skip(offset)
        .take(visible_rows)
    {
        let spec = &app.specs[spec_idx];
        let is_selected = is_focused && vi == app.list_selected;

        let style = if is_selected {
            theme::selected_style()
        } else {
            Style::default()
        };

        let status_sym = theme::status_symbol(&spec.frontmatter.status);
        let priority_sym = theme::priority_symbol(spec.frontmatter.priority.as_ref());
        let path = if spec.path.len() > 28 {
            format!("{:<28}..", &spec.path[..28])
        } else {
            format!("{:<30}", spec.path)
        };
        let title = if spec.title.len() > 30 {
            format!("{}...", &spec.title[..27])
        } else {
            spec.title.clone()
        };

        lines.push(Line::styled(
            format!(" {} {} {} {}", status_sym, priority_sym, path, title),
            style,
        ));
    }

    if total == 0 {
        lines.push(Line::styled("  No specs found", theme::dimmed_style()));
    }

    let paragraph = Paragraph::new(lines);
    paragraph.render(inner, buf);
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
    fn test_list_renders_headers() {
        let mut app = App::empty_for_test();
        app.primary_view = PrimaryView::List;

        let backend = TestBackend::new(80, 20);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut(), &app);
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("List"));
        assert!(buf_str.contains("Path"));
        assert!(buf_str.contains("Title"));
    }
}
