//! Theme constants: colors, styles, and status symbols for the TUI.

use ratatui::style::{Color, Modifier, Style};

use leanspec_core::{SpecPriority, SpecStatus};

// ASCII symbols for status (avoids double-width emoji issues in ratatui cells)
pub const STATUS_DRAFT: &str = "D";
pub const STATUS_PLANNED: &str = "P";
pub const STATUS_IN_PROGRESS: &str = "W";
pub const STATUS_COMPLETE: &str = "C";
pub const STATUS_ARCHIVED: &str = "A";

pub fn status_symbol(status: &SpecStatus) -> &'static str {
    match status {
        SpecStatus::Draft => STATUS_DRAFT,
        SpecStatus::Planned => STATUS_PLANNED,
        SpecStatus::InProgress => STATUS_IN_PROGRESS,
        SpecStatus::Complete => STATUS_COMPLETE,
        SpecStatus::Archived => STATUS_ARCHIVED,
    }
}

pub fn status_color(status: &SpecStatus) -> Color {
    match status {
        SpecStatus::Draft => Color::Cyan,
        SpecStatus::Planned => Color::Blue,
        SpecStatus::InProgress => Color::Yellow,
        SpecStatus::Complete => Color::Green,
        SpecStatus::Archived => Color::DarkGray,
    }
}

pub fn status_style(status: &SpecStatus) -> Style {
    Style::default().fg(status_color(status))
}

pub fn priority_symbol(priority: Option<&SpecPriority>) -> &'static str {
    match priority {
        Some(SpecPriority::Critical) => "!",
        Some(SpecPriority::High) => "^",
        Some(SpecPriority::Medium) => "-",
        Some(SpecPriority::Low) => ".",
        None => " ",
    }
}

// Common styles
pub fn title_style() -> Style {
    Style::default()
        .fg(Color::Cyan)
        .add_modifier(Modifier::BOLD)
}

pub fn selected_style() -> Style {
    Style::default()
        .bg(Color::DarkGray)
        .add_modifier(Modifier::BOLD)
}

pub fn header_style() -> Style {
    Style::default()
        .fg(Color::White)
        .add_modifier(Modifier::BOLD)
}

pub fn dimmed_style() -> Style {
    Style::default().fg(Color::DarkGray)
}

pub fn highlight_style() -> Style {
    Style::default()
        .bg(Color::Blue)
        .fg(Color::White)
        .add_modifier(Modifier::BOLD)
}

pub fn status_bar_style() -> Style {
    Style::default().bg(Color::DarkGray).fg(Color::White)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_symbols() {
        assert_eq!(status_symbol(&SpecStatus::Draft), "D");
        assert_eq!(status_symbol(&SpecStatus::Planned), "P");
        assert_eq!(status_symbol(&SpecStatus::InProgress), "W");
        assert_eq!(status_symbol(&SpecStatus::Complete), "C");
        assert_eq!(status_symbol(&SpecStatus::Archived), "A");
    }

    #[test]
    fn test_priority_symbols() {
        assert_eq!(priority_symbol(Some(&SpecPriority::Critical)), "!");
        assert_eq!(priority_symbol(Some(&SpecPriority::High)), "^");
        assert_eq!(priority_symbol(Some(&SpecPriority::Medium)), "-");
        assert_eq!(priority_symbol(Some(&SpecPriority::Low)), ".");
        assert_eq!(priority_symbol(None), " ");
    }
}
