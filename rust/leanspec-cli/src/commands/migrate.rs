//! `migrate` command — two modes:
//!
//! 1. **Cross-adapter migration** (`--to <adapter>`): move specs from the
//!    currently configured adapter to another backend (typically markdown →
//!    GitHub Issues / ADO / Jira). Fields are mapped via semantic hints so
//!    `status` / `priority` / `tags` survive even when target keys differ.
//!
//! 2. **Legacy import** (`<input_path>`): scan a directory of spec-kit /
//!    OpenSpec markdown and copy it into the project's `specs/` directory.
//!    Markdown-only; refuses to run on non-markdown projects.

use colored::Colorize;
use leanspec_core::adapters::{
    AdapterConfig, AdapterRegistry, CreateRequest, FieldValue, ListFilter, SpecDoc, SpecSchema,
};
use leanspec_core::model::semantic;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

use super::shared::require_markdown_project;

pub struct MigrateParams {
    pub specs_dir: String,
    pub input_path: Option<String>,
    pub to_adapter: Option<String>,
    pub to_config: Option<String>,
    pub keep_source: bool,
    pub delete_source: bool,
    pub limit: Option<usize>,
    pub filter_status: Option<String>,
    pub auto: bool,
    pub ai_provider: Option<String>,
    pub dry_run: bool,
    /// Reserved for future legacy-importer batching; accepted on the CLI today.
    #[allow(dead_code)]
    pub batch_size: Option<usize>,
    /// Reserved for future legacy-importer validation; accepted on the CLI today.
    #[allow(dead_code)]
    pub skip_validation: bool,
    /// Reserved for future legacy-importer backfill hook; accepted on the CLI today.
    #[allow(dead_code)]
    pub backfill: bool,
    /// Reserved for future structured-output mode; accepted on the CLI today.
    #[allow(dead_code)]
    pub output_format: String,
}

pub fn run(params: MigrateParams) -> Result<(), Box<dyn Error>> {
    match (&params.to_adapter, &params.input_path) {
        (Some(_), Some(_)) => Err("`migrate` accepts either `--to <adapter>` for \
             cross-adapter migration or an input path for legacy import — not both.\n\
             Run `leanspec migrate --help` for details."
            .into()),
        (Some(target), None) => run_cross_adapter(target.clone(), params),
        (None, Some(path)) => run_legacy_import(path.clone(), params),
        (None, None) => Err("`migrate` needs either `--to <adapter>` for \
             cross-adapter migration or an input path for legacy import.\n\
             Run `leanspec migrate --help` for details."
            .into()),
    }
}

// ──────────────────────────── cross-adapter ────────────────────────────

const MIGRATED_TO_KEY: &str = "migrated_to";
const MIGRATED_DIR: &str = "_migrated";
const MIGRATION_MAP_FILE: &str = ".migration-map.json";

const SEMANTIC_TRANSFERS: &[&str] = &[
    semantic::STATUS,
    semantic::PRIORITY,
    semantic::TAGS,
    semantic::ASSIGNEE,
    semantic::REVIEWER,
    semantic::DUE_DATE,
];

