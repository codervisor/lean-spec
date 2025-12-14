# Desktop Migration Guide (Spec 169)

> Guide for understanding and working with the Native SPA architecture

## Overview

In December 2025, the LeanSpec Desktop app completed a migration from a **hybrid architecture** (Tauri + Node.js server) to a **pure native architecture** (Tauri + SPA). This guide helps contributors understand the changes and how to work with the new system.

## What Changed

### Before: Hybrid Architecture
- Tauri shell for window management
- Next.js standalone server bundled and run as sidecar
- UI loaded in iframe from `http://localhost:4319`
- API routes in Next.js handled spec operations
- Bundle size: 150-200 MB
- Startup time: 2-3 seconds
- Memory usage: 400-600 MB

### After: Native SPA Architecture
- Tauri handles everything backend
- React SPA with React Router for client-side routing
- UI served directly from Tauri's frontend dist
- Tauri commands replace API routes
- Rust backend replaces `@leanspec/core` operations
- Bundle size: ~26 MB (83% reduction)
- Startup time: <1 second (66% faster)
- Memory usage: 50-100 MB (83% reduction)

## Code Migration Patterns

### 1. API Routes → Tauri Commands

**Before (Next.js API Route)**:
```typescript
// pages/api/specs/[projectId].ts
export default async function handler(req, res) {
  const { projectId } = req.query;
  const specs = await getSpecsForProject(projectId);
  res.json({ specs });
}
```

**After (Tauri Command)**:
```rust
// src-tauri/src/specs/commands.rs
#[tauri::command]
pub async fn get_specs(project_id: String) -> Result<Vec<LightweightSpec>, String> {
    let reader = SpecReader::new(&project_id);
    reader.read_all()
        .map_err(|e| e.to_string())
}
```

### 2. Fetch Calls → Tauri Invoke

**Before (Fetch API)**:
```typescript
// Frontend
const response = await fetch(`/api/specs/${projectId}`);
const data = await response.json();
```

**After (Tauri IPC)**:
```typescript
// Frontend
import { invoke } from '@tauri-apps/api/core';
const specs = await invoke('get_specs', { projectId });
```

Or using the IPC wrapper:
```typescript
import { getSpecs } from '@/lib/ipc';
const specs = await getSpecs(projectId);
```

### 3. TypeScript Core → Rust Implementation

**Before (TypeScript)**:
```typescript
// @leanspec/core
export function parseSpec(content: string): Spec {
  const { frontmatter, body } = parseFrontmatter(content);
  return { frontmatter, body };
}
```

**After (Rust)**:
```rust
// src-tauri/src/specs/frontmatter.rs
pub fn parse_frontmatter(content: &str) -> Result<(Frontmatter, String)> {
    // Split on --- delimiters
    // Parse YAML with serde_yaml
    // Return structured data
}
```

### 4. Next.js Routing → React Router

**Before (Next.js File-Based)**:
```typescript
// pages/specs/[specId].tsx
export default function SpecDetailPage() {
  const router = useRouter();
  const { specId } = router.query;
  // ...
}
```

**After (React Router)**:
```typescript
// src/pages/SpecDetailPage.tsx
import { useParams } from 'react-router-dom';

export function SpecDetailPage() {
  const { specId } = useParams();
  // ...
}
```

## Working with the New Architecture

### Adding a New Feature

Example: Add a "duplicate spec" feature

#### 1. Implement Rust Command

```rust
// src-tauri/src/specs/commands.rs

#[tauri::command]
pub async fn duplicate_spec(
    project_id: String,
    spec_id: String,
    new_id: String,
) -> Result<(), String> {
    let reader = SpecReader::new(&project_id);
    let spec = reader.read_spec(&spec_id)
        .map_err(|e| e.to_string())?;
    
    // Copy spec to new location
    let new_path = format!("specs/{}/README.md", new_id);
    std::fs::copy(&spec.path, &new_path)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
```

#### 2. Register Command

```rust
// src-tauri/src/main.rs

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ... existing commands
            specs::duplicate_spec,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 3. Add TypeScript Wrapper

```typescript
// src/lib/ipc.ts

export async function duplicateSpec(
  projectId: string,
  specId: string,
  newId: string
): Promise<void> {
  return invoke('duplicate_spec', { projectId, specId, newId });
}
```

#### 4. Use in React Component

```typescript
// src/pages/SpecDetailPage.tsx

import { duplicateSpec } from '@/lib/ipc';

function SpecDetailPage() {
  const handleDuplicate = async () => {
    try {
      await duplicateSpec(projectId, specId, newId);
      // Show success message
    } catch (error) {
      // Handle error
    }
  };

  return (
    <button onClick={handleDuplicate}>Duplicate Spec</button>
  );
}
```

### Debugging Tips

#### Frontend Debugging
```bash
# Open DevTools in desktop app
# On macOS: Cmd+Option+I
# On Linux/Windows: Ctrl+Shift+I

# Or enable in code:
import { invoke } from '@tauri-apps/api/core';
invoke('plugin:devtools|toggle');
```

#### Backend Debugging
```bash
# Run with verbose logging
RUST_LOG=debug pnpm dev:desktop

