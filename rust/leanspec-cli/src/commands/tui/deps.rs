//! Dependency tree widget — upstream and downstream deps for the selected spec.

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

    let Some(doc) = &app.selected_detail else {
        let msg =
            Paragraph::new("  Select a spec to view dependencies").style(theme::dimmed_style());
        msg.render(inner, buf);
        return;
    };

    let mut lines: Vec<Line> = Vec::new();
    let status_key = app.status_key.as_deref();

    let upstream_ids = app
        .deps
        .depends_on
        .get(&doc.id)
        .cloned()
        .unwrap_or_default();
    lines.push(Line::from(Span::styled(
        " Upstream (depends on):",
        theme::header_style(),
    )));
    if upstream_ids.is_empty() {
        lines.push(Line::styled("   (none)", theme::dimmed_style()));
    } else {
        for dep_id in &upstream_ids {
            push_dep_line(&mut lines, dep_id, app, status_key);
        }
    }

    lines.push(Line::from(""));

    let downstream_ids = app
        .deps
        .required_by
        .get(&doc.id)
        .cloned()
        .unwrap_or_default();
    lines.push(Line::from(Span::styled(
        " Downstream (required by):",
        theme::header_style(),
    )));
    if downstream_ids.is_empty() {
        lines.push(Line::styled("   (none)", theme::dimmed_style()));
    } else {
        for dep_id in &downstream_ids {
            push_dep_line(&mut lines, dep_id, app, status_key);
        }
    }

    let paragraph = Paragraph::new(lines);
    paragraph.render(inner, buf);
}

fn push_dep_line(lines: &mut Vec<Line>, dep_id: &str, app: &App, status_key: Option<&str>) {
    let dep_doc = app.specs.iter().find(|d| d.id == dep_id);
    let (sym, style, title) = match dep_doc {
        Some(d) => {
            let (s, st) = status_key
                .and_then(|k| {
                    d.field_str(k).map(|v| {
                        (
                            theme::field_symbol(v, k, &app.schema).to_string(),
                            theme::field_style(v, k, &app.schema),
                        )
                    })
                })
                .unwrap_or_else(|| (" ".to_string(), theme::dimmed_style()));
            (s, st, d.title.clone())
        }
        None => (" ".to_string(), theme::dimmed_style(), String::new()),
    };
    lines.push(Line::from(vec![
        Span::raw("   "),
        Span::styled(sym, style),
        Span::raw(format!(" {} - {}", dep_id, title)),
    ]));
}
