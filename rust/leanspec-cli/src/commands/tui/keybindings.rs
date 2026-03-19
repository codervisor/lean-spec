//! Mode-based input dispatch for keybindings.

use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use super::app::{App, AppMode, FocusPane};

/// Handle a key event based on the current app mode.
pub fn handle_key(app: &mut App, key: KeyEvent) {
    match app.mode {
        AppMode::Normal => handle_normal(app, key),
        AppMode::Search => handle_search(app, key),
        AppMode::Help => handle_help(app, key),
    }
}

fn handle_normal(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Char('q') => app.should_quit = true,
        KeyCode::Char('j') | KeyCode::Down => {
            if app.focus == FocusPane::Right {
                app.scroll_detail_down();
            } else {
                app.move_down();
            }
        }
        KeyCode::Char('k') | KeyCode::Up => {
            if app.focus == FocusPane::Right {
                app.scroll_detail_up();
            } else {
                app.move_up();
            }
        }
        KeyCode::Char('h') | KeyCode::Left => app.focus_left(),
        KeyCode::Char('l') | KeyCode::Right | KeyCode::Enter => app.focus_right(),
        KeyCode::Tab => {
            if key.modifiers.contains(KeyModifiers::SHIFT) {
                app.prev_group();
            } else {
                app.next_group();
            }
        }
        KeyCode::BackTab => app.prev_group(),
        KeyCode::Char('1') => app.set_board_view(),
        KeyCode::Char('2') => app.set_list_view(),
        KeyCode::Char('d') => app.toggle_detail_mode(),
        KeyCode::Char('/') => app.enter_search(),
        KeyCode::Char('?') => app.enter_help(),
        KeyCode::Esc => app.focus_left(),
        _ => {}
    }
}

fn handle_search(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Esc => app.exit_search(),
        KeyCode::Enter => app.search_select(),
        KeyCode::Backspace => app.search_backspace(),
        KeyCode::Char(c) => app.search_type_char(c),
        _ => {}
    }
}

fn handle_help(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Esc | KeyCode::Char('?') | KeyCode::Char('q') => app.exit_overlay(),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::super::app::{AppMode, DetailMode, FocusPane, PrimaryView};
    use super::*;

    fn make_test_app() -> App {
        App::empty_for_test()
    }

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    #[test]
    fn test_q_quits() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('q')));
        assert!(app.should_quit);
    }

    #[test]
    fn test_slash_enters_search() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('/')));
        assert_eq!(app.mode, AppMode::Search);
    }

    #[test]
    fn test_question_mark_enters_help() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('?')));
        assert_eq!(app.mode, AppMode::Help);
    }

    #[test]
    fn test_esc_in_search_returns_to_normal() {
        let mut app = make_test_app();
        app.mode = AppMode::Search;
        handle_key(&mut app, key(KeyCode::Esc));
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_esc_in_help_returns_to_normal() {
        let mut app = make_test_app();
        app.mode = AppMode::Help;
        handle_key(&mut app, key(KeyCode::Esc));
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_1_2_switch_views() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('2')));
        assert_eq!(app.primary_view, PrimaryView::List);

        handle_key(&mut app, key(KeyCode::Char('1')));
        assert_eq!(app.primary_view, PrimaryView::Board);
    }

    #[test]
    fn test_d_toggles_detail_mode() {
        let mut app = make_test_app();
        assert_eq!(app.detail_mode, DetailMode::Content);

        handle_key(&mut app, key(KeyCode::Char('d')));
        assert_eq!(app.detail_mode, DetailMode::Dependencies);
    }

    #[test]
    fn test_h_l_switch_focus() {
        let mut app = make_test_app();
        handle_key(&mut app, key(KeyCode::Char('l')));
        assert_eq!(app.focus, FocusPane::Right);

        handle_key(&mut app, key(KeyCode::Char('h')));
        assert_eq!(app.focus, FocusPane::Left);
    }

    #[test]
    fn test_search_mode_typing() {
        let mut app = make_test_app();
        app.mode = AppMode::Search;

        handle_key(&mut app, key(KeyCode::Char('t')));
        handle_key(&mut app, key(KeyCode::Char('e')));
        handle_key(&mut app, key(KeyCode::Char('s')));
        assert_eq!(app.search_query, "tes");

        handle_key(&mut app, key(KeyCode::Backspace));
        assert_eq!(app.search_query, "te");
    }
}
