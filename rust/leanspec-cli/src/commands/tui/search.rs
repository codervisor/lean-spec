//! Search/filter overlay — centered text input with live results.

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
    // Center the overlay: 60% width, max 20 lines tall
    let overlay_width = (area.width * 60 / 100).max(40).min(area.width);
    let overlay_height = 16.min(area.height.saturating_sub(4));
    let x = (area.width.saturating_sub(overlay_width)) / 2;
    let y = (area.height.saturating_sub(overlay_height)) / 2;
    let overlay_area = Rect::new(x, y, overlay_width, overlay_height);

    // Clear background
    Clear.render(overlay_area, buf);

    let block = Block::default()
        .title(" Search (Esc to close, Enter to select) ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(ratatui::style::Color::Yellow));
    let inner = block.inner(overlay_area);
    block.render(overlay_area, buf);

    let chunks = Layout::vertical([
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Min(1),
    ])
    .split(inner);

    // Input line
    let cursor_char = if app.search_query.is_empty() {
        "type to search..."
    } else {
        ""
    };
    let input_line = Line::from(vec![
        Span::styled(" > ", theme::title_style()),
        Span::raw(&app.search_query),
        Span::styled(cursor_char, theme::dimmed_style()),
    ]);
    Paragraph::new(input_line).render(chunks[0], buf);

    // Separator
    Paragraph::new(Line::styled(
        " ".to_string() + &"-".repeat(chunks[1].width.saturating_sub(2) as usize),
        theme::dimmed_style(),
    ))
    .render(chunks[1], buf);

    // Results
    let mut result_lines: Vec<Line> = Vec::new();
    let max_results = chunks[2].height as usize;

    if app.search_results.is_empty() && !app.search_query.is_empty() {
        result_lines.push(Line::styled("  No results", theme::dimmed_style()));
    } else {
        for (i, &spec_idx) in app.search_results.iter().take(max_results).enumerate() {
            if spec_idx < app.specs.len() {
                let spec = &app.specs[spec_idx];
                let sym = theme::status_symbol(&spec.frontmatter.status);
                let style = if i == 0 {
                    theme::highlight_style()
                } else {
                    Style::default()
                };
                result_lines.push(Line::styled(
                    format!("  {} {} - {}", sym, spec.path, spec.title),
                    style,
                ));
            }
        }
    }

    Paragraph::new(result_lines).render(chunks[2], buf);
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
    fn test_search_overlay_renders_input() {
        let mut app = App::empty_for_test();
        app.mode = super::super::app::AppMode::Search;
        app.search_query = "test query".to_string();

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut(), &app);
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("Search"));
        assert!(buf_str.contains("test query"));
    }
}
