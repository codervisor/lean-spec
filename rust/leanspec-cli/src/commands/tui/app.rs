//! App struct, state machine, and data management for the TUI.

use leanspec_core::{search_specs, DependencyGraph, SpecInfo, SpecLoader, SpecStats, SpecStatus};
use std::error::Error;

/// Which mode the app is in (affects keybinding dispatch).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppMode {
    Normal,
    Search,
    Help,
}

/// Which view is shown in the left pane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrimaryView {
    Board,
    List,
}

/// Which pane has focus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FocusPane {
    Left,
    Right,
}

/// What to show in the right pane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DetailMode {
    Content,
    Dependencies,
}

/// A group of specs sharing the same status, used for the board view.
#[derive(Debug, Clone)]
pub struct BoardGroup {
    pub status: SpecStatus,
    pub label: String,
    pub indices: Vec<usize>,
}

/// Core application state.
pub struct App {
    // Data
    pub specs: Vec<SpecInfo>,
    pub filtered_specs: Vec<usize>,
    pub selected_detail: Option<SpecInfo>,
    pub board_groups: Vec<BoardGroup>,
    pub dep_graph: DependencyGraph,
    pub stats: SpecStats,

    // Loader for lazy detail loading
    loader: SpecLoader,

    // State machine
    pub mode: AppMode,
    pub primary_view: PrimaryView,
    pub focus: FocusPane,
    pub detail_mode: DetailMode,
    pub should_quit: bool,

    // Board navigation
    pub board_group_idx: usize,
    pub board_item_idx: usize,

    // List navigation
    pub list_selected: usize,

    // Detail scroll
    pub detail_scroll: u16,

    // Search
    pub search_query: String,
    pub search_results: Vec<usize>,
}

impl App {
    pub fn new(specs_dir: &str, initial_view: PrimaryView) -> Result<Self, Box<dyn Error>> {
        let loader = SpecLoader::new(specs_dir);
        let specs = loader.load_all_metadata()?;
        let dep_graph = DependencyGraph::new(&specs);
        let stats = SpecStats::compute(&specs);
        let filtered_specs: Vec<usize> = (0..specs.len()).collect();

        let mut app = Self {
            specs,
            filtered_specs,
            selected_detail: None,
            board_groups: Vec::new(),
            dep_graph,
            stats,
            loader,
            mode: AppMode::Normal,
            primary_view: initial_view,
            focus: FocusPane::Left,
            detail_mode: DetailMode::Content,
            should_quit: false,
            board_group_idx: 0,
            board_item_idx: 0,
            list_selected: 0,
            detail_scroll: 0,
            search_query: String::new(),
            search_results: Vec::new(),
        };

        app.rebuild_board_groups();
        app.load_selected_detail();

        Ok(app)
    }

    /// Rebuild board groups from filtered specs.
    pub fn rebuild_board_groups(&mut self) {
        let statuses = [
            (SpecStatus::InProgress, "In Progress"),
            (SpecStatus::Planned, "Planned"),
            (SpecStatus::Draft, "Draft"),
            (SpecStatus::Complete, "Complete"),
            (SpecStatus::Archived, "Archived"),
        ];

        self.board_groups = statuses
            .iter()
            .filter_map(|(status, label)| {
                let indices: Vec<usize> = self
                    .filtered_specs
                    .iter()
                    .filter(|&&i| self.specs[i].frontmatter.status == *status)
                    .copied()
                    .collect();
                if indices.is_empty() {
                    None
                } else {
                    Some(BoardGroup {
                        status: *status,
                        label: label.to_string(),
                        indices,
                    })
                }
            })
            .collect();
    }

    /// Get the currently selected spec index based on the active view.
    pub fn selected_spec_index(&self) -> Option<usize> {
        match self.primary_view {
            PrimaryView::Board => {
                let group = self.board_groups.get(self.board_group_idx)?;
                group.indices.get(self.board_item_idx).copied()
            }
            PrimaryView::List => self.filtered_specs.get(self.list_selected).copied(),
        }
    }

    /// Lazily load the full content of the currently selected spec.
    pub fn load_selected_detail(&mut self) {
        if let Some(idx) = self.selected_spec_index() {
            let Some(spec) = self.specs.get(idx) else {
                self.selected_detail = None;
                return;
            };
            let path = &spec.path;
            if let Ok(Some(full)) = self.loader.load(path) {
                self.selected_detail = Some(full);
            } else {
                self.selected_detail = None;
            }
        } else {
            self.selected_detail = None;
        }
        self.detail_scroll = 0;
    }

    // -- Navigation --

