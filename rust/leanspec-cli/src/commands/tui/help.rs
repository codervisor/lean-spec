//! Help overlay — keybinding reference.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph, Widget},
};

use super::theme;

const HELP_LINES: &[(&str, &str)] = &[
    ("Navigation", ""),
    ("  j / k", "Move down / up"),
    ("  h / l", "Focus left / right pane"),
    ("  Tab", "Next board group"),
    ("  Shift+Tab", "Previous board group"),
    ("  Enter", "Select / open detail"),
    ("", ""),
    ("Views", ""),
    ("  1", "Board view"),
    ("  2", "List view"),
    ("  d", "Toggle dependencies view"),
    ("", ""),
    ("Overlays", ""),
    ("  /", "Open search"),
    ("  ?", "Show this help"),
    ("  Esc", "Close overlay / back to left pane"),
    ("", ""),
    ("General", ""),
    ("  q", "Quit"),
];

pub fn render(area: Rect, buf: &mut Buffer) {
    let overlay_width = 50.min(area.width.saturating_sub(4));
    let overlay_height = (HELP_LINES.len() as u16 + 3).min(area.height.saturating_sub(4));
    let x = (area.width.saturating_sub(overlay_width)) / 2;
    let y = (area.height.saturating_sub(overlay_height)) / 2;
    let overlay_area = Rect::new(x, y, overlay_width, overlay_height);

    Clear.render(overlay_area, buf);

    let block = Block::default()
        .title(" Help (press Esc or ? to close) ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(ratatui::style::Color::Green));
    let inner = block.inner(overlay_area);
    block.render(overlay_area, buf);

    let lines: Vec<Line> = HELP_LINES
        .iter()
        .map(|(key, desc)| {
            if desc.is_empty() && !key.is_empty() {
                // Section header
                Line::from(Span::styled(format!(" {}", key), theme::header_style()))
            } else if key.is_empty() {
                Line::from("")
            } else {
                Line::from(vec![
                    Span::styled(format!(" {:<16}", key), theme::title_style()),
                    Span::raw(*desc),
                ])
            }
        })
        .collect();

    let paragraph = Paragraph::new(lines);
    paragraph.render(inner, buf);
}

#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    fn buffer_text(buf: &ratatui::buffer::Buffer) -> String {
        buf.content().iter().map(|c| c.symbol()).collect()
    }

    #[test]
    fn test_help_overlay_contains_keybindings() {
        let backend = TestBackend::new(60, 30);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut());
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("Help"));
        assert!(buf_str.contains("Quit"));
        assert!(buf_str.contains("Navigation"));
    }
}