# Or add println! statements
println!("Debug: spec_id = {:?}", spec_id);

# Check logs in terminal
```

#### IPC Debugging
```typescript
// Log all IPC calls
const originalInvoke = invoke;
window.__TAURI__.invoke = async (cmd, args) => {
  console.log('IPC:', cmd, args);
  return originalInvoke(cmd, args);
};
```

### Common Pitfalls

#### 1. Async Rust Commands

❌ **Wrong**:
```rust
#[tauri::command]
fn get_specs() -> Vec<Spec> {
    // Blocking I/O
}
```

✅ **Correct**:
```rust
#[tauri::command]
async fn get_specs() -> Result<Vec<Spec>, String> {
    // Non-blocking with proper error handling
}
```

#### 2. Error Handling

❌ **Wrong**:
```rust
#[tauri::command]
fn get_spec(id: String) -> Spec {
    read_spec(&id).unwrap() // Panics on error!
}
```

✅ **Correct**:
```rust
#[tauri::command]
fn get_spec(id: String) -> Result<Spec, String> {
    read_spec(&id).map_err(|e| e.to_string())
}
```

#### 3. State Management

❌ **Wrong**:
```rust
static mut CACHE: Vec<Spec> = vec![]; // Unsafe!
```

✅ **Correct**:
```rust
use tauri::State;

pub struct AppState {
    cache: Mutex<Vec<Spec>>,
}

#[tauri::command]
fn get_cached(state: State<AppState>) -> Vec<Spec> {
    state.cache.lock().unwrap().clone()
}
```

#### 4. TypeScript Types

❌ **Wrong**:
```typescript
const result = await invoke('get_spec', { specId });
// result is `any`
```

✅ **Correct**:
```typescript
interface Spec { ... }

export async function getSpec(specId: string): Promise<Spec> {
  return invoke('get_spec', { specId });
}

const result = await getSpec('123');
// result is properly typed
```

## Testing

### Unit Tests (Rust)

```bash
# Run Rust tests
cd packages/desktop/src-tauri
cargo test

# Run specific test
cargo test test_parse_frontmatter

# Run with output
cargo test -- --nocapture
```

### Integration Tests (Coming Soon)

E2E tests using Tauri's testing framework are planned.

## Performance Optimization

### Rust Backend

1. **Use release builds for benchmarking**:
```bash
cargo build --release
```

2. **Profile with cargo flamegraph**:
```bash
cargo install flamegraph
cargo flamegraph --bin leanspec-desktop
```

3. **Optimize hot paths**:
- Use `parking_lot::Mutex` instead of `std::sync::Mutex`
- Cache parsed frontmatter
- Use parallel iterators with `rayon`

### Frontend

1. **Code splitting**:
```typescript
// Lazy load pages
const SpecsPage = lazy(() => import('./pages/SpecsPage'));
```

2. **Memoization**:
```typescript
const expensiveComputation = useMemo(() => {
  return computeStats(specs);
}, [specs]);
```

3. **Virtualization for long lists**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

## Rollback Strategy

If you need to revert to the Node.js server mode temporarily:

1. **Re-enable UI server**:
```bash
export LEANSPEC_ENABLE_UI_SERVER=1
```

2. **Restore build scripts** (in `package.json`):
```json
"prepare:ui": "node ./scripts/sync-ui-build.mjs",
"download:node": "node ./scripts/download-node.mjs",
```

3. **Restore bundle resources** (in `tauri.conf.json`):
```json
"resources": [
  "ui-standalone",
  "resources/node"
],
```

4. **Switch to iframe App**:
```typescript
// main.tsx
import App from './App';  // Instead of Router
```

## FAQs

### Q: Can I still use TypeScript for backend logic?

A: No. The backend is now pure Rust. All spec operations must be implemented in Rust. TypeScript is only for the frontend.

### Q: How do I access Node.js libraries?

A: You don't. Find equivalent Rust crates or implement the functionality in Rust. For example:
- `gray-matter` → `serde_yaml` + custom parser
- `fs-extra` → `std::fs`
- `globby` → `walkdir`

### Q: Is the Node.js server completely removed?

A: The code exists but is disabled by default. It can be re-enabled with `LEANSPEC_ENABLE_UI_SERVER=1` for backward compatibility.

### Q: What about the Web UI (spec 087)?

A: The web UI (hosted on Vercel) still uses Next.js. This migration only affects the desktop app.

### Q: How do I learn Rust?

Resources:
- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Tauri Documentation](https://tauri.app)

## Getting Help

- **Desktop Issues**: Check existing issues in `specs/169-ui-backend-rust-tauri-migration-evaluation/`
- **Rust Questions**: Ask in team Slack #rust channel
- **General Questions**: Open a GitHub discussion

## Next Steps

After reading this guide:
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Try building the desktop app: `pnpm build:desktop`
3. Explore the Rust codebase in `src-tauri/src/`
4. Make a small change and test it

## Resources

- [Tauri IPC Documentation](https://tauri.app/v1/guides/features/command)
- [Rust Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [React Router v6](https://reactrouter.com/)
- [Serde Documentation](https://serde.rs/)
