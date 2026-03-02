---
status: planned
created: 2026-03-02
priority: low
tags:
- architecture
- rust
- quality
- dx
- i18n
parent: 341-codebase-refactoring-overhaul
created_at: 2026-03-02T02:41:28.639191854Z
updated_at: 2026-03-02T02:41:50.259581669Z
---

# Phase 5: Unified Error Handling

> **Parent**: 341-codebase-refactoring-overhaul · **Priority**: Low

## Goal

Establish a consistent error handling pipeline from Rust core → HTTP API → TypeScript UI with structured error codes, proper HTTP status mapping, and i18n-ready client messages.

## Problem

Errors currently flow through 3 disparate layers:

1. **`CoreError`** (`leanspec-core/src/error.rs`) — Rust-level errors (IO, parse, validation, etc.)
2. **`ServerError`** (`leanspec-http/src/error.rs`) — HTTP-level errors mapped from CoreError
3. **TypeScript** (`packages/ui`) — Ad-hoc error handling per API call

Issues:
- No shared error codes — client can't programmatically distinguish error types
- HTTP status codes chosen inconsistently (some 500s should be 400s)
- UI shows raw error messages instead of user-friendly text
- No error context (which spec? which field?)

## Design

### Error Code Enum (Rust)

```rust
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // Spec errors
    SpecNotFound,
    SpecAlreadyExists,
    InvalidFrontmatter,
    InvalidSpecPath,
    CircularDependency,
    
    // Validation errors  
    ValidationFailed,
    TokenLimitExceeded,
    
    // Session errors
    SessionNotFound,
    SessionAlreadyRunning,
    RunnerNotAvailable,
    
    // System errors
    IoError,
    DatabaseError,
    ConfigError,
    
    // AI errors
    AiProviderError,
    ModelNotAvailable,
}
```

### Structured Error Response

```json
{
  "error": {
    "code": "SPEC_NOT_FOUND",
    "message": "Spec '999-nonexistent' not found",
    "details": {
      "spec_path": "999-nonexistent",
      "project_id": "my-project"
    }
  }
}
```

### HTTP Status Mapping (single place)

```rust
impl ErrorCode {
    pub fn http_status(&self) -> StatusCode {
        match self {
            Self::SpecNotFound | Self::SessionNotFound => StatusCode::NOT_FOUND,
            Self::SpecAlreadyExists | Self::SessionAlreadyRunning => StatusCode::CONFLICT,
            Self::InvalidFrontmatter | Self::InvalidSpecPath | Self::ValidationFailed => StatusCode::BAD_REQUEST,
            Self::CircularDependency | Self::TokenLimitExceeded => StatusCode::UNPROCESSABLE_ENTITY,
            Self::RunnerNotAvailable | Self::ModelNotAvailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::IoError | Self::DatabaseError | Self::ConfigError => StatusCode::INTERNAL_SERVER_ERROR,
            Self::AiProviderError => StatusCode::BAD_GATEWAY,
        }
    }
}
```

### TypeScript Error Handler

```typescript
// Centralized error handler maps codes to i18n keys
function handleApiError(error: ApiError): string {
  const key = `errors.${error.code.toLowerCase()}`;
  return t(key, error.details);  // i18n lookup with context
}
```

## Checklist

- [ ] Define `ErrorCode` enum in `leanspec-core`
- [ ] Create `StructuredError` struct with code, message, details
- [ ] Implement `From<CoreError>` → `StructuredError` mapping
- [ ] Update `leanspec-http` error handler to use `StructuredError`
- [ ] Ensure all HTTP responses use consistent error format
- [ ] Create TypeScript `ApiError` type matching Rust `StructuredError`
- [ ] Add centralized error handler in UI
- [ ] Add i18n error message keys (en + zh)
- [ ] Update MCP error responses to include error codes
- [ ] `cargo test` — all pass
- [ ] `pnpm test` — all pass

## Test

```bash
cargo test --workspace
# Verify: 404 responses include SPEC_NOT_FOUND code
# Verify: validation errors include field-level details
# Verify: UI shows localized error messages
```

## Notes

- This is the lowest priority phase — only pursue after Phases 1-3
- Can be implemented incrementally: start with the most common errors (not found, validation)
- Error codes become part of the public API contract once shipped
