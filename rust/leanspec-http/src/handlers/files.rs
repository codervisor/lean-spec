//! File browsing and reading handlers for codebase viewing

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::path::{Path as FsPath, PathBuf};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;
use crate::utils::resolve_project;

/// Maximum file size to read (1 MB)
const MAX_FILE_SIZE: u64 = 1024 * 1024;

/// Query params for listing files
#[derive(Debug, Deserialize)]
pub struct FileListQuery {
    /// Relative path within the project root (optional, defaults to root)
    pub path: Option<String>,
}

/// Query params for reading a file
#[derive(Debug, Deserialize)]
pub struct FileReadQuery {
    /// Relative path within the project root
    pub path: String,
}

/// A single entry in a directory listing
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: FileEntryType,
    /// Size in bytes (only for files)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    /// Whether this entry is ignored by .gitignore
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignored: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FileEntryType {
    File,
    Directory,
}

/// Response for directory listing
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileListResponse {
    pub path: String,
    pub entries: Vec<FileEntry>,
}

/// Response for file content
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContentResponse {
    pub path: String,
    pub content: String,
    pub language: String,
    pub size: u64,
    pub line_count: usize,
}

/// Detect language from file extension for syntax highlighting
fn detect_language(path: &FsPath) -> String {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "ts" | "tsx" => "typescript",
        "js" | "jsx" | "mjs" | "cjs" => "javascript",
        "rs" => "rust",
        "py" => "python",
        "json" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "md" | "mdx" => "markdown",
        "html" | "htm" => "html",
        "css" => "css",
        "scss" | "sass" => "scss",
        "go" => "go",
        "java" => "java",
        "c" | "h" => "c",
        "cpp" | "cc" | "cxx" | "hpp" => "cpp",
        "rb" => "ruby",
        "sh" | "bash" | "zsh" => "bash",
        "sql" => "sql",
        "graphql" | "gql" => "graphql",
        "xml" => "xml",
        "swift" => "swift",
        "kt" | "kts" => "kotlin",
        "php" => "php",
        "cs" => "csharp",
        "tf" | "tfvars" => "hcl",
        "dockerfile" => "dockerfile",
        "lock" => "text",
        _ => {
            // Check filename without extension for special cases
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                match name.to_lowercase().as_str() {
                    "dockerfile" => return "dockerfile".to_string(),
                    ".gitignore" | ".gitattributes" | ".env" | ".env.local" | ".env.example"
                    | ".envrc" => return "bash".to_string(),
                    "makefile" | "gnumakefile" => return "makefile".to_string(),
                    _ => {}
                }
            }
            "text"
        }
    }
    .to_string()
}

/// Validate and resolve a relative path against the project root.
/// Prevents path traversal attacks.
fn resolve_safe_path(root: &FsPath, relative: &str) -> Result<PathBuf, String> {
    // Normalize: strip leading slash, replace backslashes
    let normalized = relative.trim_start_matches('/').replace('\\', "/");

    // Reject any path component that looks like a traversal
    for component in normalized.split('/') {
        if component == ".." {
            return Err("Path traversal not allowed".to_string());
        }
    }

    let candidate = root.join(&normalized);

    // Canonicalize both to ensure the resolved path is inside root.
    // Note: we canonicalize root here too; if it fails just fall back to prefix check.
    let canonical_candidate = candidate
        .canonicalize()
        .map_err(|_| format!("Path '{}' does not exist", relative))?;

    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());

    if !canonical_candidate.starts_with(&canonical_root) {
        return Err("Path is outside project root".to_string());
    }

    Ok(canonical_candidate)
}

