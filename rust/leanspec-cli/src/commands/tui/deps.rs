//! Dependency tree widget — upstream and downstream deps for selected spec.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Widget},
};

use super::app::App;
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let block = Block::default()
        .title(" Dependencies ")
        .borders(Borders::ALL)
        .border_style(theme::border_unfocused_style());
    let inner = block.inner(area);
    block.render(area, buf);

    let Some(spec) = &app.selected_detail else {
        let msg =
            Paragraph::new("  Select a spec to view dependencies").style(theme::dimmed_style());
        msg.render(inner, buf);
        return;
    };

    let mut lines: Vec<Line> = Vec::new();

    // Upstream (depends on)
    let upstream = app.dep_graph.get_upstream(&spec.path, 3);
    lines.push(Line::from(Span::styled(
        " Upstream (depends on):",
        theme::header_style(),
    )));
    if upstream.is_empty() {
        lines.push(Line::styled("   (none)", theme::dimmed_style()));
    } else {
        for dep in &upstream {
            let sym = theme::status_symbol(&dep.frontmatter.status);
            let style = theme::status_style(&dep.frontmatter.status);
            lines.push(Line::from(vec![
                Span::raw("   "),
                Span::styled(sym, style),
                Span::raw(format!(" {} - {}", dep.path, dep.title)),
            ]));
        }
    }

    lines.push(Line::from(""));

    // Downstream (required by)
    let downstream = app.dep_graph.get_downstream(&spec.path, 3);
    lines.push(Line::from(Span::styled(
        " Downstream (required by):",
        theme::header_style(),
    )));
    if downstream.is_empty() {
        lines.push(Line::styled("   (none)", theme::dimmed_style()));
    } else {
        for dep in &downstream {
            let sym = theme::status_symbol(&dep.frontmatter.status);
            let style = theme::status_style(&dep.frontmatter.status);
            lines.push(Line::from(vec![
                Span::raw("   "),
                Span::styled(sym, style),
                Span::raw(format!(" {} - {}", dep.path, dep.title)),
            ]));
        }
    }

    // Direct dependencies from frontmatter
    if !spec.frontmatter.depends_on.is_empty() {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            " Direct dependencies (frontmatter):",
            theme::header_style(),
        )));
        for dep_path in &spec.frontmatter.depends_on {
            lines.push(Line::from(format!("   -> {}", dep_path)));
        }
    }

    let paragraph = Paragraph::new(lines);
    paragraph.render(inner, buf);
}