fn run_cross_adapter(target_name: String, params: MigrateParams) -> Result<(), Box<dyn Error>> {
    // Source: the project's currently configured adapter. For now we only
    // support cross-adapter migration *from* markdown — archive / delete /
    // keep all operate on markdown frontmatter. Other source adapters can
    // come in a follow-up spec.
    require_markdown_project("migrate --to")?;
    let source_config = AdapterRegistry::project_config()?;
    let source = AdapterRegistry::create(&source_config)?;

    // Target: load adapter config for `--to <name>`.
    let target_config = load_target_config(&target_name, params.to_config.as_deref())?;
    if target_config.adapter != target_name {
        return Err(format!(
            "Target config declares adapter '{}' but --to is '{}'.",
            target_config.adapter, target_name
        )
        .into());
    }
    let target = AdapterRegistry::create(&target_config)?;

    let source_caps = source.capabilities().clone();
    let target_caps = target.capabilities().clone();

    println!(
        "Migrating specs: {} → {}",
        source_caps.name.cyan(),
        target_caps.name.green(),
    );
    if params.dry_run {
        println!("{}", "DRY RUN — no changes will be made.".yellow().bold());
    }
    println!();

    // List source docs, skip those already migrated.
    //
    // The markdown adapter doesn't currently project custom frontmatter keys
    // into `SpecDoc.fields`, so a quick `contains_key("migrated_to")` check
    // is unreliable. Read the actual frontmatter from the spec's file (via
    // `raw.file_path` recorded by the markdown adapter) and check there.
    let mut docs = source.list(&ListFilter::default())?;
    docs.retain(|d| !source_doc_is_migrated(d));
    if let Some(status) = &params.filter_status {
        let status_key = source.schema().key_for_semantic(semantic::STATUS);
        if let Some(key) = status_key {
            docs.retain(|d| d.fields.get(key).and_then(|v| v.as_str()) == Some(status.as_str()));
        }
    }
    if let Some(limit) = params.limit {
        docs.truncate(limit);
    }

    if docs.is_empty() {
        println!("{}", "Nothing to migrate.".cyan());
        return Ok(());
    }

    let total = docs.len();
    println!(
        "Found {} spec{} to migrate.\n",
        total,
        if total == 1 { "" } else { "s" }
    );

    let source_schema = source.schema().clone();
    let target_schema = target.schema().clone();

    // Track which fields get dropped (no target key) for the summary at the end.
    let mut dropped_fields: BTreeMap<String, usize> = BTreeMap::new();
    let mut mappings: BTreeMap<String, String> = BTreeMap::new();
    let mut failures: Vec<(String, String)> = Vec::new();
    let mut migrated_count = 0usize;

    let width = total.to_string().len();
    for (idx, doc) in docs.iter().enumerate() {
        let req = build_create_request(doc, &source_schema, &target_schema, &mut dropped_fields);
        let prefix = format!("[{:>w$}/{}] {}", idx + 1, total, doc.id, w = width);

        if params.dry_run {
            describe_dry_run(&prefix, doc, &req, &source_schema, &target_schema);
            continue;
        }

        match target.create(&req) {
            Ok(created) => {
                let target_id = format!("{}:{}", target_caps.name, created.id);
                println!(
                    "  {} → {} {}",
                    prefix,
                    target_id.green(),
                    "✓".green().bold()
                );
                mappings.insert(doc.id.clone(), target_id.clone());
                migrated_count += 1;

                if let Err(err) = finalize_source(
                    doc,
                    &target_id,
                    params.keep_source,
                    params.delete_source,
                    Path::new(&params.specs_dir),
                ) {
                    eprintln!(
                        "    {} could not update source for {}: {}",
                        "warning:".yellow(),
                        doc.id,
                        err
                    );
                }
            }
            Err(err) => {
                println!(
                    "  {} → {} {}",
                    prefix,
                    "FAILED".red().bold(),
                    err.to_string().red()
                );
                failures.push((doc.id.clone(), err.to_string()));
            }
        }
    }

    println!();

    if params.dry_run {
        print_dry_run_summary(total, &dropped_fields, &target_caps.name);
        return Ok(());
    }

    println!(
        "Results: {} migrated, {} failed.",
        format!("{}", migrated_count).green(),
        if failures.is_empty() {
            "0".to_string()
        } else {
            format!("{}", failures.len()).red().to_string()
        }
    );

    if !mappings.is_empty() {
        let map_path =
            write_migration_map(Path::new(&params.specs_dir), &target_caps.name, &mappings)?;
        println!("Wrote ID mapping: {}", map_path.display());
    }

    if !failures.is_empty() {
        println!("\n{}", "Failed specs:".red().bold());
        for (id, err) in &failures {
            println!("  {}: {}", id, err);
        }
        return Err(format!("{} specs failed to migrate", failures.len()).into());
    }

    Ok(())
}

