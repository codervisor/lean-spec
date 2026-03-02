---
status: complete
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
updated_at: 2026-03-02T03:02:29.446486134Z
transitions:
- status: in-progress
  at: 2026-03-02T03:02:29.446486134Z
- status: complete
  at: 2026-03-02T15:56:00Z
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

- [x] Define `ErrorCode` enum in `leanspec-core`
- [x] Create `StructuredError` struct with code, message, details
- [x] Implement `From<CoreError>` → `StructuredError` mapping
- [x] Update `leanspec-http` error handler to use `StructuredError`
- [x] Ensure all HTTP responses use consistent error format
- [x] Create TypeScript `ApiError` type matching Rust `StructuredError`
- [x] Add centralized error handler in UI
- [x] Add i18n error message keys (en + zh)
- [x] Update MCP error responses to include error codes
- [x] `cargo test` — all pass
- [x] `pnpm test` — all pass

## Test

```bash
cargo test --workspace
# Verify: 404 responses include SPEC_NOT_FOUND code
# Verify: validation errors include field-level details
# Verify: UI shows localized error messages
```


## Verification Update (2026-03-02)

- HTTP layer already has structured error payload shape (`code`, `message`, optional `details`) and status mapping in `rust/leanspec-http/src/error.rs`.
- UI `APIError` carries `code` and `details` (`packages/ui/src/lib/backend-adapter/core.ts`).
- Core-level unified `ErrorCode` contract in `leanspec-core` and i18n key mapping for error codes are not fully implemented yet.
- This phase remains in-progress.


- Checklist progress: **1/11 complete (9%)**.


- `pnpm test` passes at workspace level.
- Checklist progress: **2/11 complete (18%)**.


- Added centralized UI error mapper: `packages/ui/src/lib/api-error.ts`.
- Added structured UI error type aligned with server contract in `packages/ui/src/lib/backend-adapter/core.ts` (`StructuredApiError` + `APIError.toStructured()`).
- Added bilingual API error-code i18n entries in `packages/ui/src/locales/en/errors.json` and `packages/ui/src/locales/zh-CN/errors.json`.
- Core unification is now in place:
  - `ErrorCode` + `StructuredError` defined in `rust/leanspec-core/src/error.rs`.
  - Core-to-structured mapping implemented (`From<&CoreError>`).
  - HTTP maps core codes to status in one place (`rust/leanspec-http/src/error.rs`) and supports `From<StructuredError>` for `ApiError`.
  - MCP error responses include machine-readable codes in `data.errorCode` (`rust/leanspec-mcp/src/protocol.rs`).
- Checklist progress: **11/11 complete (100%)**.

## Notes

- This is the lowest priority phase — only pursue after Phases 1-3
- Can be implemented incrementally: start with the most common errors (not found, validation)
- Error codes become part of the public API contract once shipped