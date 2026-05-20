//! `leanspec crystallize` — scan the local codebase and generate agent
//! instruction files (`AGENTS.md` / `CLAUDE.md`) plus L2 skill procedures.

mod generator;
mod scanners;
mod signals;
mod writer;

use std::error::Error;
use std::path::PathBuf;

use crate::commands::crystallize::generator::render;
use crate::commands::crystallize::signals::{group_and_dedupe, Signal};
use crate::commands::crystallize::writer::apply;
use crate::commands::shared::resolve_adapter;

pub use writer::WriteMode;

pub struct CrystallizeOptions {
    /// Project root (defaults to the current working directory).
    pub root: PathBuf,
    /// Specs directory passed via `-d` (used by markdown projects).
    pub specs_dir: String,
    /// Output target name (`AGENTS.md` by default; `CLAUDE.md` when requested).
    pub target: String,
    pub mode: WriteMode,
}

pub fn run(opts: CrystallizeOptions) -> Result<(), Box<dyn Error>> {
    let mut signals: Vec<Signal> = Vec::new();

    // File-system scanners first — they always run.
    signals.extend(scanners::arch::scan(&opts.root));
    signals.extend(scanners::naming::scan(&opts.root));
    signals.extend(scanners::tests::scan(&opts.root));
    signals.extend(scanners::git::scan(&opts.root));

    // Spec scanner is best-effort. A failure to resolve the adapter (no
    // `leanspec.adapter.yaml`, missing credentials, etc.) must not abort.
    match resolve_adapter(&opts.specs_dir) {
        Ok(adapter) => {
            signals.extend(scanners::specs::scan(adapter.as_ref()));
        }
        Err(_) => {
            // Silent: the test plan requires "no panic on repos with no
            // specs", and absent / unconfigured projects fall into that
            // bucket too.
        }
    }

    let grouped = group_and_dedupe(signals);
    let output = render(&grouped);
    let report = apply(&opts.root, &output, opts.mode, &opts.target)?;

    if report.dry_run {
        eprintln!("(dry run — nothing written)");
    } else if let Some(path) = &report.agents_path {
        eprintln!("Wrote {}", display_relative(&opts.root, path));
        for sp in &report.skill_paths {
            eprintln!("Wrote {}", display_relative(&opts.root, sp));
        }
    }
    Ok(())
}

fn display_relative(root: &std::path::Path, path: &std::path::Path) -> String {
    path.strip_prefix(root)
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| path.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn runs_on_empty_dir_without_panicking() {
        let tmp = TempDir::new().unwrap();
        let opts = CrystallizeOptions {
            root: tmp.path().to_path_buf(),
            specs_dir: tmp.path().join("specs").display().to_string(),
            target: "AGENTS.md".into(),
            mode: WriteMode::DryRun,
        };
        run(opts).unwrap();
    }
}