fn build_create_request(
    doc: &SpecDoc,
    source_schema: &SpecSchema,
    target_schema: &SpecSchema,
    dropped: &mut BTreeMap<String, usize>,
) -> CreateRequest {
    let mut fields: HashMap<String, FieldValue> = HashMap::new();

    let mut transferred_keys: BTreeSet<String> = BTreeSet::new();

    for semantic in SEMANTIC_TRANSFERS {
        let source_key = source_schema.key_for_semantic(semantic);
        let target_key = target_schema.key_for_semantic(semantic);
        match (source_key, target_key) {
            (Some(sk), Some(tk)) => {
                if let Some(value) = doc.fields.get(sk) {
                    fields.insert(tk.to_string(), value.clone());
                    transferred_keys.insert(sk.to_string());
                }
            }
            (Some(sk), None) if doc.fields.contains_key(sk) => {
                *dropped.entry((*semantic).to_string()).or_insert(0) += 1;
                transferred_keys.insert(sk.to_string());
            }
            _ => {}
        }
    }

    // Always transfer body content (key is "content" across all built-in
    // adapters). The migrate tracker for the source still records it as a
    // transferred key so we don't double-count it as dropped.
    if let Some(content) = doc.fields.get("content") {
        fields.insert("content".to_string(), content.clone());
        transferred_keys.insert("content".to_string());
    }

    // Anything left in the source doc that didn't match a semantic hint and
    // isn't directly named in the target schema is dropped silently — track
    // it for the dry-run report.
    for key in doc.fields.keys() {
        if transferred_keys.contains(key) {
            continue;
        }
        if target_schema.field(key).is_some() {
            // Same-named field exists on the target — pass it through.
            if let Some(value) = doc.fields.get(key) {
                fields.insert(key.clone(), value.clone());
                transferred_keys.insert(key.clone());
            }
        } else {
            *dropped.entry(key.clone()).or_insert(0) += 1;
        }
    }

    CreateRequest {
        slug: Some(doc.id.clone()),
        title: doc.title.clone(),
        schema_id: None,
        fields,
        links: Vec::new(),
    }
}

fn describe_dry_run(
    prefix: &str,
    doc: &SpecDoc,
    req: &CreateRequest,
    source_schema: &SpecSchema,
    target_schema: &SpecSchema,
) {
    println!("  {} {} (title: {:?})", prefix, "→".cyan(), doc.title);
    for semantic in SEMANTIC_TRANSFERS {
        let source_key = source_schema.key_for_semantic(semantic);
        let target_key = target_schema.key_for_semantic(semantic);
        match (source_key, target_key) {
            (Some(sk), Some(tk)) => {
                if let Some(value) = doc.fields.get(sk) {
                    println!(
                        "      {} {}: {} → {} {}",
                        "✓".green(),
                        semantic,
                        format_value(value),
                        tk,
                        if req.fields.contains_key(tk) {
                            ""
                        } else {
                            "(no-op)"
                        }
                    );
                }
            }
            (Some(sk), None) if doc.fields.contains_key(sk) => {
                println!("      {} {}: DROPPED (no target key)", "✗".red(), semantic);
            }
            _ => {}
        }
    }
    if let Some(content) = doc.fields.get("content").and_then(|v| v.as_str()) {
        println!(
            "      {} content: preserved ({} bytes)",
            "✓".green(),
            content.len()
        );
    }
}

fn print_dry_run_summary(total: usize, dropped: &BTreeMap<String, usize>, target_name: &str) {
    println!(
        "Would migrate {} spec{}.",
        total,
        if total == 1 { "" } else { "s" }
    );
    if !dropped.is_empty() {
        println!("\n{}", "Field drop summary:".yellow().bold());
        for (field, count) in dropped {
            println!(
                "  {}: {} spec{} affected",
                field,
                count,
                if *count == 1 { "" } else { "s" }
            );
        }
        println!(
            "\n  Tip: create the missing fields on the {} backend to preserve them.",
            target_name
        );
    }
}

fn format_value(value: &FieldValue) -> String {
    match value {
        FieldValue::String(s) => s.clone(),
        FieldValue::Strings(v) => v.join(", "),
        FieldValue::Bool(b) => b.to_string(),
        FieldValue::Number(n) => n.to_string(),
        FieldValue::Timestamp(t) => t.to_rfc3339(),
        FieldValue::Checklist(items) => format!("[{} items]", items.len()),
        FieldValue::References(refs) => format!("[{} refs]", refs.len()),
    }
}