    pub fn move_down(&mut self) {
        match self.primary_view {
            PrimaryView::Board => {
                if let Some(group) = self.board_groups.get(self.board_group_idx) {
                    if self.board_item_idx + 1 < group.indices.len() {
                        self.board_item_idx += 1;
                    }
                }
            }
            PrimaryView::List => {
                if self.list_selected + 1 < self.filtered_specs.len() {
                    self.list_selected += 1;
                }
            }
        }
        self.load_selected_detail();
    }

    pub fn move_up(&mut self) {
        match self.primary_view {
            PrimaryView::Board => {
                self.board_item_idx = self.board_item_idx.saturating_sub(1);
            }
            PrimaryView::List => {
                self.list_selected = self.list_selected.saturating_sub(1);
            }
        }
        self.load_selected_detail();
    }

    pub fn next_group(&mut self) {
        if self.primary_view == PrimaryView::Board && !self.board_groups.is_empty() {
            self.board_group_idx = (self.board_group_idx + 1) % self.board_groups.len();
            self.board_item_idx = 0;
            self.load_selected_detail();
        }
    }

    pub fn prev_group(&mut self) {
        if self.primary_view == PrimaryView::Board && !self.board_groups.is_empty() {
            if self.board_group_idx == 0 {
                self.board_group_idx = self.board_groups.len() - 1;
            } else {
                self.board_group_idx -= 1;
            }
            self.board_item_idx = 0;
            self.load_selected_detail();
        }
    }

    pub fn scroll_detail_down(&mut self) {
        self.detail_scroll = self.detail_scroll.saturating_add(1);
    }

    pub fn scroll_detail_up(&mut self) {
        self.detail_scroll = self.detail_scroll.saturating_sub(1);
    }

    // -- View switching --

    pub fn set_board_view(&mut self) {
        self.primary_view = PrimaryView::Board;
        self.focus = FocusPane::Left;
    }

    pub fn set_list_view(&mut self) {
        self.primary_view = PrimaryView::List;
        self.focus = FocusPane::Left;
    }

    pub fn toggle_detail_mode(&mut self) {
        self.detail_mode = match self.detail_mode {
            DetailMode::Content => DetailMode::Dependencies,
            DetailMode::Dependencies => DetailMode::Content,
        };
    }

    pub fn focus_left(&mut self) {
        self.focus = FocusPane::Left;
    }

    pub fn focus_right(&mut self) {
        self.focus = FocusPane::Right;
        self.detail_scroll = 0;
    }

    // -- Mode transitions --

    pub fn enter_search(&mut self) {
        self.mode = AppMode::Search;
        self.search_query.clear();
        self.search_results.clear();
    }

    pub fn exit_search(&mut self) {
        self.mode = AppMode::Normal;
    }

    pub fn enter_help(&mut self) {
        self.mode = AppMode::Help;
    }

    pub fn exit_overlay(&mut self) {
        self.mode = AppMode::Normal;
    }

    // -- Search --

    pub fn search_type_char(&mut self, c: char) {
        self.search_query.push(c);
        self.update_search_results();
    }

    pub fn search_backspace(&mut self) {
        self.search_query.pop();
        self.update_search_results();
    }

    pub fn search_select(&mut self) {
        if let Some(&idx) = self.search_results.first() {
            // Navigate to the found spec
            match self.primary_view {
                PrimaryView::Board => {
                    // Find the board group and item for this spec index
                    for (gi, group) in self.board_groups.iter().enumerate() {
                        if let Some(ii) = group.indices.iter().position(|&i| i == idx) {
                            self.board_group_idx = gi;
                            self.board_item_idx = ii;
                            break;
                        }
                    }
                }
                PrimaryView::List => {
                    if let Some(pos) = self.filtered_specs.iter().position(|&i| i == idx) {
                        self.list_selected = pos;
                    }
                }
            }
            self.load_selected_detail();
        }
        self.exit_search();
    }

    fn update_search_results(&mut self) {
        if self.search_query.is_empty() {
            self.search_results.clear();
            return;
        }
        let results = search_specs(&self.specs, &self.search_query, 20);
        self.search_results = results
            .iter()
            .filter_map(|r| self.specs.iter().position(|s| s.path == r.path))
            .collect();
    }

