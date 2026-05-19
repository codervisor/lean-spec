//! App struct, state machine, and data management for the TUI.
//!
//! All persistent application state — the active adapter handle, the resolved
//! schema, the loaded `SpecDoc`s, navigation cursors, and overlay state —
//! lives here. Status / priority / filter / sort dispatch is schema-driven
//! (see `FilterState`, `SortOption`, `BoardGroup`) so the TUI runs uniformly
//! against any adapter, not just markdown.

use leanspec_core::adapters::{Adapter, ListFilter};
use leanspec_core::model::{semantic, FieldKind, FieldValue, SpecDoc, SpecSchema};
use ratatui::layout::Rect;
use std::collections::{HashMap, HashSet};
use std::error::Error;

/// Per-project UI preferences persisted across sessions.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct TuiPrefs {
    pub sort_option: Option<String>,
    pub sidebar_width_pct: Option<u16>,
    pub sidebar_collapsed: Option<bool>,
    pub hide_archived: Option<bool>,
}

/// Which mode the app is in (affects keybinding dispatch).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppMode {
    Normal,
    Search,
    Help,
    Filter,
    Toc,
    /// Project switcher popup (lowercase `p`)
    ProjectSwitcher,
    /// Full project management view (uppercase `P`)
    ProjectManagement,
}

/// Sort order for the spec list.
///
/// `FieldDesc(key)` sorts by an enum field's declared option order in the
/// schema (e.g. priority). Documents whose value is missing or unknown sort
/// last.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum SortOption {
    #[default]
    IdDesc,
    IdAsc,
    FieldDesc(String),
    TitleAsc,
    UpdatedDesc,
}

impl SortOption {
    pub fn label(&self) -> String {
        match self {
            SortOption::IdDesc => "ID ↓".into(),
            SortOption::IdAsc => "ID ↑".into(),
            SortOption::FieldDesc(key) => format!("{} ↓", capitalize(key)),
            SortOption::TitleAsc => "Title A-Z".into(),
            SortOption::UpdatedDesc => "Updated ↓".into(),
        }
    }

    /// Cycle order: Id↓ → Id↑ → (priority↓ if schema has one) → Title → Updated → …
    pub fn next(&self, schema: &SpecSchema) -> SortOption {
        let priority_key = schema.key_for_semantic(semantic::PRIORITY);
        match self {
            SortOption::IdDesc => SortOption::IdAsc,
            SortOption::IdAsc => match priority_key {
                Some(k) => SortOption::FieldDesc(k.to_string()),
                None => SortOption::TitleAsc,
            },
            SortOption::FieldDesc(_) => SortOption::TitleAsc,
            SortOption::TitleAsc => SortOption::UpdatedDesc,
            SortOption::UpdatedDesc => SortOption::IdDesc,
        }
    }
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Active filter state for the spec list.
///
/// `fields` maps field key → list of currently *selected* enum values for
/// that field. The default state (built by [`FilterState::from_schema`]) has
/// every enum field pre-populated with all of its declared values — so the
/// filter popup renders every row as `[x]` and `matches()` lets every doc
/// pass. Toggling a value off narrows the visible set.
#[derive(Debug, Clone, Default)]
pub struct FilterState {
    pub fields: HashMap<String, Vec<String>>,
    pub hide_archived: bool,
}

impl FilterState {
    /// Build a filter pre-populated with every enum value declared by the
    /// schema. Matches the design in spec #269: "Default: all values selected."
    pub fn from_schema(schema: &SpecSchema) -> Self {
        let mut fields: HashMap<String, Vec<String>> = HashMap::new();
        for field in &schema.fields {
            if let FieldKind::Enum { options, .. } = &field.kind {
                if options.is_empty() {
                    continue;
                }
                let values: Vec<String> = options.iter().map(|o| o.value.clone()).collect();
                fields.insert(field.key.clone(), values);
            }
        }
        Self {
            fields,
            hide_archived: true,
        }
    }

    /// True when the filter is at its schema-derived default (every enum
    /// field has all its values selected) — i.e. no user-applied narrowing.
    /// `hide_archived` is a separate UX toggle and not counted here.
    pub fn is_empty(&self, schema: &SpecSchema) -> bool {
        for field in &schema.fields {
            if let FieldKind::Enum { options, .. } = &field.kind {
                if options.is_empty() {
                    continue;
                }
                let selected = match self.fields.get(&field.key) {
                    Some(s) => s,
                    None => return false,
                };
                if selected.len() != options.len() {
                    return false;
                }
            }
        }
        true
    }

    /// Toggle a value in the filter for `key`. Adds it if absent, removes
    /// it if present.
    pub fn toggle(&mut self, key: &str, value: &str) {
        let entry = self.fields.entry(key.to_string()).or_default();
        if let Some(pos) = entry.iter().position(|v| v == value) {
            entry.remove(pos);
        } else {
            entry.push(value.to_string());
        }
    }

    pub fn is_selected(&self, key: &str, value: &str) -> bool {
        self.fields
            .get(key)
            .map(|v| v.iter().any(|s| s == value))
            .unwrap_or(false)
    }

    pub fn matches(&self, doc: &SpecDoc, status_key: Option<&str>) -> bool {
        if self.hide_archived {
            if let Some(sk) = status_key {
                if doc.field_str(sk) == Some("archived") {
                    return false;
                }
            }
        }
        for (key, selected) in &self.fields {
            // An empty selection means "user has deselected every value for
            // this field" — nothing should pass for it.
            if selected.is_empty() {
                if doc.fields.contains_key(key) {
                    return false;
                }
                continue;
            }
            match doc.fields.get(key) {
                Some(FieldValue::String(s)) if !selected.iter().any(|v| v == s) => {
                    return false;
                }
                Some(FieldValue::Strings(values))
                    if !values.iter().any(|v| selected.contains(v)) =>
                {
                    return false;
                }
                // Doc has no value for this field — pass; the user can't
                // express "absent" in the popup, so it's never a hard filter.
                _ => {}
            }
        }
        true
    }
}

/// Enumerated values declared by the schema for `field_key`, in declaration
/// order. Returns empty when the field isn't an enum.
pub fn filter_values_for_field(key: &str, schema: &SpecSchema) -> Vec<String> {
    schema
        .field(key)
        .map(|f| match &f.kind {
            FieldKind::Enum { options, .. } => options.iter().map(|o| o.value.clone()).collect(),
            _ => Vec::new(),
        })
        .unwrap_or_default()
}

/// Human-readable label for `value` in `field_key`, falling back to the raw
/// value when the schema declares no label.
pub fn field_label<'a>(value: &'a str, field_key: &str, schema: &'a SpecSchema) -> String {
    schema
        .field(field_key)
        .and_then(|f| match &f.kind {
            FieldKind::Enum { options, .. } => options
                .iter()
                .find(|o| o.value == value)
                .map(|o| o.label.clone()),
            _ => None,
        })
        .unwrap_or_else(|| value.to_string())
}