fn load_target_config(
    name: &str,
    explicit_path: Option<&str>,
) -> Result<AdapterConfig, Box<dyn Error>> {
    if let Some(path) = explicit_path {
        let p = Path::new(path);
        if !p.exists() {
            return Err(format!("target config not found: {}", path).into());
        }
        return Ok(AdapterRegistry::load_config(p)?);
    }

    let candidates = [
        format!("leanspec.adapter.{name}.yaml"),
        format!(".lean-spec/adapter.{name}.yaml"),
    ];
    for candidate in &candidates {
        let p = Path::new(candidate);
        if p.exists() {
            return Ok(AdapterRegistry::load_config(p)?);
        }
    }
    Err(format!(
        "No config found for target adapter '{name}'.\n\
         Create one at `leanspec.adapter.{name}.yaml` (or pass `--to-config <path>`).\n\
         Example for github:\n\
         \n\
             adapter: github\n\
             owner: your-org\n\
             repo: your-repo\n"
    )
    .into())
}

/// Read the README path the markdown adapter stashed in `SpecDoc.raw`.
///
/// `doc.id` is only the leaf directory name and is ambiguous for sub-specs,
/// so the adapter records the full file path in the `raw` payload. We rely
/// on that rather than reconstructing the path from `specs_dir + id`.
fn doc_readme_path(doc: &SpecDoc) -> Option<PathBuf> {
    doc.raw
        .as_ref()?
        .get("file_path")?
        .as_str()
        .map(PathBuf::from)
}

/// `true` if the source spec already carries a `migrated_to:` annotation.
///
/// The markdown adapter does not project custom frontmatter keys into
/// `SpecDoc.fields`, so we re-read the README and parse the frontmatter
/// here. Any unreadable / malformed file is treated as "not migrated" so
/// the user can re-run after fixing the file.
fn source_doc_is_migrated(doc: &SpecDoc) -> bool {
    let Some(path) = doc_readme_path(doc) else {
        return false;
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return false;
    };
    let (Some(fm), _) = leanspec_core::split_frontmatter(&raw) else {
        return false;
    };
    fm.lines().any(|line| {
        line.split_once(':')
            .map(|(k, _)| k.trim() == MIGRATED_TO_KEY)
            .unwrap_or(false)
    })
}

fn finalize_source(
    doc: &SpecDoc,
    target_id: &str,
    keep_source: bool,
    delete_source: bool,
    specs_dir: &Path,
) -> Result<(), Box<dyn Error>> {
    let readme_path = doc_readme_path(doc).ok_or_else(|| -> Box<dyn Error> {
        "markdown adapter did not report a file path for this spec".into()
    })?;
    let spec_dir = readme_path
        .parent()
        .ok_or_else(|| -> Box<dyn Error> {
            format!(
                "could not derive spec directory from {}",
                readme_path.display()
            )
            .into()
        })?
        .to_path_buf();

    if delete_source {
        if spec_dir.exists() {
            fs::remove_dir_all(&spec_dir)?;
        }
        return Ok(());
    }

    if !readme_path.exists() {
        return Err(format!("source file not found: {}", readme_path.display()).into());
    }
    annotate_migrated_to(&readme_path, target_id)?;

    if keep_source {
        return Ok(());
    }

    // Default: archive — move the spec directory under `_migrated/`. Place
    // the archive at `<specs_dir>/_migrated/<relative-to-specs_dir>` so the
    // sub-spec layout (`parent/child/`) is preserved.
    let rel = spec_dir.strip_prefix(specs_dir).unwrap_or_else(|_| {
        // Fall back to the leaf directory name if the spec isn't under
        // `specs_dir` for some reason (shouldn't happen in practice).
        Path::new(spec_dir.file_name().unwrap_or_default())
    });
    let dest = specs_dir.join(MIGRATED_DIR).join(rel);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }
    if dest.exists() {
        fs::remove_dir_all(&dest)?;
    }
    fs::rename(&spec_dir, &dest)?;
    Ok(())
}

fn annotate_migrated_to(readme_path: &Path, target_id: &str) -> Result<(), Box<dyn Error>> {
    let raw = fs::read_to_string(readme_path)?;
    let updated = insert_frontmatter_field(&raw, MIGRATED_TO_KEY, target_id)?;
    fs::write(readme_path, updated)?;
    Ok(())
}

