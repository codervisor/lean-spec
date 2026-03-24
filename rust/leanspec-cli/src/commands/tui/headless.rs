//! Headless mode: parse key sequences and produce app debug state as JSON.

use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

/// Parse a compact key-sequence string into crossterm KeyEvents.
///
/// Supported tokens:
/// - Any printable char → `KeyCode::Char(c)`
/// - `\n` (two chars in string) → `KeyCode::Enter`
/// - `\b` (two chars in string) → `KeyCode::Backspace`
/// - `ESC` (3 chars) → `KeyCode::Esc`
pub fn parse_key_sequence(script: &str) -> Vec<KeyEvent> {
    let mut keys = Vec::new();
    let chars: Vec<char> = script.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        // Check for escape sequences
        if chars[i] == '\\' && i + 1 < chars.len() {
            match chars[i + 1] {
                'n' => {
                    keys.push(KeyEvent::new(KeyCode::Enter, KeyModifiers::NONE));
                    i += 2;
                    continue;
                }
                'b' => {
                    keys.push(KeyEvent::new(KeyCode::Backspace, KeyModifiers::NONE));
                    i += 2;
                    continue;
                }
                _ => {}
            }
        }
        // Check for "ESC" literal
        if i + 3 <= chars.len() && chars[i..i + 3].iter().collect::<String>() == "ESC" {
            keys.push(KeyEvent::new(KeyCode::Esc, KeyModifiers::NONE));
            i += 3;
            continue;
        }
        // Regular character
        keys.push(KeyEvent::new(KeyCode::Char(chars[i]), KeyModifiers::NONE));
        i += 1;
    }
    keys
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_empty() {
        assert_eq!(parse_key_sequence("").len(), 0);
    }

    #[test]
    fn test_parse_chars() {
        let keys = parse_key_sequence("ss");
        assert_eq!(keys.len(), 2);
        assert_eq!(keys[0].code, KeyCode::Char('s'));
        assert_eq!(keys[1].code, KeyCode::Char('s'));
    }

    #[test]
    fn test_parse_enter() {
        let keys = parse_key_sequence("s\\n");
        assert_eq!(keys.len(), 2);
        assert_eq!(keys[0].code, KeyCode::Char('s'));
        assert_eq!(keys[1].code, KeyCode::Enter);
    }

    #[test]
    fn test_parse_esc() {
        let keys = parse_key_sequence("ESC");
        assert_eq!(keys.len(), 1);
        assert_eq!(keys[0].code, KeyCode::Esc);
    }
}
