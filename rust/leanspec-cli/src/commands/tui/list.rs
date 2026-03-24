//! List view widget — flat table or tree with sort indicator.

use ratatui::{
    buffer::Buffer,
    layout::Rect,
    prelude::StatefulWidget,
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Widget},
};

use super::app::{App, FocusPane, PrimaryView};
use super::theme;

pub fn render(area: Rect, buf: &mut Buffer, app: &App) {
    let is_focused = app.focus == FocusPane::Left && app.primary_view == PrimaryView::List;
    let border_style = if is_focused {
        theme::border_focused_style()
    } else {
        theme::border_unfocused_style()
    };

    let filter_indicator = if !app.filter.is_empty() { " [F]" } else { "" };
    let tree_indicator = if app.tree_mode { " [Tree]" } else { "" };
    let title = format!(
        " List [{}]{}{} ",
        app.sort_option.label(),
        filter_indicator,
        tree_indicator
    );

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(border_style);
    let inner = block.inner(area);
    block.render(area, buf);

    if app.tree_mode {
        render_tree(inner, buf, app, is_focused);
    } else {
        render_flat(inner, buf, app, is_focused);
    }
}

fn render_flat(area: Rect, buf: &mut Buffer, app: &App, is_focused: bool) {
    let mut lines: Vec<Line> = Vec::new();

    // Header row
    lines.push(Line::from(vec![
        Span::styled(" S ", theme::header_style()),
        Span::styled("P  ", theme::header_style()),
        Span::styled(format!("{:<30}", "Path"), theme::header_style()),
        Span::styled("Title", theme::header_style()),
    ]));
    lines.push(Line::styled(
        " ".to_string() + &"-".repeat(area.width.saturating_sub(2) as usize),
        theme::dimmed_style(),
    ));

    let visible_rows = area.height.saturating_sub(3) as usize;
    let total = app.filtered_specs.len();

    let offset = app.list_scroll_offset;

    for (vi, &spec_idx) in app
        .filtered_specs
        .iter()
        .enumerate()
        .skip(offset)
        .take(visible_rows)
    {
        let spec = &app.specs[spec_idx];
        let is_current = vi == app.list_selected;

        let style = if is_current && is_focused {
            theme::selected_style()
        } else if is_current {
            theme::inactive_selected_style()
        } else {
            Style::default()
        };

        let status_sym = theme::status_symbol(&spec.frontmatter.status);
        let priority_sym = theme::priority_symbol(spec.frontmatter.priority.as_ref());
        let path = truncate_path(&spec.path, 28);
        let title = truncate_str(&spec.title, 30);
        let dep_count = app
            .dep_graph
            .get_complete_graph(&spec.path)
            .map_or(0, |g| g.depends_on.len());
        let dep_str = if dep_count > 0 {
            format!(" d:{}", dep_count)
        } else {
            String::new()
        };

        lines.push(Line::styled(
            format!(
                " {} {} {} {}{}",
                status_sym, priority_sym, path, title, dep_str
            ),
            style,
        ));
    }

    if total == 0 {
        lines.push(Line::styled("  No specs found", theme::dimmed_style()));
    }

    Paragraph::new(lines).render(area, buf);

    // Scrollbar — only render when content exceeds viewport
    if total > visible_rows {
        let mut scrollbar_state = ScrollbarState::new(total)
            .position(app.list_selected)
            .viewport_content_length(visible_rows);
        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .track_symbol(Some("▐"))
            .thumb_symbol("█");
        scrollbar.render(area, buf, &mut scrollbar_state);
    }
}

fn render_tree(area: Rect, buf: &mut Buffer, app: &App, is_focused: bool) {
    let mut lines: Vec<Line> = Vec::new();

    // Header
    let mode_label = " S  P  Tree";
    lines.push(Line::styled(mode_label, theme::header_style()));
    lines.push(Line::styled(
        " ".to_string() + &"-".repeat(area.width.saturating_sub(2) as usize),
        theme::dimmed_style(),
    ));

    let visible_rows = area.height.saturating_sub(3) as usize;
    let total = app.tree_rows.len();

    let offset = app.list_scroll_offset;

    for (vi, row) in app
        .tree_rows
        .iter()
        .enumerate()
        .skip(offset)
        .take(visible_rows)
    {
        let spec = &app.specs[row.spec_idx];
        let is_current = vi == app.list_selected;

        let base_style = if is_current && is_focused {
            theme::selected_style()
        } else if is_current {
            theme::inactive_selected_style()
        } else {
            Style::default()
        };

        let indent = "  ".repeat(row.depth);
        let expand_sym = if row.has_children {
            if row.is_collapsed {
                "▶ "
            } else {
                "▼ "
            }
        } else {
            "  "
        };

        let status_sym = theme::status_symbol(&spec.frontmatter.status);
        let priority_sym = theme::priority_symbol(spec.frontmatter.priority.as_ref());
        let title = truncate_str(&spec.title, 35_usize.saturating_sub(row.depth * 2));

        let expand_style = if row.has_children {
            base_style.add_modifier(Modifier::BOLD)
        } else {
            base_style
        };

        lines.push(Line::from(vec![
            Span::styled(
                format!(" {} {} {}{}", status_sym, priority_sym, indent, expand_sym),
                expand_style,
            ),
            Span::styled(format!("{} {}", spec.path, title), base_style),
        ]));
    }

    if total == 0 {
        lines.push(Line::styled("  No specs found", theme::dimmed_style()));
    }

    Paragraph::new(lines).render(area, buf);

    // Scrollbar — only render when content exceeds viewport
    if total > visible_rows {
        let mut scrollbar_state = ScrollbarState::new(total)
            .position(app.list_selected)
            .viewport_content_length(visible_rows);
        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .track_symbol(Some("▐"))
            .thumb_symbol("█");
        scrollbar.render(area, buf, &mut scrollbar_state);
    }
}

fn truncate_path(s: &str, max: usize) -> String {
    if s.chars().count() > max {
        format!("{}..", s.chars().take(max).collect::<String>())
    } else {
        format!("{:<width$}", s, width = max + 2)
    }
}

fn truncate_str(s: &str, max: usize) -> String {
    if s.chars().count() > max {
        let truncated: String = s.chars().take(max.saturating_sub(3)).collect();
        format!("{}...", truncated)
    } else {
        s.to_string()
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
    }

    #[test]
    fn test_list_shows_sort_label() {
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
        // Default sort label should appear in title
        assert!(buf_str.contains("ID"));
    }
}