/// One row in the tree view of the list pane.
#[derive(Debug, Clone)]
pub struct TreeRow {
    pub spec_idx: usize,
    pub depth: usize,
    pub has_children: bool,
    pub is_collapsed: bool,
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

/// A group of specs sharing the same value of the grouping field, used for
/// the board view. `value` is the raw enum value (e.g. `"in-progress"`);
/// `label` is the human-readable form from the schema.
#[derive(Debug, Clone)]
pub struct BoardGroup {
    pub value: String,
    pub label: String,
    pub indices: Vec<usize>,
    pub collapsed: bool,
}

/// State for the project switcher popup.
#[derive(Debug, Clone, Default)]
pub struct ProjectSwitcherState {
    pub projects: Vec<leanspec_core::storage::Project>,
    pub selected: usize,
    pub search: String,
    pub filtered: Vec<usize>,
    pub searching: bool,
}

impl ProjectSwitcherState {
    pub fn new(projects: Vec<leanspec_core::storage::Project>) -> Self {
        let filtered = (0..projects.len()).collect();
        Self {
            projects,
            selected: 0,
            search: String::new(),
            filtered,
            searching: false,
        }
    }

    pub fn update_filter(&mut self) {
        let q = self.search.to_lowercase();
        if q.is_empty() {
            self.filtered = (0..self.projects.len()).collect();
        } else {
            self.filtered = self
                .projects
                .iter()
                .enumerate()
                .filter(|(_, p)| {
                    p.name.to_lowercase().contains(&q) || p.id.to_lowercase().contains(&q)
                })
                .map(|(i, _)| i)
                .collect();
        }
        if !self.filtered.is_empty() && self.selected >= self.filtered.len() {
            self.selected = self.filtered.len() - 1;
        }
    }