/// GET /api/projects/:id/files?path=...
/// Lists a directory in the project, respecting .gitignore
pub async fn list_project_files(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Query(query): Query<FileListQuery>,
) -> ApiResult<Json<FileListResponse>> {
    let project = resolve_project(&state, &project_id).await?;
    let root = PathBuf::from(&project.path);

    let target_path = match &query.path {
        Some(rel) if !rel.is_empty() => resolve_safe_path(&root, rel)
            .map_err(|e| (StatusCode::BAD_REQUEST, Json(ApiError::invalid_request(&e))))?,
        _ => root.canonicalize().unwrap_or_else(|_| root.clone()),
    };

    if !target_path.is_dir() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Path is not a directory")),
        ));
    }

    // Collect non-ignored file names using the `ignore` crate (respects .gitignore)
    let mut non_ignored_names: std::collections::HashSet<String> = std::collections::HashSet::new();

    let gi_walker = ignore::WalkBuilder::new(&target_path)
        .max_depth(Some(1))
        .hidden(false)
        .follow_links(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(|entry| {
            if entry.depth() == 0 {
                return true;
            }
            if let Some(name) = entry.file_name().to_str() {
                if name == ".git" {
                    return false;
                }
            }
            true
        })
        .build();

    for entry in gi_walker.flatten() {
        if entry.depth() == 0 {
            continue;
        }
        non_ignored_names.insert(entry.file_name().to_string_lossy().to_string());
    }

    // Walk ALL entries (including gitignored), marking ignored ones
    let mut entries: Vec<FileEntry> = Vec::new();

    let all_walker = ignore::WalkBuilder::new(&target_path)
        .max_depth(Some(1))
        .hidden(false)
        .follow_links(true)
        .git_ignore(false) // Include gitignored files
        .git_global(false)
        .git_exclude(false)
        .filter_entry(|entry| {
            if entry.depth() == 0 {
                return true;
            }
            // Skip .git directory itself
            if let Some(name) = entry.file_name().to_str() {
                if name == ".git" {
                    return false;
                }
            }
            true
        })
        .build();

    for entry in all_walker.flatten() {
        if entry.depth() == 0 {
            continue; // Skip the root directory itself
        }

        let file_type = match entry.file_type() {
            Some(ft) => ft,
            None => continue, // Skip dangling symlinks
        };

        let name = entry.file_name().to_string_lossy().to_string();
        let is_ignored = !non_ignored_names.contains(&name);

        if file_type.is_dir() {
            entries.push(FileEntry {
                name,
                entry_type: FileEntryType::Directory,
                size: None,
                ignored: if is_ignored { Some(true) } else { None },
            });
        } else if file_type.is_file() {
            let size = entry.metadata().ok().map(|m| m.len());
            entries.push(FileEntry {
                name,
                entry_type: FileEntryType::File,
                size,
                ignored: if is_ignored { Some(true) } else { None },
            });
        }
    }

    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        use FileEntryType::*;
        match (&a.entry_type, &b.entry_type) {
            (Directory, File) => std::cmp::Ordering::Less,
            (File, Directory) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    // Compute the display path relative to project root
    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.clone());
    let display_path = target_path
        .strip_prefix(&canonical_root)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());
    let display_path = if display_path.is_empty() {
        ".".to_string()
    } else {
        display_path
    };

    Ok(Json(FileListResponse {
        path: display_path,
        entries,
    }))
}

/// GET /api/projects/:id/file?path=...
/// Reads a file's content within the project
pub async fn read_project_file(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Query(query): Query<FileReadQuery>,
) -> ApiResult<Json<FileContentResponse>> {
    let project = resolve_project(&state, &project_id).await?;
    let root = PathBuf::from(&project.path);

    if query.path.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(
                "path query parameter is required",
            )),
        ));
    }

    let file_path = resolve_safe_path(&root, &query.path)
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(ApiError::invalid_request(&e))))?;

    if !file_path.is_file() {
        return Err((StatusCode::NOT_FOUND, Json(ApiError::not_found("File"))));
    }

    let metadata = file_path.metadata().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let size = metadata.len();

    if size > MAX_FILE_SIZE {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(
                "File is too large to view (max 1MB)",
            )),
        ));
    }

    let content = std::fs::read(&file_path).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    // Check if binary
    if content.contains(&0u8) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(
                "Binary files cannot be displayed",
            )),
        ));
    }

    let content_str = String::from_utf8_lossy(&content).to_string();
    let line_count = content_str.lines().count();
    let language = detect_language(&file_path);

    // Relative path for display
    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.clone());
    let display_path = file_path
        .strip_prefix(&canonical_root)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| query.path.clone());

    Ok(Json(FileContentResponse {
        path: display_path,
        content: content_str,
        language,
        size,
        line_count,
    }))
}

