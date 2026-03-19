//! Detail pane widget — spec metadata header + scrollable content body.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Widget, Wrap},
};

use leanspec_core::SpecInfo;

use super::app::{App, DetailMode, FocusPane};
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let is_focused = app.focus == FocusPane::Right;
    let border_style = if is_focused {
        Style::default().fg(ratatui::style::Color::Cyan)
    } else {
        Style::default().fg(ratatui::style::Color::DarkGray)
    };

    let title = match app.detail_mode {
        DetailMode::Content => " Detail ",
        DetailMode::Dependencies => " Dependencies ",
    };

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(border_style);
    let inner = block.inner(area);
    block.render(area, buf);

    match &app.selected_detail {
        Some(spec) => render_spec_detail(inner, buf, spec, app),
        None => {
            let msg =
                Paragraph::new("  Select a spec to view details").style(theme::dimmed_style());
            msg.render(inner, buf);
        }
    }
}

fn render_spec_detail(area: Rect, buf: &mut Buffer, spec: &SpecInfo, app: &App) {
    // Split into header (fixed) and body (scrollable)
    let chunks = Layout::vertical([Constraint::Length(6), Constraint::Min(1)]).split(area);

    // Metadata header
    render_metadata(chunks[0], buf, spec);

    // Content body (scrollable)
    render_content(chunks[1], buf, spec, app.detail_scroll);
}

fn render_metadata(area: Rect, buf: &mut Buffer, spec: &SpecInfo) {
    let status_style = theme::status_style(&spec.frontmatter.status);
    let status_sym = theme::status_symbol(&spec.frontmatter.status);
    let status_label = spec.frontmatter.status_label();

    let priority_str = spec
        .frontmatter
        .priority
        .map(|p| p.to_string())
        .unwrap_or_else(|| "-".to_string());

    let tags_str = if spec.frontmatter.tags.is_empty() {
        "-".to_string()
    } else {
        spec.frontmatter.tags.join(", ")
    };

    let assignee_str = spec.frontmatter.assignee.as_deref().unwrap_or("-");

    let lines = vec![
        Line::from(vec![Span::styled(&spec.title, theme::title_style())]),
        Line::from(vec![Span::styled(
            format!(" {}", spec.path),
            theme::dimmed_style(),
        )]),
        Line::from(vec![
            Span::raw(" Status: "),
            Span::styled(format!("{} {}", status_sym, status_label), status_style),
            Span::raw("  Priority: "),
            Span::raw(&priority_str),
            Span::raw("  Assignee: "),
            Span::raw(assignee_str),
        ]),
        Line::from(vec![
            Span::raw(" Tags: "),
            Span::styled(&tags_str, theme::dimmed_style()),
        ]),
        Line::styled(
            " ".to_string() + &"-".repeat(area.width.saturating_sub(2) as usize),
            theme::dimmed_style(),
        ),
    ];

    let paragraph = Paragraph::new(lines);
    paragraph.render(area, buf);
}

fn render_content(area: Rect, buf: &mut Buffer, spec: &SpecInfo, scroll: u16) {
    let content = &spec.content;
    let lines: Vec<Line> = content
        .lines()
        .map(|l| Line::from(format!(" {}", l)))
        .collect();

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((scroll, 0));
    paragraph.render(area, buf);
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
    fn test_detail_renders_placeholder_when_no_spec() {
        let mut app = App::empty_for_test();
        app.focus = FocusPane::Right;

        let backend = TestBackend::new(60, 20);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal
            .draw(|frame| {
                render(frame.area(), frame.buffer_mut(), &app);
            })
            .unwrap();

        let buf_str = buffer_text(terminal.backend().buffer());
        assert!(buf_str.contains("Detail"));
        assert!(buf_str.contains("Select a spec"));
    }
}