/// Insert (or update) a top-level scalar field in a YAML frontmatter block.
///
/// Operates as a textual edit so it doesn't depend on the markdown adapter's
/// full frontmatter struct, which doesn't model `migrated_to` natively.
/// Delimits frontmatter the same way [`leanspec_core::split_frontmatter`]
/// does, so files that end with `---` at EOF or with trailing whitespace
/// after the closing fence still parse.
fn insert_frontmatter_field(raw: &str, key: &str, value: &str) -> Result<String, Box<dyn Error>> {
    let (Some(fm_block), body) = leanspec_core::split_frontmatter(raw) else {
        return Err("source file has no YAML frontmatter".into());
    };

    // `fm_block` looks like `---\n<inner>\n---` (possibly with trailing space
    // before the final newline). Strip the fences so we can edit the inner
    // YAML and rebuild deterministically.
    let inner = fm_block
        .strip_prefix("---\n")
        .and_then(|s| s.trim_end_matches('\n').strip_suffix("---"))
        .map(str::trim_end)
        .ok_or_else(|| -> Box<dyn Error> { "malformed frontmatter fences".into() })?;

    let new_line = format!("{key}: {value}");
    let mut found = false;
    let mut new_fm_lines: Vec<String> = Vec::new();
    for line in inner.lines() {
        if let Some((existing_key, _)) = line.split_once(':') {
            if existing_key.trim() == key {
                new_fm_lines.push(new_line.clone());
                found = true;
                continue;
            }
        }
        new_fm_lines.push(line.to_string());
    }
    if !found {
        new_fm_lines.push(new_line);
    }
    let new_fm = new_fm_lines.join("\n");
    let body_trimmed = body.trim_start_matches('\n');
    Ok(format!("---\n{new_fm}\n---\n\n{body_trimmed}"))
}

fn write_migration_map(
    specs_dir: &Path,
    target_adapter: &str,
    mappings: &BTreeMap<String, String>,
) -> Result<PathBuf, Box<dyn Error>> {
    fs::create_dir_all(specs_dir)?;
    let path = specs_dir.join(MIGRATION_MAP_FILE);

    // If a prior `.migration-map.json` exists but doesn't parse as a JSON
    // object — including the corrupted-by-hand case — preserve the user's
    // file by writing a sibling backup, then start fresh. We never silently
    // overwrite an unexpected shape.
    let mut existing: serde_json::Value = serde_json::json!({});
    if path.exists() {
        let raw = fs::read_to_string(&path)?;
        match serde_json::from_str::<serde_json::Value>(&raw) {
            Ok(value) if value.is_object() => existing = value,
            _ => {
                let backup = path.with_extension("json.bak");
                fs::write(&backup, &raw)?;
                eprintln!(
                    "  {} existing migration map at {} was not a JSON object; \
                     backed it up to {} and starting fresh.",
                    "warning:".yellow(),
                    path.display(),
                    backup.display(),
                );
            }
        }
    }
    let existing_obj = existing
        .as_object_mut()
        .expect("existing was just narrowed to a JSON object above");
    existing_obj.insert(
        "adapter".into(),
        serde_json::Value::String(target_adapter.into()),
    );
    existing_obj.insert(
        "migrated_at".into(),
        serde_json::Value::String(chrono::Utc::now().to_rfc3339()),
    );
    let mappings_value = existing_obj
        .entry("mappings".to_string())
        .or_insert_with(|| serde_json::Value::Object(Default::default()));
    let mappings_obj = mappings_value
        .as_object_mut()
        .ok_or("migration map `mappings` is not an object")?;
    for (k, v) in mappings {
        mappings_obj.insert(k.clone(), serde_json::Value::String(v.clone()));
    }

    fs::write(&path, serde_json::to_string_pretty(&existing)? + "\n")?;
    Ok(path)
}

// ──────────────────────────── legacy import ────────────────────────────

#[allow(dead_code)]
struct DocumentInfo {
    path: String,
    name: String,
    size: u64,
}

