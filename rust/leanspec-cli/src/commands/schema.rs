//! `schema` command — list, inspect, and validate schemas.

use colored::Colorize;
use leanspec_core::model::{FieldDisplay, FieldKind};
use leanspec_core::{validate_schema_file, SchemaRegistry};
use std::error::Error;
use std::path::{Path, PathBuf};

pub fn list(output: &str) -> Result<(), Box<dyn Error>> {
    let registry = load_registry()?;
    let schemas = registry.list_raw();

    if output == "json" {
        let payload: Vec<_> = schemas
            .iter()
            .map(|s| {
                serde_json::json!({
                    "id": s.id,
                    "name": s.name,
                    "extends": s.extends,
                    "field_count": s.fields.len(),
                    "builtin": SchemaRegistry::is_builtin(&s.id),
                })
            })
            .collect();
        println!("{}", serde_json::to_string_pretty(&payload)?);
        return Ok(());
    }

    let (builtin, custom): (Vec<_>, Vec<_>) = schemas
        .into_iter()
        .partition(|s| SchemaRegistry::is_builtin(&s.id));

    let max_id = builtin
        .iter()
        .chain(custom.iter())
        .map(|s| s.id.len())
        .max()
        .unwrap_or(20);
    let max_name = builtin
        .iter()
        .chain(custom.iter())
        .map(|s| s.name.len())
        .max()
        .unwrap_or(12);

    if !builtin.is_empty() {
        println!("{}", "Built-in:".bold());
        for s in &builtin {
            print_schema_row(s, max_id, max_name);
        }
    }
    if !custom.is_empty() {
        if !builtin.is_empty() {
            println!();
        }
        println!("{}", "Custom (.lean-spec/schemas/):".bold());
        for s in &custom {
            print_schema_row(s, max_id, max_name);
        }
    }

    for warning in registry.warnings() {
        eprintln!("{} {}", "warning:".yellow().bold(), warning);
    }

    Ok(())
}

fn print_schema_row(schema: &leanspec_core::SpecSchema, max_id: usize, max_name: usize) {
    let extends = schema
        .extends
        .as_deref()
        .map(|p| format!(" (extends {})", p))
        .unwrap_or_default();
    println!(
        "  {:id_w$}  {:name_w$}  {} fields{}",
        schema.id.cyan(),
        schema.name,
        schema.fields.len(),
        extends.dimmed(),
        id_w = max_id,
        name_w = max_name,
    );
}

pub fn show(id: &str, output: &str) -> Result<(), Box<dyn Error>> {
    let registry = load_registry()?;
    let schema = registry.get(id)?;
    let raw_extends = registry.get_raw(id).ok().and_then(|s| s.extends.clone());

    if output == "json" {
        println!("{}", serde_json::to_string_pretty(&schema)?);
        return Ok(());
    }

    let extends_tag = raw_extends
        .map(|p| format!(" (extends {})", p))
        .unwrap_or_default();
    println!(
        "{} {}{}",
        "Schema:".bold(),
        schema.id.cyan(),
        extends_tag.dimmed()
    );
    println!("  {} {}", "Name:".bold(), schema.name);
    println!();

    let inline: Vec<_> = schema
        .fields
        .iter()
        .filter(|f| matches!(f.display, FieldDisplay::Inline))
        .collect();
    let sections: Vec<_> = schema
        .fields
        .iter()
        .filter(|f| matches!(f.display, FieldDisplay::Section))
        .collect();

    if !inline.is_empty() {
        println!("{}", "Fields (inline):".bold());
        for f in &inline {
            print_field_row(f);
        }
    }
    if !sections.is_empty() {
        if !inline.is_empty() {
            println!();
        }
        println!("{}", "Fields (section):".bold());
        for f in &sections {
            print_field_row(f);
        }
    }

    if !schema.link_types.is_empty() {
        println!();
        println!("{}", "Link types:".bold());
        for lt in &schema.link_types {
            let inverse = lt
                .inverse_key
                .as_deref()
                .map(|k| format!(" \u{21c4} {}", k))
                .unwrap_or_default();
            println!("  {:<14}  {}{}", lt.key.cyan(), lt.label, inverse.dimmed());
        }
    }

    Ok(())
}

fn print_field_row(field: &leanspec_core::FieldDef) {
    let kind = field_kind_label(&field.kind);
    let required = if field.required {
        " *required*".red().to_string()
    } else {
        String::new()
    };
    println!(
        "  {:<14}  {:<22}  {}{}",
        field.key.cyan(),
        field.label,
        kind,
        required,
    );
}

fn field_kind_label(kind: &FieldKind) -> String {
    match kind {
        FieldKind::Text => "text".into(),
        FieldKind::LongText => "long_text".into(),
        FieldKind::Number => "number".into(),
        FieldKind::Bool => "bool".into(),
        FieldKind::Timestamp => "timestamp".into(),
        FieldKind::Enum {
            options,
            multi,
            allow_custom,
            dynamic,
        } => {
            let values: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
            let flags = [
                multi.then_some("multi"),
                allow_custom.then_some("custom"),
                dynamic.then_some("dynamic"),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(",");
            let opts = if values.is_empty() {
                String::new()
            } else {
                format!(" [{}]", values.join(", "))
            };
            let flag_tag = if flags.is_empty() {
                String::new()
            } else {
                format!(" ({})", flags)
            };
            format!("enum{opts}{flag_tag}")
        }
        FieldKind::Checklist { traced } => {
            if *traced {
                "checklist(traced)".into()
            } else {
                "checklist".into()
            }
        }
        FieldKind::References { multi } => {
            if *multi {
                "references(multi)".into()
            } else {
                "reference".into()
            }
        }
    }
}

pub fn validate(path_str: &str, output: &str) -> Result<(), Box<dyn Error>> {
    let path = PathBuf::from(path_str);
    let registry = load_registry()?;

    println!("Validating {}...", path.display());

    let issues = match validate_schema_file(&path, &registry) {
        Ok(issues) => issues,
        Err(err) => {
            if output == "json" {
                let payload = serde_json::json!({
                    "ok": false,
                    "error": err.to_string(),
                });
                println!("{}", serde_json::to_string_pretty(&payload)?);
            } else {
                eprintln!("{} {}", "\u{2717}".red(), err);
            }
            return Err(format!("schema validation failed: {err}").into());
        }
    };

    if output == "json" {
        let payload = serde_json::json!({
            "ok": issues.is_empty(),
            "path": path.display().to_string(),
            "issues": issues.iter().map(|i| i.message.clone()).collect::<Vec<_>>(),
        });
        println!("{}", serde_json::to_string_pretty(&payload)?);
        if issues.is_empty() {
            return Ok(());
        }
        return Err(format!("{} issue(s) found", issues.len()).into());
    }

    if issues.is_empty() {
        println!("{} valid schema", "\u{2713}".green());
        return Ok(());
    }

    for issue in &issues {
        println!("{} {}", "\u{2717}".red(), issue.message);
    }
    let count = issues.len();
    Err(format!(
        "{} {} found.",
        count,
        if count == 1 { "error" } else { "errors" }
    )
    .into())
}

fn load_registry() -> Result<SchemaRegistry, Box<dyn Error>> {
    let project_root = std::env::current_dir()?;
    Ok(SchemaRegistry::load(Path::new(&project_root))?)
}