    pub fn selected_project(&self) -> Option<&leanspec_core::storage::Project> {
        self.filtered
            .get(self.selected)
            .and_then(|&i| self.projects.get(i))
    }
}

pub const PRESET_COLORS: &[(&str, &str)] = &[
    ("none", ""),
    ("blue", "#4080ff"),
    ("green", "#40c060"),
    ("yellow", "#e0b020"),
    ("red", "#e04040"),
    ("purple", "#9060e0"),
    ("cyan", "#40c0c0"),
    ("orange", "#e07020"),
    ("pink", "#e060a0"),
    ("gray", "#808090"),
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProjectMgmtAction {
    None,
    Renaming {
        id: String,
        buffer: String,
    },
    ConfirmDelete {
        id: String,
    },
    AddingProject {
        buffer: String,
        message: Option<String>,
    },
    ChangingColor {
        id: String,
        color_idx: usize,
    },
}

#[derive(Debug, Clone)]
pub struct ProjectMgmtState {
    pub projects: Vec<leanspec_core::storage::Project>,
    pub selected: usize,
    pub action: ProjectMgmtAction,
    pub message: Option<String>,
}

impl ProjectMgmtState {
    pub fn new(projects: Vec<leanspec_core::storage::Project>) -> Self {
        Self {
            projects,
            selected: 0,
            action: ProjectMgmtAction::None,
            message: None,
        }
    }

    pub fn selected_project(&self) -> Option<&leanspec_core::storage::Project> {
        self.projects.get(self.selected)
    }
}

/// Serializable snapshot of app state for headless mode output.
#[derive(serde::Serialize)]
pub struct AppDebugState {
    pub view: String,
    pub mode: String,
    pub spec_count: usize,
    pub filtered_count: usize,
    pub sort: String,
    pub search_query: String,
    pub selected_path: Option<String>,
    pub board_groups: Vec<BoardGroupDebug>,
    pub tree_mode: bool,
    pub sidebar_collapsed: bool,
}

#[derive(serde::Serialize)]
pub struct BoardGroupDebug {
    pub status: String,
    pub count: usize,
    pub collapsed: bool,
}

/// Core application state.
///
/// Holds the active adapter, the resolved schema, and all loaded `SpecDoc`s,
/// plus all derived caches (filtered indices, board groups, tree rows). The
/// derived state is rebuilt by `apply_filter_and_sort` after any change.
pub struct App {
    // Data
    pub adapter: Box<dyn Adapter>,
    pub schema: SpecSchema,
    pub status_key: Option<String>,
    pub priority_key: Option<String>,

    pub specs: Vec<SpecDoc>,
    pub filtered_specs: Vec<usize>,
    pub selected_detail: Option<SpecDoc>,
    pub selected_body: String,
    pub board_groups: Vec<BoardGroup>,

    /// Dependency graph derived from `doc.links` of type `depends_on`,
    /// mapping doc id → list of dependency ids and reverse map.
    pub deps: DepsIndex,

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
    pub list_scroll_offset: usize,

    // Detail scroll
    pub detail_scroll: u16,
    pub detail_content_lines: u16,

    // Search
    pub search_query: String,
    pub search_results: Vec<usize>,

    // Layout / sidebar state
    pub sidebar_width_pct: u16,
    pub sidebar_collapsed: bool,
    pub drag_resize: bool,
    pub layout_left: Rect,
    pub layout_right: Rect,
    pub last_frame_width: u16,
    pub last_frame_height: u16,

    // Sort & filter
    pub sort_option: SortOption,
    pub filter: FilterState,
    /// Cursor offset into the flattened (status values + priority values) list
    /// rendered by the filter popup.
    pub filter_cursor: usize,

    // Tree view
    pub tree_mode: bool,
    pub tree_collapsed: HashSet<String>,
    pub tree_rows: Vec<TreeRow>,

    // TOC overlay
    pub detail_toc: Vec<(usize, u8, String)>,
    pub toc_selected: usize,

    // Project management
    pub current_project: Option<leanspec_core::storage::Project>,
    pub project_switcher: Option<ProjectSwitcherState>,
    pub project_mgmt: Option<ProjectMgmtState>,
}

/// Dependency lookups derived from `doc.links` (link_type = `depends_on`).
#[derive(Debug, Default, Clone)]
pub struct DepsIndex {
    /// id → list of ids it depends on.
    pub depends_on: HashMap<String, Vec<String>>,
    /// id → list of ids that depend on it.
    pub required_by: HashMap<String, Vec<String>>,
}

impl DepsIndex {
    pub fn build(docs: &[SpecDoc]) -> Self {
        let mut depends_on: HashMap<String, Vec<String>> = HashMap::new();
        let mut required_by: HashMap<String, Vec<String>> = HashMap::new();
        for doc in docs {
            let deps: Vec<String> = doc
                .links
                .iter()
                .filter(|l| l.link_type == "depends_on")
                .map(|l| l.target_id.clone())
                .collect();
            for dep_id in &deps {
                required_by
                    .entry(dep_id.clone())
                    .or_default()
                    .push(doc.id.clone());
            }
            if !deps.is_empty() {
                depends_on.insert(doc.id.clone(), deps);
            }
        }
        Self {
            depends_on,
            required_by,
        }
    }

    pub fn dep_count(&self, id: &str) -> usize {
        self.depends_on.get(id).map(|v| v.len()).unwrap_or(0)
    }

    pub fn req_count(&self, id: &str) -> usize {
        self.required_by.get(id).map(|v| v.len()).unwrap_or(0)
    }
}

/// Resolve the adapter for a project in the registry.
///
/// Inspects the project's root directory for an `leanspec.adapter.yaml` /
/// `.lean-spec/adapter.yaml` (or the legacy `provider.yaml` variants) and
/// instantiates the configured adapter. Projects without such a file fall
/// back to the markdown adapter pointed at `project.specs_dir`.
pub fn resolve_adapter_for_project(
    project: &leanspec_core::storage::Project,
) -> Result<Box<dyn Adapter>, Box<dyn Error>> {
    use leanspec_core::adapters::markdown::MarkdownAdapter;
    use leanspec_core::adapters::AdapterRegistry;

    let candidates = [
        "leanspec.adapter.yaml",
        ".lean-spec/adapter.yaml",
        "leanspec.provider.yaml",
        ".lean-spec/provider.yaml",
    ];
    for candidate in candidates {
        let path = project.path.join(candidate);
        if path.exists() {
            let config = AdapterRegistry::load_config(&path)?;
            return Ok(AdapterRegistry::create(&config)?);
        }
    }
    Ok(Box::new(MarkdownAdapter::new(&project.specs_dir)))
}

/// Load projects from the registry sorted favorites-first, then by last_accessed desc.
pub fn load_projects_sorted() -> Vec<leanspec_core::storage::Project> {
    let Ok(registry) = leanspec_core::storage::ProjectRegistry::new() else {
        return Vec::new();
    };
    let mut projects: Vec<leanspec_core::storage::Project> =
        registry.all().into_iter().cloned().collect();
    projects.sort_by(|a, b| {
        b.favorite
            .cmp(&a.favorite)
            .then_with(|| b.last_accessed.cmp(&a.last_accessed))
    });
    projects
}

/// Sort key for an enum field: lower = sorts first. Unknown values sort last.
fn enum_sort_key(field_key: &str, doc: &SpecDoc, schema: &SpecSchema) -> u32 {
    let value = match doc.field_str(field_key) {
        Some(v) => v,
        None => return u32::MAX,
    };
    schema
        .field(field_key)
        .and_then(|f| match &f.kind {
            FieldKind::Enum { options, .. } => options
                .iter()
                .position(|o| o.value == value)
                .map(|i| i as u32),
            _ => None,
        })
        .unwrap_or(u32::MAX)
}

/// Ordering key for `IdDesc` / `IdAsc`. For markdown-style IDs like
/// `"007-foo"` we sort by the leading number; for adapters with non-numeric
/// IDs (e.g. Jira `"ABC-123"`) we fall back to a case-insensitive string
/// compare so the order is still sensible.
///
/// The returned tuple sorts numerics-first (`has_number: false` > `true`
/// because `false < true` puts numeric IDs ahead of non-numeric), then by
/// extracted number for ties, then by the rest of the id.
fn id_order(doc: &SpecDoc) -> (bool, u32, String) {
    let id = doc.id.trim_start_matches('#');
    let digits: String = id.chars().take_while(|c| c.is_ascii_digit()).collect();
    if let Ok(n) = digits.parse::<u32>() {
        let rest = id[digits.len()..].to_lowercase();
        (false, n, rest)
    } else {
        (true, 0, id.to_lowercase())
    }
}

impl App {
    /// Construct the app against a resolved adapter. Loads all specs once and
    /// derives the initial filter, sort, and board view.
    pub fn new(
        adapter: Box<dyn Adapter>,
        initial_view: PrimaryView,
        initial_project: Option<leanspec_core::storage::Project>,
    ) -> Result<Self, Box<dyn Error>> {
        let mut schema = adapter.schema().clone();
        adapter.resolve_schema(&mut schema)?;
        let status_key = schema
            .key_for_semantic(semantic::STATUS)
            .map(|k| k.to_string());
        let priority_key = schema
            .key_for_semantic(semantic::PRIORITY)
            .map(|k| k.to_string());

        // Surface backend errors (auth, network, schema) up front rather than
        // showing an empty project — `App::new` already returns `Result`.
        let specs: Vec<SpecDoc> = adapter.list(&ListFilter {
            fields: HashMap::new(),
            text: None,
            include_archived: true,
            raw: None,
        })?;
        let deps = DepsIndex::build(&specs);

        let filter = FilterState::from_schema(&schema);

        let mut app = Self {
            filtered_specs: (0..specs.len()).collect(),
            adapter,
            schema,
            status_key,
            priority_key,
            specs,
            selected_detail: None,
            selected_body: String::new(),
            board_groups: Vec::new(),
            deps,
            mode: AppMode::Normal,
            primary_view: initial_view,
            focus: FocusPane::Left,
            detail_mode: DetailMode::Content,
            should_quit: false,
            board_group_idx: 0,
            board_item_idx: 0,
            list_selected: 0,
            list_scroll_offset: 0,
            detail_scroll: 0,
            detail_content_lines: u16::MAX,
            search_query: String::new(),
            search_results: Vec::new(),
            sidebar_width_pct: 30,
            sidebar_collapsed: false,
            drag_resize: false,
            layout_left: Rect::default(),
            layout_right: Rect::default(),
            last_frame_width: 0,
            last_frame_height: 0,
            sort_option: SortOption::default(),
            filter,
            filter_cursor: 0,
            tree_mode: false,
            tree_collapsed: HashSet::new(),
            tree_rows: Vec::new(),
            detail_toc: Vec::new(),
            toc_selected: 0,
            current_project: initial_project,
            project_switcher: None,
            project_mgmt: None,
        };

        if let Some(ref p) = app.current_project.clone() {
            let prefs = Self::load_prefs(&p.id);
            app.apply_prefs(&prefs);
        }

        app.apply_filter_and_sort();
        app.load_selected_detail();

        Ok(app)
    }

    pub fn open_project_switcher(&mut self) {
        let projects = load_projects_sorted();
        self.project_switcher = Some(ProjectSwitcherState::new(projects));
        self.mode = AppMode::ProjectSwitcher;
    }

    pub fn open_project_management(&mut self) {
        let projects = load_projects_sorted();
        self.project_mgmt = Some(ProjectMgmtState::new(projects));
        self.mode = AppMode::ProjectManagement;
    }

    #[allow(dead_code)]
    pub fn open_first_launch_prompt(&mut self) {
        let projects = load_projects_sorted();
        self.project_mgmt = Some(ProjectMgmtState {
            projects,
            selected: 0,
            action: ProjectMgmtAction::AddingProject {
                buffer: String::new(),
                message: Some("No projects found. Add your first project:".to_string()),
            },
            message: None,
        });
        self.mode = AppMode::ProjectManagement;
    }

    pub fn prefs_path(project_id: &str) -> Option<std::path::PathBuf> {
        let home = std::env::var("HOME").ok()?;
        let dir = std::path::PathBuf::from(home)
            .join(".lean-spec")
            .join("tui-prefs");
        std::fs::create_dir_all(&dir).ok()?;
        Some(dir.join(format!("{}.json", project_id)))
    }

    pub fn load_prefs(project_id: &str) -> TuiPrefs {
        let Some(path) = Self::prefs_path(project_id) else {
            return TuiPrefs::default();
        };
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save_prefs(&self) {
        let Some(ref project) = self.current_project else {
            return;
        };
        let Some(path) = Self::prefs_path(&project.id) else {
            return;
        };
        let sort_str = match &self.sort_option {
            SortOption::IdDesc => "id_desc".to_string(),
            SortOption::IdAsc => "id_asc".to_string(),
            SortOption::FieldDesc(k) => format!("field_desc:{}", k),
            SortOption::TitleAsc => "title_asc".to_string(),
            SortOption::UpdatedDesc => "updated_desc".to_string(),
        };
        let prefs = TuiPrefs {
            sort_option: Some(sort_str),
            sidebar_width_pct: Some(self.sidebar_width_pct),
            sidebar_collapsed: Some(self.sidebar_collapsed),
            hide_archived: Some(self.filter.hide_archived),
        };
        if let Ok(json) = serde_json::to_string_pretty(&prefs) {
            let _ = std::fs::write(path, json);
        }
    }

    pub fn apply_prefs(&mut self, prefs: &TuiPrefs) {
        if let Some(ref sort_str) = prefs.sort_option {
            self.sort_option = match sort_str.as_str() {
                "id_asc" => SortOption::IdAsc,
                "title_asc" => SortOption::TitleAsc,
                "updated_desc" => SortOption::UpdatedDesc,
                s if s.starts_with("field_desc:") => {
                    SortOption::FieldDesc(s.trim_start_matches("field_desc:").to_string())
                }
                // Back-compat for the pre-394 "priority_desc" preset.
                "priority_desc" => match &self.priority_key {
                    Some(k) => SortOption::FieldDesc(k.clone()),
                    None => SortOption::IdDesc,
                },
                _ => SortOption::IdDesc,
            };
        }
        if let Some(w) = prefs.sidebar_width_pct {
            self.sidebar_width_pct = w;
        }
        if let Some(c) = prefs.sidebar_collapsed {
            self.sidebar_collapsed = c;
        }
        if let Some(ha) = prefs.hide_archived {
            self.filter.hide_archived = ha;
        }
    }

    pub fn close_overlay(&mut self) {
        self.mode = AppMode::Normal;
        self.project_switcher = None;
        self.project_mgmt = None;
    }

    /// Switch to a project: resolve its adapter (honouring an
    /// `leanspec.adapter.yaml` in the project root, so GitHub / ADO / Jira
    /// projects use their configured adapter) and reload state. On error,
    /// stash a message on the project management overlay rather than
    /// crashing the TUI.
    pub fn switch_project(&mut self, project: leanspec_core::storage::Project) {
        self.save_prefs();
        if let Ok(mut registry) = leanspec_core::storage::ProjectRegistry::new() {
            let _ = registry.touch_last_accessed(&project.id);
        }

        let adapter = match resolve_adapter_for_project(&project) {
            Ok(a) => a,
            Err(e) => {
                if let Some(ref mut mgmt) = self.project_mgmt {
                    mgmt.message = Some(format!("Failed to open project: {}", e));
                }
                return;
            }
        };

        self.current_project = Some(project);
        if let Some(ref p) = self.current_project.clone() {
            let prefs = Self::load_prefs(&p.id);
            self.apply_prefs(&prefs);
        }
        if let Err(e) = self.reload_with_adapter(adapter) {
            if let Some(ref mut mgmt) = self.project_mgmt {
                mgmt.message = Some(format!("Failed to load specs: {}", e));
            }
            return;
        }
        self.close_overlay();
    }

    /// Replace the active adapter and reload all derived state from it.
    /// Used both by the project switcher and by any test code that wants to
    /// swap the backing store without rebuilding the whole `App`.
    pub fn reload_with_adapter(&mut self, adapter: Box<dyn Adapter>) -> Result<(), Box<dyn Error>> {
        let mut schema = adapter.schema().clone();
        adapter.resolve_schema(&mut schema)?;
        let specs: Vec<SpecDoc> = adapter.list(&ListFilter {
            fields: HashMap::new(),
            text: None,
            include_archived: true,
            raw: None,
        })?;

        self.adapter = adapter;
        self.schema = schema;
        self.status_key = self
            .schema
            .key_for_semantic(semantic::STATUS)
            .map(|k| k.to_string());
        self.priority_key = self
            .schema
            .key_for_semantic(semantic::PRIORITY)
            .map(|k| k.to_string());
        self.specs = specs;
        self.deps = DepsIndex::build(&self.specs);
        self.filtered_specs = (0..self.specs.len()).collect();
        self.board_group_idx = 0;
        self.board_item_idx = 0;
        self.list_selected = 0;
        self.selected_detail = None;
        self.selected_body.clear();
        self.detail_scroll = 0;
        self.filter = FilterState::from_schema(&self.schema);
        self.sort_option = SortOption::default();
        self.tree_mode = false;
        self.tree_collapsed = HashSet::new();
        self.tree_rows = Vec::new();
        self.apply_filter_and_sort();
        self.load_selected_detail();
        Ok(())
    }

    /// Apply current filter + sort to rebuild `filtered_specs`, board groups, and tree rows.
    pub fn apply_filter_and_sort(&mut self) {
        let status_key = self.status_key.clone();
        self.filtered_specs = (0..self.specs.len())
            .filter(|&i| self.filter.matches(&self.specs[i], status_key.as_deref()))
            .collect();

        // Sort
        let specs = &self.specs;
        let schema = &self.schema;
        let sort = self.sort_option.clone();
        self.filtered_specs.sort_by(|&a, &b| {
            let sa = &specs[a];
            let sb = &specs[b];
            match &sort {
                SortOption::IdDesc => id_order(sb).cmp(&id_order(sa)),
                SortOption::IdAsc => id_order(sa).cmp(&id_order(sb)),
                SortOption::FieldDesc(key) => {
                    enum_sort_key(key, sa, schema).cmp(&enum_sort_key(key, sb, schema))
                }
                SortOption::TitleAsc => sa.title.to_lowercase().cmp(&sb.title.to_lowercase()),
                SortOption::UpdatedDesc => sb.updated_at.cmp(&sa.updated_at),
            }
        });

        self.rebuild_board_groups_from_filtered();
        self.rebuild_tree_rows();

        let max_group = self.board_groups.len().saturating_sub(1);
        self.board_group_idx = self.board_group_idx.min(max_group);
        if let Some(group) = self.board_groups.get(self.board_group_idx) {
            self.board_item_idx = self
                .board_item_idx
                .min(group.indices.len().saturating_sub(1));
        }
        let max_list = self.visible_list_len().saturating_sub(1);
        self.list_selected = self.list_selected.min(max_list);
        self.update_list_scroll();
    }

    fn rebuild_board_groups_from_filtered(&mut self) {
        let prev_collapsed: HashMap<String, bool> = self
            .board_groups
            .iter()
            .map(|g| (g.value.clone(), g.collapsed))
            .collect();

        let Some(status_key) = self.status_key.clone() else {
            // No status field on this adapter — single anonymous group.
            self.board_groups = vec![BoardGroup {
                value: String::new(),
                label: "All".to_string(),
                indices: self.filtered_specs.clone(),
                collapsed: false,
            }];
            return;
        };

        let values = filter_values_for_field(&status_key, &self.schema);
        self.board_groups = values
            .iter()
            .filter_map(|value| {
                let indices: Vec<usize> = self
                    .filtered_specs
                    .iter()
                    .filter(|&&i| self.specs[i].field_str(&status_key) == Some(value))
                    .copied()
                    .collect();
                if indices.is_empty() {
                    None
                } else {
                    let collapsed = prev_collapsed.get(value).copied().unwrap_or(false);
                    Some(BoardGroup {
                        value: value.clone(),
                        label: field_label(value, &status_key, &self.schema),
                        indices,
                        collapsed,
                    })
                }
            })
            .collect();
    }

    pub fn rebuild_tree_rows(&mut self) {
        let id_to_idx: HashMap<&str, usize> = self
            .filtered_specs
            .iter()
            .map(|&i| (self.specs[i].id.as_str(), i))
            .collect();

        let mut children_map: HashMap<String, Vec<usize>> = HashMap::new();
        let mut root_indices: Vec<usize> = Vec::new();

        for &i in &self.filtered_specs {
            let doc = &self.specs[i];
            let parent_id = doc
                .links
                .iter()
                .find(|l| l.link_type == "parent")
                .map(|l| l.target_id.as_str());
            if let Some(pid) = parent_id {
                if id_to_idx.contains_key(pid) {
                    children_map.entry(pid.to_string()).or_default().push(i);
                    continue;
                }
            }
            root_indices.push(i);
        }

        let mut rows: Vec<TreeRow> = Vec::new();
        for root_idx in root_indices {
            Self::dfs_tree(
                root_idx,
                0,
                &self.specs,
                &children_map,
                &self.tree_collapsed,
                &mut rows,
            );
        }
        self.tree_rows = rows;
    }

    fn dfs_tree(
        spec_idx: usize,
        depth: usize,
        specs: &[SpecDoc],
        children_map: &HashMap<String, Vec<usize>>,
        collapsed: &HashSet<String>,
        rows: &mut Vec<TreeRow>,
    ) {
        let id = &specs[spec_idx].id;
        let children = children_map
            .get(id)
            .map_or(&[] as &[usize], |v| v.as_slice());
        let has_children = !children.is_empty();
        let is_collapsed = collapsed.contains(id);

        rows.push(TreeRow {
            spec_idx,
            depth,
            has_children,
            is_collapsed,
        });

        if !is_collapsed {
            for &child_idx in children {
                Self::dfs_tree(child_idx, depth + 1, specs, children_map, collapsed, rows);
            }
        }
    }

    pub fn visible_list_len(&self) -> usize {
        if self.tree_mode {
            self.tree_rows.len()
        } else {
            self.filtered_specs.len()
        }
    }

    pub fn update_list_scroll(&mut self) {
        const SCROLLOFF: usize = 3;
        let total = self.visible_list_len();
        if total == 0 {
            self.list_scroll_offset = 0;
            return;
        }
        let visible_rows = (self.last_frame_height as usize).saturating_sub(6).max(1);
        if self.list_selected < self.list_scroll_offset + SCROLLOFF {
            self.list_scroll_offset = self.list_selected.saturating_sub(SCROLLOFF);
        }
        if self.list_selected + SCROLLOFF + 1 > self.list_scroll_offset + visible_rows {
            self.list_scroll_offset =
                (self.list_selected + SCROLLOFF + 1).saturating_sub(visible_rows);
        }
        let max_offset = total.saturating_sub(visible_rows);
        self.list_scroll_offset = self.list_scroll_offset.min(max_offset);
    }

    // -- Sort & filter --

    pub fn cycle_sort(&mut self) {
        self.sort_option = self.sort_option.next(&self.schema);
        self.apply_filter_and_sort();
        self.load_selected_detail();
    }

    pub fn open_filter(&mut self) {
        self.mode = AppMode::Filter;
    }

    pub fn close_filter(&mut self) {
        self.mode = AppMode::Normal;
        self.apply_filter_and_sort();
        self.load_selected_detail();
    }

    pub fn clear_filters(&mut self) {
        let hide_archived = self.filter.hide_archived;
        self.filter = FilterState::from_schema(&self.schema);
        self.filter.hide_archived = hide_archived;
        self.apply_filter_and_sort();
        self.load_selected_detail();
    }

    /// Flattened list of filterable values shown by the filter popup —
    /// status values first, then priority values. Used by both the renderer
    /// and the keybinding handler to keep cursor math in sync.
    pub fn filter_entries(&self) -> Vec<(String, String)> {
        let mut out = Vec::new();
        if let Some(ref k) = self.status_key {
            for v in filter_values_for_field(k, &self.schema) {
                out.push((k.clone(), v));
            }
        }
        if let Some(ref k) = self.priority_key {
            for v in filter_values_for_field(k, &self.schema) {
                out.push((k.clone(), v));
            }
        }
        out
    }

    pub fn filter_cursor_down(&mut self) {
        let total = self.filter_entries().len();
        if self.filter_cursor + 1 < total {
            self.filter_cursor += 1;
        }
    }

    pub fn filter_cursor_up(&mut self) {
        self.filter_cursor = self.filter_cursor.saturating_sub(1);
    }

    pub fn filter_toggle_current(&mut self) {
        let entries = self.filter_entries();
        if let Some((key, value)) = entries.get(self.filter_cursor) {
            self.filter.toggle(key, value);
        }
    }

    // -- Tree view --

    pub fn toggle_tree(&mut self) {
        self.tree_mode = !self.tree_mode;
        self.list_selected = 0;
        self.load_selected_detail();
    }

    pub fn collapse_all(&mut self) {
        let parent_ids: HashSet<String> = self
            .filtered_specs
            .iter()
            .filter_map(|&i| {
                self.specs[i]
                    .links
                    .iter()
                    .find(|l| l.link_type == "parent")
                    .map(|l| l.target_id.clone())
            })
            .collect();
        for id in parent_ids {
            self.tree_collapsed.insert(id);
        }
        self.rebuild_tree_rows();
        self.list_selected = self
            .list_selected
            .min(self.tree_rows.len().saturating_sub(1));
    }

    pub fn expand_all(&mut self) {
        self.tree_collapsed.clear();
        self.rebuild_tree_rows();
    }

    pub fn toggle_current_tree_node(&mut self) {
        if !self.tree_mode {
            return;
        }
        if let Some(row) = self.tree_rows.get(self.list_selected) {
            if !row.has_children {
                return;
            }
            let id = self.specs[row.spec_idx].id.clone();
            if self.tree_collapsed.contains(&id) {
                self.tree_collapsed.remove(&id);
            } else {
                self.tree_collapsed.insert(id);
            }
            self.rebuild_tree_rows();
            self.list_selected = self
                .list_selected
                .min(self.tree_rows.len().saturating_sub(1));
        }
    }

    pub fn selected_spec_index(&self) -> Option<usize> {
        match self.primary_view {
            PrimaryView::Board => {
                let group = self.board_groups.get(self.board_group_idx)?;
                if group.collapsed {
                    return None;
                }
                group.indices.get(self.board_item_idx).copied()
            }
            PrimaryView::List => {
                if self.tree_mode {
                    self.tree_rows.get(self.list_selected).map(|r| r.spec_idx)
                } else {
                    self.filtered_specs.get(self.list_selected).copied()
                }
            }
        }
    }

    /// Load the full document (with body) for the current selection. Markdown
    /// stores body in the `content` field; for other adapters the body falls
    /// back to whatever section fields are present.
    pub fn load_selected_detail(&mut self) {
        if let Some(idx) = self.selected_spec_index() {
            let Some(doc) = self.specs.get(idx).cloned() else {
                self.clear_detail();
                return;
            };
            let full = self.adapter.get(&doc.id).unwrap_or(doc);
            let body = body_content(&full, &self.schema);
            self.detail_content_lines = body.lines().count() as u16;
            self.detail_toc = Self::extract_headings_inner(&body);
            self.selected_detail = Some(full);
            self.selected_body = body;
        } else {
            self.clear_detail();
        }
        self.detail_scroll = 0;
        self.toc_selected = 0;
    }

    fn clear_detail(&mut self) {
        self.selected_detail = None;
        self.selected_body.clear();
        self.detail_content_lines = u16::MAX;
        self.detail_toc = Vec::new();
    }

    fn extract_headings_inner(content: &str) -> Vec<(usize, u8, String)> {
        let mut headings: Vec<(usize, u8, String)> = Vec::new();
        let mut line_idx: usize = 0;
        let mut in_code_block = false;
        let mut code_len: usize = 0;

        for raw_line in content.lines() {
            let trimmed = raw_line.trim_end();
            if trimmed.starts_with("```") {
                if in_code_block {
                    line_idx += code_len + 2;
                    in_code_block = false;
                    code_len = 0;
                } else {
                    in_code_block = true;
                }
                continue;
            }
            if in_code_block {
                code_len += 1;
                continue;
            }
            if let Some(rest) = trimmed.strip_prefix("## ") {
                headings.push((line_idx, 2, rest.to_string()));
            } else if let Some(rest) = trimmed.strip_prefix("### ") {
                headings.push((line_idx, 3, rest.to_string()));
            }
            line_idx += 1;
        }
        headings
    }

    // -- Navigation --

    pub fn move_down(&mut self) {
        match self.primary_view {
            PrimaryView::Board => {
                let group_len = self
                    .board_groups
                    .get(self.board_group_idx)
                    .map(|g| if g.collapsed { 0 } else { g.indices.len() })
                    .unwrap_or(0);
                if self.board_item_idx + 1 < group_len {
                    self.board_item_idx += 1;
                } else if self.board_group_idx + 1 < self.board_groups.len() {
                    self.board_group_idx += 1;
                    self.board_item_idx = 0;
                }
            }
            PrimaryView::List => {
                let max = self.visible_list_len().saturating_sub(1);
                if self.list_selected < max {
                    self.list_selected += 1;
                }
            }
        }
        self.update_list_scroll();
        self.load_selected_detail();
    }

    pub fn move_up(&mut self) {
        match self.primary_view {
            PrimaryView::Board => {
                if self.board_item_idx > 0 {
                    self.board_item_idx -= 1;
                } else if self.board_group_idx > 0 {
                    self.board_group_idx -= 1;
                    let prev_len = self
                        .board_groups
                        .get(self.board_group_idx)
                        .map(|g| if g.collapsed { 0 } else { g.indices.len() })
                        .unwrap_or(0);
                    self.board_item_idx = prev_len.saturating_sub(1);
                }
            }
            PrimaryView::List => {
                self.list_selected = self.list_selected.saturating_sub(1);
            }
        }
        self.update_list_scroll();
        self.load_selected_detail();
    }

    pub fn move_first(&mut self) {
        match self.primary_view {
            PrimaryView::Board => self.board_item_idx = 0,
            PrimaryView::List => self.list_selected = 0,
        }
        self.update_list_scroll();
        self.load_selected_detail();
    }

    pub fn move_last(&mut self) {
        match self.primary_view {
            PrimaryView::Board => {
                if let Some(group) = self.board_groups.get(self.board_group_idx) {
                    self.board_item_idx = group.indices.len().saturating_sub(1);
                }
            }
            PrimaryView::List => {
                self.list_selected = self.visible_list_len().saturating_sub(1);
            }
        }
        self.update_list_scroll();
        self.load_selected_detail();
    }

    pub fn page_down(&mut self, page_size: usize) {
        match self.primary_view {
            PrimaryView::Board => {
                if let Some(group) = self.board_groups.get(self.board_group_idx) {
                    self.board_item_idx = (self.board_item_idx + page_size)
                        .min(group.indices.len().saturating_sub(1));
                }
            }
            PrimaryView::List => {
                let max = self.visible_list_len().saturating_sub(1);
                self.list_selected = (self.list_selected + page_size).min(max);
            }
        }
        self.update_list_scroll();
        self.load_selected_detail();
    }

    pub fn page_up(&mut self, page_size: usize) {
        match self.primary_view {
            PrimaryView::Board => {
                self.board_item_idx = self.board_item_idx.saturating_sub(page_size);
            }
            PrimaryView::List => {
                self.list_selected = self.list_selected.saturating_sub(page_size);
            }
        }
        self.update_list_scroll();
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

    pub fn toggle_current_board_group(&mut self) {
        if let Some(group) = self.board_groups.get_mut(self.board_group_idx) {
            group.collapsed = !group.collapsed;
            if group.collapsed {
                self.board_item_idx = 0;
            }
        }
    }

    pub fn collapse_all_board_groups(&mut self) {
        for group in &mut self.board_groups {
            group.collapsed = true;
        }
        self.board_item_idx = 0;
    }

    pub fn expand_all_board_groups(&mut self) {
        for group in &mut self.board_groups {
            group.collapsed = false;
        }
    }

    pub fn scroll_detail_down(&mut self) {
        if self.detail_scroll < self.detail_content_lines {
            self.detail_scroll = self.detail_scroll.saturating_add(1);
        }
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

    pub fn open_toc(&mut self) {
        if !self.detail_toc.is_empty() {
            self.toc_selected = self.current_toc_section();
            self.mode = AppMode::Toc;
        }
    }

    pub fn close_toc(&mut self) {
        self.mode = AppMode::Normal;
    }

    pub fn toc_move_down(&mut self) {
        if self.toc_selected + 1 < self.detail_toc.len() {
            self.toc_selected += 1;
        }
    }

    pub fn toc_move_up(&mut self) {
        self.toc_selected = self.toc_selected.saturating_sub(1);
    }

    pub fn toc_jump(&mut self) {
        if let Some(&(line_idx, _, _)) = self.detail_toc.get(self.toc_selected) {
            self.detail_scroll = line_idx as u16;
        }
        self.close_toc();
    }

    pub fn current_toc_section(&self) -> usize {
        let scroll = self.detail_scroll as usize;
        let mut best = 0;
        for (i, &(line_idx, _, _)) in self.detail_toc.iter().enumerate() {
            if line_idx <= scroll {
                best = i;
            }
        }
        best
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
            match self.primary_view {
                PrimaryView::Board => {
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

    // -- Sidebar width / collapse --

    pub fn sidebar_widen(&mut self) {
        self.sidebar_width_pct = (self.sidebar_width_pct + 5).min(60);
    }

    pub fn sidebar_narrow(&mut self) {
        self.sidebar_width_pct = self.sidebar_width_pct.saturating_sub(5).max(15);
    }

    pub fn sidebar_toggle_collapse(&mut self) {
        self.sidebar_collapsed = !self.sidebar_collapsed;
    }

    pub fn board_scroll(&self, visible_height: usize) -> usize {
        let mut selected_row: usize = 0;
        let mut found = false;
        'outer: for (gi, group) in self.board_groups.iter().enumerate() {
            selected_row += 1;
            if gi == self.board_group_idx && group.collapsed {
                found = true;
                break 'outer;
            }
            if !group.collapsed {
                for ii in 0..group.indices.len() {
                    if gi == self.board_group_idx && ii == self.board_item_idx {
                        found = true;
                        break 'outer;
                    }
                    selected_row += 1;
                }
            }
            selected_row += 1;
        }
        if !found || visible_height == 0 {
            return 0;
        }
        selected_row.saturating_sub(visible_height.saturating_sub(1))
    }

    pub fn click_sidebar(&mut self, row: u16) {
        self.focus = FocusPane::Left;
        match self.primary_view {
            PrimaryView::List => {
                let content_row = row.saturating_sub(self.layout_left.y).saturating_sub(1);
                let item_row = content_row.saturating_sub(2) as usize;
                let offset = self.list_scroll_offset;
                let new_idx = offset + item_row;
                if new_idx < self.filtered_specs.len() {
                    self.list_selected = new_idx;
                    self.update_list_scroll();
                    self.load_selected_detail();
                }
            }
            PrimaryView::Board => {
                let inner_y = self.layout_left.y + 1;
                if row < inner_y {
                    return;
                }
                let visible_height = self.layout_left.height.saturating_sub(2) as usize;
                let scroll = self.board_scroll(visible_height);
                let content_line = (row - inner_y) as usize + scroll;

                let mut line: usize = 0;
                for (gi, group) in self.board_groups.iter().enumerate() {
                    if content_line == line {
                        self.board_group_idx = gi;
                        self.toggle_current_board_group();
                        return;
                    }
                    line += 1;
                    if !group.collapsed {
                        for (ii, _) in group.indices.iter().enumerate() {
                            if content_line == line {
                                self.board_group_idx = gi;
                                self.board_item_idx = ii;
                                self.load_selected_detail();
                                return;
                            }
                            line += 1;
                        }
                    }
                    line += 1;
                }
            }
        }
    }

    pub fn resize_drag_to(&mut self, col: u16) {
        if self.last_frame_width == 0 {
            return;
        }
        let new_pct = (col as u32 * 100 / self.last_frame_width as u32) as u16;
        self.sidebar_width_pct = new_pct.clamp(15, 60);
    }

    /// Simple substring match over `id` and `title` — works uniformly against
    /// any adapter. Could be upgraded to `adapter.search()` for backends with
    /// richer search support.
    fn update_search_results(&mut self) {
        if self.search_query.is_empty() {
            self.search_results.clear();
            return;
        }
        let q = self.search_query.to_lowercase();
        self.search_results = self
            .specs
            .iter()
            .enumerate()
            .filter(|(_, doc)| {
                doc.id.to_lowercase().contains(&q) || doc.title.to_lowercase().contains(&q)
            })
            .map(|(i, _)| i)
            .take(20)
            .collect();
    }

    /// Produce a serializable snapshot of current app state for headless mode output.
    pub fn debug_state(&self) -> AppDebugState {
        AppDebugState {
            view: match self.primary_view {
                PrimaryView::Board => "Board".to_string(),
                PrimaryView::List => "List".to_string(),
            },
            mode: format!("{:?}", self.mode),
            spec_count: self.specs.len(),
            filtered_count: if self.tree_mode {
                self.tree_rows.len()
            } else {
                self.filtered_specs.len()
            },
            sort: self.sort_option.label(),
            search_query: self.search_query.clone(),
            selected_path: self.selected_detail.as_ref().map(|s| s.id.clone()),
            board_groups: self
                .board_groups
                .iter()
                .map(|g| BoardGroupDebug {
                    status: g.value.clone(),
                    count: g.indices.len(),
                    collapsed: g.collapsed,
                })
                .collect(),
            tree_mode: self.tree_mode,
            sidebar_collapsed: self.sidebar_collapsed,
        }
    }

    /// Create an empty App for testing (no adapter I/O needed).
    ///
    /// Uses an in-memory markdown adapter pointed at a non-existent directory;
    /// `list()` returns an empty vec so no files are touched.
    #[cfg(test)]
    pub fn empty_for_test() -> Self {
        use leanspec_core::adapters::markdown::MarkdownAdapter;
        let adapter: Box<dyn Adapter> = Box::new(MarkdownAdapter::new("/nonexistent-tui-test"));
        let mut schema = adapter.schema().clone();
        let _ = adapter.resolve_schema(&mut schema);
        let status_key = schema
            .key_for_semantic(semantic::STATUS)
            .map(|k| k.to_string());
        let priority_key = schema
            .key_for_semantic(semantic::PRIORITY)
            .map(|k| k.to_string());
        let filter = FilterState::from_schema(&schema);
        App {
            adapter,
            schema,
            status_key,
            priority_key,
            specs: Vec::new(),
            filtered_specs: Vec::new(),
            selected_detail: None,
            selected_body: String::new(),
            board_groups: Vec::new(),
            deps: DepsIndex::default(),
            mode: AppMode::Normal,
            primary_view: PrimaryView::List,
            focus: FocusPane::Left,
            detail_mode: DetailMode::Content,
            should_quit: false,
            board_group_idx: 0,
            board_item_idx: 0,
            list_selected: 0,
            list_scroll_offset: 0,
            detail_scroll: 0,
            detail_content_lines: u16::MAX,
            search_query: String::new(),
            search_results: Vec::new(),
            sidebar_width_pct: 30,
            sidebar_collapsed: false,
            drag_resize: false,
            layout_left: Rect::default(),
            layout_right: Rect::default(),
            last_frame_width: 0,
            last_frame_height: 0,
            sort_option: SortOption::default(),
            filter,
            filter_cursor: 0,
            tree_mode: false,
            tree_collapsed: HashSet::new(),
            tree_rows: Vec::new(),
            detail_toc: Vec::new(),
            toc_selected: 0,
            current_project: None,
            project_switcher: None,
            project_mgmt: None,
        }
    }
}

/// Pull the body content out of a doc. Prefers the `content` section field
/// (markdown adapter), falling back to concatenating section fields for
/// remote adapters.
pub fn body_content(doc: &SpecDoc, schema: &SpecSchema) -> String {
    if let Some(s) = doc.field_str("content") {
        return s.to_string();
    }
    use leanspec_core::model::FieldDisplay;
    let mut parts: Vec<String> = Vec::new();
    for field in &schema.fields {
        if field.display == FieldDisplay::Section {
            if let Some(s) = doc.fields.get(&field.key).and_then(|v| v.as_str()) {
                if !s.is_empty() {
                    parts.push(format!("## {}\n\n{}", field.label, s));
                }
            }
        }
    }
    parts.join("\n\n")
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
        assert_eq!(app.primary_view, PrimaryView::List);

        app.set_board_view();
        assert_eq!(app.primary_view, PrimaryView::Board);

        app.set_list_view();
        assert_eq!(app.primary_view, PrimaryView::List);
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
    fn test_filter_toggle_updates_fields() {
        let mut app = make_test_app();
        // Markdown schema has both status and priority — entries are populated.
        let entries = app.filter_entries();
        assert!(!entries.is_empty(), "schema should expose filter entries");

        // Default state pre-populates every enum value, so the first toggle
        // deselects it; the second re-selects.
        let (key, value) = entries[0].clone();
        assert!(app.filter.is_selected(&key, &value));

        app.filter_cursor = 0;
        app.filter_toggle_current();
        assert!(!app.filter.is_selected(&key, &value));

        app.filter_toggle_current();
        assert!(app.filter.is_selected(&key, &value));
    }

    #[test]
    fn test_sort_cycles_with_priority() {
        let mut app = make_test_app();
        assert_eq!(app.sort_option, SortOption::IdDesc);

        app.cycle_sort();
        assert_eq!(app.sort_option, SortOption::IdAsc);

        app.cycle_sort();
        // Markdown schema declares a priority field, so cycle lands there.
        assert!(matches!(app.sort_option, SortOption::FieldDesc(_)));
    }

    #[test]
    fn test_sidebar_widen_narrow() {
        let mut app = make_test_app();
        assert_eq!(app.sidebar_width_pct, 30);

        app.sidebar_widen();
        assert_eq!(app.sidebar_width_pct, 35);

        for _ in 0..10 {
            app.sidebar_widen();
        }
        assert_eq!(app.sidebar_width_pct, 60);

        for _ in 0..20 {
            app.sidebar_narrow();
        }
        assert_eq!(app.sidebar_width_pct, 15);
    }

    #[test]
    fn test_filter_state_matches_hides_archived() {
        use leanspec_core::model::FieldValue;
        let mut filter = FilterState {
            hide_archived: true,
            ..FilterState::default()
        };
        let mut doc = SpecDoc {
            id: "1".into(),
            title: "x".into(),
            schema_id: "y".into(),
            fields: HashMap::new(),
            links: vec![],
            created_at: None,
            updated_at: None,
            url: None,
            raw: None,
        };
        doc.fields
            .insert("status".into(), FieldValue::String("archived".into()));
        assert!(!filter.matches(&doc, Some("status")));

        filter.hide_archived = false;
        assert!(filter.matches(&doc, Some("status")));
    }
}