fn run_legacy_import(input_path: String, params: MigrateParams) -> Result<(), Box<dyn Error>> {
    // The importer copies external markdown files into the project's local
    // `specs/` tree. That only makes sense on markdown projects.
    require_markdown_project("migrate")?;

    let input = Path::new(&input_path);
    if !input.exists() || !input.is_dir() {
        return Err(format!("Path not found or not a directory: {}", input_path).into());
    }

    println!("{} {}\n", "Scanning:".cyan(), input_path);

    let documents = scan_documents(input)?;

    if documents.is_empty() {
        return Err(format!("No documents found in {}", input_path).into());
    }

    println!(
        "{} Found {} document{}\n",
        "✓".green(),
        documents.len(),
        if documents.len() == 1 { "" } else { "s" }
    );

    let format = detect_source_format(&documents);
    println!("{} {}\n", "Detected format:".cyan(), format);

    if params.auto {
        return migrate_auto(&params.specs_dir, &documents, &format, params.dry_run);
    }

    if let Some(provider) = params.ai_provider {
        return migrate_with_ai(&input_path, &documents, &provider);
    }

    output_manual_instructions(&input_path, &documents, &params.specs_dir, &format);
    Ok(())
}

fn scan_documents(dir: &Path) -> Result<Vec<DocumentInfo>, Box<dyn Error>> {
    let mut documents = Vec::new();
    scan_recursive(dir, &mut documents)?;
    Ok(documents)
}

fn scan_recursive(dir: &Path, documents: &mut Vec<DocumentInfo>) -> Result<(), Box<dyn Error>> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') || name == "node_modules" {
            continue;
        }

        if path.is_dir() {
            scan_recursive(&path, documents)?;
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext == "md" || ext == "markdown" {
                let metadata = fs::metadata(&path)?;
                documents.push(DocumentInfo {
                    path: path.to_string_lossy().to_string(),
                    name,
                    size: metadata.len(),
                });
            }
        }
    }

    Ok(())
}

fn detect_source_format(documents: &[DocumentInfo]) -> String {
    let has_spec_kit = documents
        .iter()
        .any(|d| d.path.contains(".specify") || d.name == "spec.md");
    if has_spec_kit {
        return "spec-kit".to_string();
    }

    let has_openspec = documents.iter().any(|d| d.path.contains("openspec/"));
    if has_openspec {
        return "openspec".to_string();
    }

    "generic".to_string()
}

fn migrate_auto(
    specs_dir: &str,
    documents: &[DocumentInfo],
    format: &str,
    dry_run: bool,
) -> Result<(), Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    println!("{}", "═".repeat(70));
    println!("{}", "🚀 Auto Migration".cyan().bold());
    println!("{}", "═".repeat(70));
    println!();

    if dry_run {
        println!("{}", "⚠️  DRY RUN - No changes will be made".yellow());
        println!();
    }

    if !dry_run {
        fs::create_dir_all(specs_path)?;
    }

    let mut next_seq = get_next_spec_number(specs_dir)?;

    let mut migrated_count = 0;
    let skipped_count = 0;

    println!("{}\n", format!("Migrating {} format...", format).cyan());

    for doc in documents {
        let doc_path = Path::new(&doc.path);
        let parent_name = doc_path
            .parent()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| doc.name.replace(".md", ""));

        if ["specs", "archive", "changes", "openspec", "node_modules"]
            .contains(&parent_name.as_str())
        {
            continue;
        }

        let target_name = format!("{:03}-{}", next_seq, normalize_name(&parent_name));
        let target_dir = specs_path.join(&target_name);

        if dry_run {
            println!("  {} {} → {}/", "→".cyan(), doc.name, target_name);
        } else {
            fs::create_dir_all(&target_dir)?;

            let target_file = if doc.name == "spec.md" || doc.name == "README.md" {
                target_dir.join("README.md")
            } else {
                target_dir.join(&doc.name)
            };

            fs::copy(&doc.path, &target_file)?;

            println!("  {} {} → {}/", "✓".green(), doc.name, target_name);
        }

        migrated_count += 1;
        next_seq += 1;
    }

    println!();
    println!("{}", "═".repeat(70));
    println!("{}", "✓ Migration complete!".green());
    println!("  Migrated: {} specs", migrated_count);
    if skipped_count > 0 {
        println!("  Skipped: {} files", skipped_count);
    }
    println!("{}", "═".repeat(70));
    println!();
    println!("Next steps:");
    println!("  {}      # View your specs", "lean-spec board".cyan());
    println!("  {}   # Check for issues", "lean-spec validate".cyan());

    Ok(())
}

