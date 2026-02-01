//! Validate command implementation

use colored::Colorize;
use leanspec_core::{
    DependencyGraph, FrontmatterValidator, SpecLoader, StructureValidator, TokenCountValidator,
    ValidationResult,
};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: Option<String>,
    check_deps: bool,
    strict: bool,
    warnings_only: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let all_specs = loader.load_all()?;

    let specs_to_validate = if let Some(spec_path) = spec {
        let spec = loader
            .load(&spec_path)?
            .ok_or_else(|| format!("Spec not found: {}", spec_path))?;
        vec![spec]
    } else {
        all_specs.clone()
    };

    let fm_validator = FrontmatterValidator::new();
    let struct_validator = StructureValidator::new();
    let token_validator = TokenCountValidator::new();

    let spec_map: std::collections::HashMap<String, &leanspec_core::SpecInfo> =
        all_specs.iter().map(|s| (s.path.clone(), s)).collect();
    let mut children_map: std::collections::HashMap<String, Vec<&leanspec_core::SpecInfo>> =
        std::collections::HashMap::new();
    for spec in &all_specs {
        if let Some(parent) = spec.frontmatter.parent.as_deref() {
            children_map
                .entry(parent.to_string())
                .or_default()
                .push(spec);
        }
    }

    let mut all_results: Vec<ValidationResult> = Vec::new();
    let mut error_count = 0;
    let mut warning_count = 0;

    for spec in &specs_to_validate {
        let mut result = ValidationResult::new(&spec.path);

        // Run validators
        result.merge(fm_validator.validate(spec));
        result.merge(struct_validator.validate(spec));
        result.merge(token_validator.validate(spec));

        validate_parent_relationships(spec, &spec_map, &children_map, &mut result);

        // Check dependencies if requested
        if check_deps {
            validate_dependencies(spec, &all_specs, &mut result);
        }

        // Count issues
        error_count += result.errors().count();
        warning_count += result.warnings().count();

        if result.has_errors() || result.has_warnings() {
            all_results.push(result);
        }
    }

    // Output results
    if output_format == "json" {
        print_json(&all_results)?;
    } else {
        print_text(&all_results, specs_to_validate.len());
    }

    // Determine exit code
    if error_count > 0 && !warnings_only {
        Err(format!("{} error(s) found", error_count).into())
    } else if warning_count > 0 && strict {
        Err(format!("{} warning(s) found (strict mode)", warning_count).into())
    } else {
        Ok(())
    }
}

fn validate_dependencies(
    spec: &leanspec_core::SpecInfo,
    all_specs: &[leanspec_core::SpecInfo],
    result: &mut ValidationResult,
) {
    let all_paths: std::collections::HashSet<_> = all_specs.iter().map(|s| &s.path).collect();

    for dep in &spec.frontmatter.depends_on {
        if !all_paths.contains(dep) {
            result.add_warning(
                "dependencies",
                format!("References non-existent spec: {}", dep),
            );
        }
    }

    // Check for circular dependencies
    let graph = DependencyGraph::new(all_specs);
    if graph.has_circular_dependency(&spec.path) {
        result.add_error("dependencies", "Circular dependency detected");
    }
}

fn validate_parent_relationships(
    spec: &leanspec_core::SpecInfo,
    spec_map: &std::collections::HashMap<String, &leanspec_core::SpecInfo>,
    children_map: &std::collections::HashMap<String, Vec<&leanspec_core::SpecInfo>>,
    result: &mut ValidationResult,
) {
    if let Some(parent) = spec.frontmatter.parent.as_deref() {
        if parent == spec.path {
            result.add_error("parent", "Spec cannot be its own parent");
        } else if !spec_map.contains_key(parent) {
            result.add_warning("parent", format!("Parent spec not found: {}", parent));
        } else if has_parent_cycle(&spec.path, spec_map) {
            result.add_error("parent", "Circular parent relationship detected");
        }
    }

    if let Some(children) = children_map.get(&spec.path) {
        if spec.frontmatter.status == leanspec_core::SpecStatus::Complete {
            let has_incomplete_child = children.iter().any(|child| {
                child.frontmatter.status != leanspec_core::SpecStatus::Complete
                    && child.frontmatter.status != leanspec_core::SpecStatus::Archived
            });
            if has_incomplete_child {
                result.add_warning(
                    "parent",
                    "Parent marked complete while child specs are still active",
                );
            }
        }
    }
}

fn has_parent_cycle(
    spec_path: &str,
    spec_map: &std::collections::HashMap<String, &leanspec_core::SpecInfo>,
) -> bool {
    let mut seen = std::collections::HashSet::new();
    let mut current = spec_path.to_string();

    while let Some(spec) = spec_map.get(&current) {
        let Some(parent) = spec.frontmatter.parent.as_deref() else {
            return false;
        };

        if parent == spec_path {
            return true;
        }

        if !seen.insert(parent.to_string()) {
            return true;
        }

        current = parent.to_string();
    }

    false
}

fn print_json(results: &[ValidationResult]) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct JsonResult {
        spec: String,
        errors: Vec<JsonError>,
    }

    #[derive(serde::Serialize)]
    struct JsonError {
        severity: String,
        category: String,
        message: String,
        line: Option<usize>,
    }

    let output: Vec<_> = results
        .iter()
        .map(|r| JsonResult {
            spec: r.spec_path.clone(),
            errors: r
                .errors
                .iter()
                .map(|i| JsonError {
                    severity: format!("{:?}", i.severity).to_lowercase(),
                    category: i.category.clone(),
                    message: i.message.clone(),
                    line: i.line,
                })
                .collect(),
        })
        .collect();

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn print_text(results: &[ValidationResult], total_specs: usize) {
    if results.is_empty() {
        println!(
            "{} All {} specs passed validation",
            "✓".green(),
            total_specs
        );
        return;
    }

    let mut total_errors = 0;
    let mut total_warnings = 0;

    for result in results {
        let errors: Vec<_> = result.errors().collect();
        let warnings: Vec<_> = result.warnings().collect();

        if errors.is_empty() && warnings.is_empty() {
            continue;
        }

        println!();
        println!("{}", result.spec_path.cyan().bold());

        for error in &errors {
            total_errors += 1;
            let line_info = error.line.map(|l| format!(":{}", l)).unwrap_or_default();
            println!(
                "  {} [{}{}] {}",
                "✗".red(),
                error.category,
                line_info,
                error.message
            );
        }

        for warning in &warnings {
            total_warnings += 1;
            let line_info = warning.line.map(|l| format!(":{}", l)).unwrap_or_default();
            println!(
                "  {} [{}{}] {}",
                "⚠".yellow(),
                warning.category,
                line_info,
                warning.message
            );
        }
    }

    println!();
    println!(
        "{} specs validated: {} error(s), {} warning(s)",
        total_specs,
        if total_errors > 0 {
            total_errors.to_string().red()
        } else {
            "0".green()
        },
        if total_warnings > 0 {
            total_warnings.to_string().yellow()
        } else {
            "0".green()
        }
    );
}
