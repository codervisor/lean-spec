//! Theme: colors, styles, and field-value symbols for the TUI.
//!
//! All field-value styling is schema-driven. Symbols and colors are looked
//! up from `EnumOption::icon` / `EnumOption::color` on the active schema,
//! with a fallback set for terminals that don't support unicode-rich icons
//! or when the schema omits a color.

use ratatui::style::{Color, Modifier, Style};
use std::sync::OnceLock;

use leanspec_core::model::{FieldKind, SpecSchema};

// Fallback single-cell-width unicode symbols, keyed by the well-known
// markdown adapter enum values. Schema-declared `icon`s are typically
// lucide-react names (e.g. "calendar") that don't render in a terminal,
// so this table maps the *value* back to a terminal-renderable glyph.
fn fallback_symbol(field_key: &str, value: &str) -> &'static str {
    match (field_key, value) {
        ("status", "draft") => "○",
        ("status", "planned") => "·",
        ("status", "in-progress") => "▶",
        ("status", "complete") => "✓",
        ("status", "archived") => "⊘",
        ("status", "open") => "○",
        ("status", "closed") => "✓",
        ("priority", "critical") => "!",
        ("priority", "high") => "↑",
        ("priority", "medium") => "-",
        ("priority", "low") => "↓",
        _ => "·",
    }
}

/// Look up the styled color for `value` in the enum options of `field_key`.
/// Falls back to a dim grey when the schema declares no color.
pub fn field_style(value: &str, field_key: &str, schema: &SpecSchema) -> Style {
    let color = enum_color_hex(schema, field_key, value)
        .and_then(|hex| parse_hex_color(&hex))
        .unwrap_or_else(|| rgb(156, 163, 175, Color::Gray));
    Style::default().fg(color)
}

/// Return a terminal-renderable single-cell symbol for `value` in `field_key`.
///
/// Prefers the schema's `EnumOption::icon` only when it looks like a single
/// printable glyph (length 1 graphical code point); otherwise falls back to
/// the curated `fallback_symbol` table.
pub fn field_symbol<'a>(value: &'a str, field_key: &str, schema: &'a SpecSchema) -> &'a str {
    if let Some(icon) = enum_icon(schema, field_key, value) {
        if icon.chars().count() == 1 && !icon.chars().all(char::is_alphanumeric) {
            return icon;
        }
    }
    fallback_symbol(field_key, value)
}

fn enum_color_hex(schema: &SpecSchema, field_key: &str, value: &str) -> Option<String> {
    let field = schema.field(field_key)?;
    match &field.kind {
        FieldKind::Enum { options, .. } => options
            .iter()
            .find(|o| o.value == value)
            .and_then(|o| o.color.clone()),
        _ => None,
    }
}

fn enum_icon<'a>(schema: &'a SpecSchema, field_key: &str, value: &str) -> Option<&'a str> {
    let field = schema.field(field_key)?;
    match &field.kind {
        FieldKind::Enum { options, .. } => options
            .iter()
            .find(|o| o.value == value)
            .and_then(|o| o.icon.as_deref()),
        _ => None,
    }
}

/// Parse a CSS-style `#rrggbb` color into a ratatui `Color::Rgb`, with
/// downgrade to a basic terminal color when truecolor isn't available.
pub fn parse_hex_color(hex: &str) -> Option<Color> {
    let h = hex.trim_start_matches('#');
    if h.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&h[0..2], 16).ok()?;
    let g = u8::from_str_radix(&h[2..4], 16).ok()?;
    let b = u8::from_str_radix(&h[4..6], 16).ok()?;
    Some(rgb(r, g, b, downgrade_rgb(r, g, b)))
}

/// Crude 6-color downgrade for non-truecolor terminals.
fn downgrade_rgb(r: u8, g: u8, b: u8) -> Color {
    let (rh, gh, bh) = (r > 127, g > 127, b > 127);
    match (rh, gh, bh) {
        (true, true, true) => Color::White,
        (true, true, false) => Color::Yellow,
        (true, false, true) => Color::Magenta,
        (true, false, false) => Color::Red,
        (false, true, true) => Color::Cyan,
        (false, true, false) => Color::Green,
        (false, false, true) => Color::Blue,
        (false, false, false) => Color::DarkGray,
    }
}

static SUPPORTS_RGB: OnceLock<bool> = OnceLock::new();

fn supports_rgb() -> bool {
    *SUPPORTS_RGB.get_or_init(|| {
        if let Ok(colorterm) = std::env::var("COLORTERM") {
            return colorterm == "truecolor" || colorterm == "24bit";
        }
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

#[allow(dead_code)]
pub fn status_bar_style() -> Style {
    Style::default().bg(Color::DarkGray).fg(Color::White)
}

pub fn border_focused_style() -> Style {
    Style::default().fg(rgb(100, 200, 255, Color::Cyan))
}

pub fn border_unfocused_style() -> Style {
    Style::default().fg(rgb(70, 70, 90, Color::DarkGray))
}

#[allow(dead_code)]
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
    use leanspec_core::model::{EnumOption, FieldDef, FieldDisplay};

    fn schema_with_status() -> SpecSchema {
        SpecSchema {
            id: "t".into(),
            name: "T".into(),
            extends: None,
            fields: vec![FieldDef {
                key: "status".into(),
                label: "Status".into(),
                kind: FieldKind::Enum {
                    options: vec![
                        EnumOption::simple("draft", "Draft").with_color("#6b7280"),
                        EnumOption::simple("in-progress", "In Progress").with_color("#f59e0b"),
                    ],
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: None,
                ai_hint: None,
                placeholder: None,
            }],
            link_types: vec![],
        }
    }

    #[test]
    fn parse_hex_round_trip() {
        // Either truecolor Rgb(...) or a basic-color downgrade depending on
        // terminal support. We just assert the round-trip succeeds.
        assert!(parse_hex_color("#3b82f6").is_some());
        assert!(parse_hex_color("xyz").is_none());
        assert!(parse_hex_color("#123").is_none());
    }

    #[test]
    fn fallback_symbols_cover_markdown_statuses() {
        let schema = schema_with_status();
        // No icon declared in this option, so falls back to symbol table.
        assert_eq!(field_symbol("draft", "status", &schema), "○");
        assert_eq!(field_symbol("in-progress", "status", &schema), "▶");
    }

    #[test]
    fn unknown_value_uses_default_glyph() {
        let schema = schema_with_status();
        assert_eq!(field_symbol("nonsense", "status", &schema), "·");
    }
}