    /// Create an empty App for testing (no filesystem access needed).
    #[cfg(test)]
    pub fn empty_for_test() -> Self {
        App {
            specs: Vec::new(),
            filtered_specs: Vec::new(),
            selected_detail: None,
            board_groups: Vec::new(),
            dep_graph: DependencyGraph::new(&[]),
            stats: SpecStats::compute(&[]),
            loader: SpecLoader::new("/nonexistent"),
            mode: AppMode::Normal,
            primary_view: PrimaryView::Board,
            focus: FocusPane::Left,
            detail_mode: DetailMode::Content,
            should_quit: false,
            board_group_idx: 0,
            board_item_idx: 0,
            list_selected: 0,
            detail_scroll: 0,
            search_query: String::new(),
            search_results: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_app() -> App {
        App::empty_for_test()
    }

    #[test]
    fn test_mode_transitions() {
        let mut app = make_test_app();
        assert_eq!(app.mode, AppMode::Normal);

        app.enter_search();
        assert_eq!(app.mode, AppMode::Search);

        app.exit_search();
        assert_eq!(app.mode, AppMode::Normal);

        app.enter_help();
        assert_eq!(app.mode, AppMode::Help);

        app.exit_overlay();
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_view_switching() {
        let mut app = make_test_app();
        assert_eq!(app.primary_view, PrimaryView::Board);

        app.set_list_view();
        assert_eq!(app.primary_view, PrimaryView::List);
        assert_eq!(app.focus, FocusPane::Left);

        app.set_board_view();
        assert_eq!(app.primary_view, PrimaryView::Board);
        assert_eq!(app.focus, FocusPane::Left);
    }

    #[test]
    fn test_focus_toggle() {
        let mut app = make_test_app();
        assert_eq!(app.focus, FocusPane::Left);

        app.focus_right();
        assert_eq!(app.focus, FocusPane::Right);

        app.focus_left();
        assert_eq!(app.focus, FocusPane::Left);
    }

    #[test]
    fn test_detail_mode_toggle() {
        let mut app = make_test_app();
        assert_eq!(app.detail_mode, DetailMode::Content);

        app.toggle_detail_mode();
        assert_eq!(app.detail_mode, DetailMode::Dependencies);

        app.toggle_detail_mode();
        assert_eq!(app.detail_mode, DetailMode::Content);
    }

    #[test]
    fn test_board_navigation_empty() {
        let mut app = make_test_app();
        // Should not panic with empty groups
        app.move_down();
        app.move_up();
        app.next_group();
        app.prev_group();
        assert_eq!(app.board_group_idx, 0);
        assert_eq!(app.board_item_idx, 0);
    }

    #[test]
    fn test_list_navigation_empty() {
        let mut app = make_test_app();
        app.set_list_view();
        // Should not panic with empty list
        app.move_down();
        app.move_up();
        assert_eq!(app.list_selected, 0);
    }

    #[test]
    fn test_board_navigation_wraps_groups() {
        let mut app = make_test_app();
        app.board_groups = vec![
            BoardGroup {
                status: SpecStatus::InProgress,
                label: "In Progress".to_string(),
                indices: vec![0],
            },
            BoardGroup {
                status: SpecStatus::Draft,
                label: "Draft".to_string(),
                indices: vec![1],
            },
        ];

        app.next_group();
        assert_eq!(app.board_group_idx, 1);

        app.next_group();
        assert_eq!(app.board_group_idx, 0); // wraps

        app.prev_group();
        assert_eq!(app.board_group_idx, 1); // wraps back
    }

    #[test]
    fn test_list_navigation_bounds() {
        let mut app = make_test_app();
        app.set_list_view();
        app.filtered_specs = vec![0, 1, 2];

        app.move_down();
        assert_eq!(app.list_selected, 1);
        app.move_down();
        assert_eq!(app.list_selected, 2);
        app.move_down();
        assert_eq!(app.list_selected, 2); // stays at end

        app.move_up();
        assert_eq!(app.list_selected, 1);
        app.move_up();
        assert_eq!(app.list_selected, 0);
        app.move_up();
        assert_eq!(app.list_selected, 0); // stays at start
    }

    #[test]
    fn test_detail_scroll() {
        let mut app = make_test_app();
        assert_eq!(app.detail_scroll, 0);

        app.scroll_detail_down();
        assert_eq!(app.detail_scroll, 1);
        app.scroll_detail_down();
        assert_eq!(app.detail_scroll, 2);

        app.scroll_detail_up();
        assert_eq!(app.detail_scroll, 1);
        app.scroll_detail_up();
        assert_eq!(app.detail_scroll, 0);
        app.scroll_detail_up();
        assert_eq!(app.detail_scroll, 0); // doesn't go negative
    }

    #[test]
    fn test_search_char_and_backspace() {
        let mut app = make_test_app();
        app.enter_search();
        assert_eq!(app.search_query, "");

        app.search_type_char('a');
        assert_eq!(app.search_query, "a");
        app.search_type_char('b');
        assert_eq!(app.search_query, "ab");

        app.search_backspace();
        assert_eq!(app.search_query, "a");
        app.search_backspace();
        assert_eq!(app.search_query, "");
        app.search_backspace(); // no panic on empty
        assert_eq!(app.search_query, "");
    }
}