fn migrate_with_ai(
    _input_path: &str,
    _documents: &[DocumentInfo],
    provider: &str,
) -> Result<(), Box<dyn Error>> {
    if !["copilot", "claude", "gemini"].contains(&provider) {
        return Err(format!(
            "Invalid AI provider: {}. Use: copilot, claude, or gemini",
            provider
        )
        .into());
    }

    println!("{} {}\n", "🤖 AI-Assisted Migration:".cyan(), provider);

    println!(
        "{}",
        "⚠ AI-assisted migration is not yet fully implemented".yellow()
    );
    println!("  This feature will automatically execute migration via AI CLI tools.");
    println!();
    println!("  For now, use {} for auto migration.", "--auto".cyan());
    println!();

    Ok(())
}

fn output_manual_instructions(
    input_path: &str,
    documents: &[DocumentInfo],
    _specs_dir: &str,
    format: &str,
) {
    println!("{}", "═".repeat(70));
    println!("{}", "📋 LeanSpec Migration Instructions".cyan().bold());
    println!("{}", "═".repeat(70));
    println!();
    println!("{}", "Source Location:".bold());
    println!("  {} ({} documents found)", input_path, documents.len());
    println!("  Detected format: {}", format);
    println!();
    println!("{}", "💡 Quick Option:".bold());
    println!(
        "  {}",
        format!("lean-spec migrate {} --auto", input_path).cyan()
    );
    println!("  This will automatically restructure in one shot.");
    println!();
    println!("{}", "Manual Migration Steps:".bold());
    println!();
    println!("1. For each document, create a spec:");
    println!("   {}", "lean-spec create <name>".cyan());
    println!();
    println!("2. Set metadata (NEVER edit frontmatter manually):");
    println!("   {}", "lean-spec update <name> --status <status>".cyan());
    println!(
        "   {}",
        "lean-spec update <name> --priority <priority>".cyan()
    );
    println!();
    println!("3. Copy content and map sections:");
    println!("   - Overview: Problem statement and context");
    println!("   - Design: Technical approach");
    println!("   - Plan: Implementation steps");
    println!("   - Test: Validation criteria");
    println!();
    println!("4. After migration, validate:");
    println!("   {}", "lean-spec validate".cyan());
    println!("   {}", "lean-spec board".cyan());
    println!();
    println!("{}", "─".repeat(70));
    println!();
    println!(
        "{} Use {} for automated migration",
        "ℹ".cyan(),
        "--auto".cyan()
    );
    println!();
}

fn get_next_spec_number(specs_dir: &str) -> Result<u32, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    if !specs_path.exists() {
        return Ok(1);
    }

    let mut max_number = 0u32;

    for entry in fs::read_dir(specs_path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            if let Some(num_str) = name_str.split('-').next() {
                if let Ok(num) = num_str.parse::<u32>() {
                    max_number = max_number.max(num);
                }
            }
        }
    }

    Ok(max_number + 1)
}

fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' {
                c
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_frontmatter_appends_new_field() {
        let raw = "---\nstatus: planned\ncreated: '2026-05-01'\n---\n\n# Title\n";
        let out = insert_frontmatter_field(raw, "migrated_to", "github:123").unwrap();
        assert!(out.contains("migrated_to: github:123"));
        assert!(out.starts_with("---\n"));
        assert!(out.contains("# Title"));
    }

    #[test]
    fn insert_frontmatter_replaces_existing_field() {
        let raw = "---\nstatus: planned\nmigrated_to: github:1\n---\n\n# x\n";
        let out = insert_frontmatter_field(raw, "migrated_to", "github:999").unwrap();
        assert!(out.contains("migrated_to: github:999"));
        assert!(!out.contains("github:1\n"));
    }

    #[test]
    fn insert_frontmatter_rejects_missing_block() {
        let raw = "# no frontmatter\n";
        assert!(insert_frontmatter_field(raw, "migrated_to", "x").is_err());
    }

    #[test]
    fn insert_frontmatter_handles_trailing_space_terminator() {
        // The shared split_frontmatter regex allows whitespace before the
        // newline after the closing `---`. Make sure we do too — the markdown
        // adapter happily parses these and we must not refuse to annotate them.
        let raw = "---\nstatus: planned\n---  \n\n# Title\n";
        let out = insert_frontmatter_field(raw, "migrated_to", "github:7").unwrap();
        assert!(out.contains("migrated_to: github:7"));
        assert!(out.contains("# Title"));
    }
}