/// Query params for searching files
#[derive(Debug, Deserialize)]
pub struct FileSearchQuery {
    /// Search query string
    pub q: String,
    /// Maximum number of results to return (default 100)
    pub limit: Option<usize>,
}

/// A search result entry
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSearchEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: FileEntryType,
    /// Size in bytes (only for files)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    /// Whether this entry is ignored by .gitignore
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignored: Option<bool>,
}

/// Response for file search
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSearchResponse {
    pub query: String,
    pub results: Vec<FileSearchEntry>,
}

/// GET /api/projects/:id/files/search?q=...
/// Recursively searches for files/directories matching the query
pub async fn search_project_files(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    Query(query): Query<FileSearchQuery>,
) -> ApiResult<Json<FileSearchResponse>> {
    let project = resolve_project(&state, &project_id).await?;
    let root = PathBuf::from(&project.path);
    let canonical_root = root.canonicalize().unwrap_or_else(|_| root.clone());

    let search_query = query.q.to_lowercase();
    let limit = query.limit.unwrap_or(100).min(500);

    if search_query.is_empty() {
        return Ok(Json(FileSearchResponse {
            query: query.q,
            results: vec![],
        }));
    }

    // Collect non-ignored paths using gitignore-respecting walker
    let mut non_ignored_paths: std::collections::HashSet<String> = std::collections::HashSet::new();

    let gi_walker = ignore::WalkBuilder::new(&canonical_root)
        .hidden(false)
        .follow_links(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(|entry| {
            if let Some(name) = entry.file_name().to_str() {
                if name == ".git" {
                    return false;
                }
            }
            true
        })
        .build();

    for entry in gi_walker.flatten() {
        if entry.depth() == 0 {
            continue;
        }
        if let Ok(rel) = entry.path().strip_prefix(&canonical_root) {
            non_ignored_paths.insert(rel.to_string_lossy().to_string());
        }
    }

    // Walk all files (including gitignored) and filter by query
    let mut results: Vec<FileSearchEntry> = Vec::new();

    let all_walker = ignore::WalkBuilder::new(&canonical_root)
        .hidden(false)
        .follow_links(true)
        .git_ignore(false)
        .git_global(false)
        .git_exclude(false)
        .filter_entry(|entry| {
            if let Some(name) = entry.file_name().to_str() {
                if name == ".git" {
                    return false;
                }
            }
            true
        })
        .build();

    for entry in all_walker.flatten() {
        if entry.depth() == 0 {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        let rel_path = entry
            .path()
            .strip_prefix(&canonical_root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        // Match against name or full path
        if !name.to_lowercase().contains(&search_query)
            && !rel_path.to_lowercase().contains(&search_query)
        {
            continue;
        }

        let is_ignored = !non_ignored_paths.contains(&rel_path);

        let file_type = match entry.file_type() {
            Some(ft) => ft,
            None => continue,
        };

        if file_type.is_dir() {
            results.push(FileSearchEntry {
                name,
                path: rel_path,
                entry_type: FileEntryType::Directory,
                size: None,
                ignored: if is_ignored { Some(true) } else { None },
            });
        } else if file_type.is_file() {
            let size = entry.metadata().ok().map(|m| m.len());
            results.push(FileSearchEntry {
                name,
                path: rel_path,
                entry_type: FileEntryType::File,
                size,
                ignored: if is_ignored { Some(true) } else { None },
            });
        }

        if results.len() >= limit {
            break;
        }
    }

    Ok(Json(FileSearchResponse {
        query: query.q,
        results,
    }))
}
