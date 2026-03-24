//! Detail pane widget — spec metadata header + scrollable content body.

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    prelude::StatefulWidget,
    style::Style,
    text::{Line, Span},
    widgets::{
        Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Widget, Wrap,
    },
};

use leanspec_core::SpecInfo;

use super::app::{App, DetailMode, FocusPane};
use super::markdown;
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let is_focused = app.focus == FocusPane::Right;
    let border_style = if is_focused {
        theme::border_focused_style()
    } else {
        theme::border_unfocused_style()
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
    render_metadata(chunks[0], buf, spec, app);

    // Content body (scrollable)
    render_content(chunks[1], buf, spec, app);
}

fn render_metadata(area: Rect, buf: &mut Buffer, spec: &SpecInfo, app: &App) {
    let status_style = theme::status_style(&spec.frontmatter.status);
    let status_sym = theme::status_symbol(&spec.frontmatter.status);
    let status_label = spec.frontmatter.status_label();

    let priority_sym = theme::priority_symbol(spec.frontmatter.priority.as_ref());
    let priority_str = spec
        .frontmatter
        .priority
        .map(|p| p.to_string())
        .unwrap_or_else(|| "-".to_string());

    // Dependency counts
    let (dep_count, req_count) = app
        .dep_graph
        .get_complete_graph(&spec.path)
        .map(|g| (g.depends_on.len(), g.required_by.len()))
        .unwrap_or((0, 0));

    let deps_str = if dep_count > 0 || req_count > 0 {
        format!("  deps:{} req:{}", dep_count, req_count)
    } else {
        String::new()
    };

    // Tags as chips
    let tags_str = if spec.frontmatter.tags.is_empty() {
        "-".to_string()
    } else {
        spec.frontmatter
            .tags
            .iter()
            .map(|t| format!("[{}]", t))
            .collect::<Vec<_>>()
            .join(" ")
    };

    // Dates
    let created_str = spec.frontmatter.created.as_str();
    let updated_str = spec.frontmatter.updated.as_deref().unwrap_or("-");

    let lines = vec![
        Line::from(vec![Span::styled(spec.title.clone(), theme::title_style())]),
        Line::from(vec![
            Span::styled(format!(" {}", spec.path), theme::dimmed_style()),
            Span::styled(deps_str, theme::dimmed_style()),
        ]),
        Line::from(vec![
            Span::raw(" Status: "),
            Span::styled(format!("{} {}", status_sym, status_label), status_style),
            Span::raw("  Priority: "),
            Span::styled(
                format!("{} {}", priority_sym, priority_str),
                Style::default(),
            ),
        ]),
        Line::from(vec![
            Span::raw(" Created: "),
            Span::styled(created_str.to_string(), theme::dimmed_style()),
            Span::raw("  Updated: "),
            Span::styled(updated_str.to_string(), theme::dimmed_style()),
        ]),
        Line::from(vec![
            Span::raw(" Tags: "),
            Span::styled(tags_str, theme::dimmed_style()),
        ]),
        Line::styled(
            " ".to_string() + &"─".repeat(area.width.saturating_sub(2) as usize),
            theme::dimmed_style(),
        ),
    ];

    let paragraph = Paragraph::new(lines);
    paragraph.render(area, buf);
}

fn render_content(area: Rect, buf: &mut Buffer, spec: &SpecInfo, app: &App) {
    let lines = markdown::render_markdown(&spec.content, area.width);
    let total_lines = lines.len();
    let viewport_height = area.height as usize;

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((app.detail_scroll, 0));
    paragraph.render(area, buf);

    // Scrollbar — only render when content exceeds viewport
    if total_lines > viewport_height {
        let mut scrollbar_state = ScrollbarState::new(total_lines)
            .position(app.detail_scroll as usize)
            .viewport_content_length(viewport_height);
        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .track_symbol(Some("▐"))
            .thumb_symbol("█");
        scrollbar.render(area, buf, &mut scrollbar_state);
    }
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
