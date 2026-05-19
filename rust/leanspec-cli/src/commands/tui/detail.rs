//! Detail pane widget — schema-driven metadata header + scrollable body.
//!
//! The metadata block iterates `schema.fields` and renders each inline field
//! using `theme::field_style` / `theme::field_symbol`. The body is the
//! `selected_body` string loaded from the adapter (markdown stores it in the
//! `content` field; remote adapters synthesise it from section fields).

use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Layout, Rect},
    prelude::StatefulWidget,
    text::{Line, Span},
    widgets::{
        Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Widget, Wrap,
    },
};

use leanspec_core::model::{FieldDisplay, FieldKind, FieldValue, SpecDoc, SpecSchema};

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

fn render_spec_detail(area: Rect, buf: &mut Buffer, doc: &SpecDoc, app: &App) {
    let metadata_lines = build_metadata_lines(doc, app, area.width);
    let header_height = (metadata_lines.len() as u16).min(area.height);

    let chunks =
        Layout::vertical([Constraint::Length(header_height), Constraint::Min(1)]).split(area);

    Paragraph::new(metadata_lines).render(chunks[0], buf);
    render_content(chunks[1], buf, app);
}

fn build_metadata_lines<'a>(doc: &'a SpecDoc, app: &'a App, width: u16) -> Vec<Line<'a>> {
    let schema = &app.schema;

    let mut lines: Vec<Line> = Vec::new();
    lines.push(Line::from(vec![Span::styled(
        doc.title.clone(),
        theme::title_style(),
    )]));

    let dep_count = app.deps.dep_count(&doc.id);
    let req_count = app.deps.req_count(&doc.id);
    let deps_str = if dep_count > 0 || req_count > 0 {
        format!("  deps:{} req:{}", dep_count, req_count)
    } else {
        String::new()
    };
    lines.push(Line::from(vec![
        Span::styled(format!(" {}", doc.id), theme::dimmed_style()),
        Span::styled(deps_str, theme::dimmed_style()),
    ]));

    // One inline-field line per schema-declared inline field that has a value.
    for field in &schema.fields {
        if field.display != FieldDisplay::Inline {
            continue;
        }
        if field.key == "content" {
            continue;
        }
        let Some(value) = doc.fields.get(&field.key) else {
            continue;
        };
        let line = render_inline_field(field, value, schema);
        lines.push(line);
    }

    if let Some(created) = doc.created_at {
        lines.push(Line::from(vec![
            Span::raw(" Created: "),
            Span::styled(
                created.format("%Y-%m-%d").to_string(),
                theme::dimmed_style(),
            ),
        ]));
    }
    if let Some(updated) = doc.updated_at {
        lines.push(Line::from(vec![
            Span::raw(" Updated: "),
            Span::styled(
                updated.format("%Y-%m-%d").to_string(),
                theme::dimmed_style(),
            ),
        ]));
    }

    lines.push(Line::styled(
        " ".to_string() + &"─".repeat(width.saturating_sub(2) as usize),
        theme::dimmed_style(),
    ));
    lines
}

fn render_inline_field<'a>(
    field: &'a leanspec_core::model::FieldDef,
    value: &'a FieldValue,
    schema: &'a SpecSchema,
) -> Line<'a> {
    let label_span = Span::raw(format!(" {}: ", field.label));
    let value_spans = match (&field.kind, value) {
        (FieldKind::Enum { multi: false, .. }, FieldValue::String(s)) => {
            let style = theme::field_style(s, &field.key, schema);
            let sym = theme::field_symbol(s, &field.key, schema);
            let label = super::app::field_label(s, &field.key, schema);
            vec![Span::styled(format!("{} {}", sym, label), style)]
        }
        (FieldKind::Enum { multi: true, .. }, FieldValue::Strings(values)) => {
            if values.is_empty() {
                vec![Span::raw("-")]
            } else {
                values
                    .iter()
                    .map(|v| Span::raw(format!("[{}] ", v)))
                    .collect()
            }
        }
        (_, FieldValue::String(s)) => vec![Span::raw(s.clone())],
        (_, FieldValue::Strings(values)) => {
            if values.is_empty() {
                vec![Span::raw("-")]
            } else {
                vec![Span::raw(values.join(", "))]
            }
        }
        (_, FieldValue::Bool(b)) => vec![Span::raw(if *b { "true" } else { "false" })],
        (_, FieldValue::Number(n)) => vec![Span::raw(n.to_string())],
        (_, FieldValue::Timestamp(t)) => vec![Span::raw(t.format("%Y-%m-%d").to_string())],
        _ => vec![Span::raw("-")],
    };
    let mut spans = vec![label_span];
    spans.extend(value_spans);
    Line::from(spans)
}

fn render_content(area: Rect, buf: &mut Buffer, app: &App) {
    let lines = markdown::render_markdown(&app.selected_body, area.width);
    let total_lines = lines.len();
    let viewport_height = area.height as usize;

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((app.detail_scroll, 0));
    paragraph.render(area, buf);

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
