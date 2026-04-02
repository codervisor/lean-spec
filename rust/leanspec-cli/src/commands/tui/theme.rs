//! Theme constants: colors, styles, and status symbols for the TUI.

use ratatui::style::{Color, Modifier, Style};
use std::sync::OnceLock;

use leanspec_core::{SpecPriority, SpecStatus};

// Unicode symbols for status (single-cell-width, no emoji)
// Aligned with web UI Lucide icons: CircleDotDashed, Clock, PlayCircle, CheckCircle2, Archive
pub const STATUS_DRAFT: &str = "○";
pub const STATUS_PLANNED: &str = "·";
pub const STATUS_IN_PROGRESS: &str = "▶";
pub const STATUS_COMPLETE: &str = "✓";
pub const STATUS_ARCHIVED: &str = "⊘";

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
        SpecStatus::Draft => rgb(160, 220, 220, Color::Cyan),
        SpecStatus::Planned => rgb(100, 140, 255, Color::Blue),
        SpecStatus::InProgress => rgb(255, 190, 50, Color::Yellow),
        SpecStatus::Complete => rgb(80, 200, 120, Color::Green),
        SpecStatus::Archived => rgb(90, 90, 90, Color::DarkGray),
    }
}

pub fn status_style(status: &SpecStatus) -> Style {
    Style::default().fg(status_color(status))
}

// Aligned with web UI Lucide icons: AlertCircle, ArrowUp, Minus, ArrowDown
pub fn priority_symbol(priority: Option<&SpecPriority>) -> &'static str {
    match priority {
        Some(SpecPriority::Critical) => "! ",
        Some(SpecPriority::High) => "↑ ",
        Some(SpecPriority::Medium) => "- ",
        Some(SpecPriority::Low) => "↓ ",
        None => "  ",
    }
}

static SUPPORTS_RGB: OnceLock<bool> = OnceLock::new();

fn supports_rgb() -> bool {
    *SUPPORTS_RGB.get_or_init(|| {
        // Explicit truecolor support
        if let Ok(colorterm) = std::env::var("COLORTERM") {
            return colorterm == "truecolor" || colorterm == "24bit";
        }
        // Modern terminals that support truecolor but don't set COLORTERM
        std::env::var("TERM")
            .map(|t| t.contains("kitty") || t.contains("alacritty"))
            .unwrap_or(false)
    })
}

pub fn rgb(r: u8, g: u8, b: u8, fallback: Color) -> Color {
    if supports_rgb() {
        Color::Rgb(r, g, b)
    } else {
        fallback
    }
}

// Common styles — RGB palette for modern look
pub fn title_style() -> Style {
    Style::default()
        .fg(rgb(220, 220, 255, Color::White))
        .add_modifier(Modifier::BOLD)
}

pub fn selected_style() -> Style {
    Style::default()
        .bg(rgb(50, 50, 80, Color::DarkGray))
        .add_modifier(Modifier::BOLD)
}

/// Dimmed selection style for when the sidebar is not focused but still shows which spec is active.
pub fn inactive_selected_style() -> Style {
    Style::default().bg(rgb(35, 35, 55, Color::Reset))
}

pub fn header_style() -> Style {
    Style::default()
        .fg(rgb(220, 220, 255, Color::White))
        .add_modifier(Modifier::BOLD)
}

pub fn dimmed_style() -> Style {
    Style::default().fg(rgb(100, 100, 120, Color::DarkGray))
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

pub fn border_focused_style() -> Style {
    Style::default().fg(rgb(100, 200, 255, Color::Cyan))
}

pub fn border_unfocused_style() -> Style {
    Style::default().fg(rgb(70, 70, 90, Color::DarkGray))
}

pub fn project_name_style() -> Style {
    Style::default()
        .bg(Color::DarkGray)
        .fg(Color::Cyan)
        .add_modifier(Modifier::BOLD)
}

pub fn overlay_border_style() -> Style {
    Style::default().fg(Color::Green)
}

pub fn overlay_selected_style() -> Style {
    Style::default()
        .bg(Color::Blue)
        .fg(Color::White)
        .add_modifier(Modifier::BOLD)
}

pub fn favorite_style() -> Style {
    Style::default().fg(Color::Yellow)
}

pub fn error_style() -> Style {
    Style::default().fg(Color::Red)
}

pub fn success_style() -> Style {
    Style::default().fg(Color::Green)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_symbols() {
        assert_eq!(status_symbol(&SpecStatus::Draft), "○");
        assert_eq!(status_symbol(&SpecStatus::Planned), "·");
        assert_eq!(status_symbol(&SpecStatus::InProgress), "▶");
        assert_eq!(status_symbol(&SpecStatus::Complete), "✓");
        assert_eq!(status_symbol(&SpecStatus::Archived), "⊘");
    }

    #[test]
    fn test_priority_symbols() {
        assert_eq!(priority_symbol(Some(&SpecPriority::Critical)), "! ");
        assert_eq!(priority_symbol(Some(&SpecPriority::High)), "↑ ");
        assert_eq!(priority_symbol(Some(&SpecPriority::Medium)), "- ");
        assert_eq!(priority_symbol(Some(&SpecPriority::Low)), "↓ ");
        assert_eq!(priority_symbol(None), "  ");
    }
}
