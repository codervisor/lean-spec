---
status: in-progress
created: '2025-12-11'
tags:
  - desktop
  - tauri
  - bundling
  - node-modules
  - pnpm
  - nextjs
priority: high
depends_on:
  - 165-tauri-v2-migration
  - 148-leanspec-desktop-app
created_at: '2025-12-11T09:12:02.693Z'
updated_at: '2025-12-11T09:15:31.843Z'
transitions:
  - status: in-progress
    at: '2025-12-11T09:12:00.000Z'
---

# Desktop UI Server Bundling Fix - pnpm Dependencies

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-11 · **Tags**: desktop, tauri, bundling, node-modules, pnpm, nextjs

## Overview

Fix critical issue where desktop app's embedded UI server fails to start due to missing Node.js dependencies caused by pnpm's symlinked module structure not surviving Tauri's packaging process.

## Problem Statement

The desktop app bundles Next.js standalone build but fails at runtime with:
```
Error: Cannot find module 'styled-jsx/package.json'
Error: Cannot find module 'next'
```

**Root Cause**: pnpm uses symlinked `.pnpm/package@version/node_modules` structure. When Tauri packages resources, these symlinks either break or point to non-existent locations.

## Investigation Findings

### Issue #1: Missing Working Directory ✅ Fixed

**Problem**: Node.js was executed without setting current directory
```rust
// Before (broken)
command.arg(&server).env("PORT", port.to_string())
```

**Fix Applied**: Set working directory to server.js location
```rust
// After (fixed)
let server_dir = standalone.join("packages/ui");
command.current_dir(&server_dir).arg("server.js")
```

**Result**: ✅ Server process spawns successfully

### Issue #2: Broken pnpm Symlinks 🔴 Active

**Problem**: Next.js standalone build structure:
```
ui-standalone/
├── node_modules/
│   └── .pnpm/
│       └── next@16.0.8.../node_modules/
│           ├── next/
│           └── styled-jsx -> ../../styled-jsx@5.1.6.../node_modules/styled-jsx
└── packages/ui/
    ├── server.js
    ├── .next/
    └── node_modules/
        ├── next -> ../../../node_modules/.pnpm/next@16.0.8.../node_modules/next
        └── better-sqlite3 -> ../../../node_modules/.pnpm/...
```

**Attempted Fixes**:
1. ❌ **Preserve symlinks** - Tauri DEB packaging doesn't include them
2. ❌ **Dereference symlinks** - Only copied immediate targets, not transitive deps
3. ❌ **Set NODE_PATH** - Node's module resolution doesn't work with pnpm structure

**Current Status**: Server spawns but can't find `styled-jsx` (transitive dependency of `next`)

### Issue #3: Bundled Node.js Path Wrong

**Problem**: Looking for Node in wrong location
```
[DEBUG] Bundled node candidate: "/tmp/.../usr/lib/lean-spec-desktop/node/linux-x64/node"
```

Should be: `usr/lib/lean-spec-desktop/resources/node/linux-x64/node`

**Status**: Falls back to system Node.js (works but not ideal for distribution)

## Design

### Solution Options

#### Option A: Flatten node_modules (Recommended)

Copy dependencies and create flat structure that Node.js can resolve:

```javascript
// sync-ui-build.mjs enhancement
async function flattenNodeModules(standalone, dest) {
  // 1. Find all packages in .pnpm structure
  // 2. Copy to flat node_modules in packages/ui
  // 3. Maintain package.json for each
}
```

**Pros**: 
- Works with standard Node.js resolution
- No runtime hacks needed
- Proven approach

**Cons**: 
- Larger bundle size (duplicate dependencies)
- Build script complexity

#### Option B: Bundle Server with ncc/esbuild

Use `@vercel/ncc` or `esbuild` to create single-file server:

```json
{
  "scripts": {
    "bundle-server": "ncc build server.js -o standalone-server"
  }
}
```

**Pros**:
- Single executable file
- No node_modules needed
- Smallest bundle

**Cons**:
- May not work with Next.js server (uses dynamic requires)
- Loses hot module replacement in dev
- Needs thorough testing

#### Option C: Bundle Node.js and Full Dependencies

Package everything including Node.js binary:

**Pros**:
- Completely self-contained
- No system dependencies

**Cons**:
- Very large bundle (~150MB+)
- Platform-specific Node binaries needed

#### Option D: Tauri Sidecar with pkg (Recommended ⭐)

Use `pkg` to bundle Next.js server + Node.js runtime into a single executable, then configure as Tauri sidecar:

**Architecture**:
```
1. pkg server.js → standalone executable (includes Node.js)
2. Place in src-tauri/binaries/ui-server-{target}
3. Configure as externalBin in tauri.conf.json
4. Spawn via Command::new_sidecar() in Rust
```

**Implementation**:
```json
// package.json
{
  "scripts": {
    "build:sidecar": "pkg packages/ui/server.js --targets node18-linux-x64,node18-macos-x64,node18-win-x64 --output src-tauri/binaries/ui-server"
  }
}

// tauri.conf.json
{
  "bundle": {
    "externalBin": ["binaries/ui-server"]
  }
}
```

```rust
// src-tauri/src/main.rs
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let (mut rx, child) = tauri::async_runtime::block_on(async {
                Command::new_sidecar("ui-server")
                    .expect("failed to create ui-server sidecar")
                    .envs([
                        ("PORT", "4319"),
                        ("HOSTNAME", "127.0.0.1"),
                        ("SPECS_MODE", "filesystem"),
                    ])
                    .spawn()
                    .expect("failed to spawn ui-server")
            });
            
            // Store child process handle for cleanup
            app.manage(UiServerHandle(Arc::new(Mutex::new(Some(child)))));
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running application");
}
```

**Pros**:
- ✅ Single self-contained binary (no node_modules needed)
- ✅ No symlink issues - everything bundled
- ✅ Official Tauri pattern for external processes
- ✅ Automatic cleanup when app exits
- ✅ Cross-platform (pkg generates platform-specific binaries)
- ✅ Smaller than bundling full node_modules (~80MB vs ~240MB)
- ✅ Proper process management via Tauri

**Cons**:
- Requires `pkg` build step
- May need webpack/rollup configuration for Next.js compatibility
- Initial setup complexity

**Why This is Best**:
1. Eliminates all node_modules/pnpm issues completely
2. Uses Tauri's designed pattern for external binaries
3. Cleaner architecture - UI server as managed subprocess
4. Better process lifecycle management
5. Proven approach used by other Tauri+Node.js apps

### Recommended Approach

**NEW: Pivot to Sidecar Approach** (Highest Priority)

**Phase 1**: Proof of Concept
- Test `pkg` with Next.js standalone server
- Verify all dynamic requires work
- Test on target platforms

**Phase 2**: Sidecar Integration
- Configure `pkg` build for all platforms
- Set up sidecar in tauri.conf.json
- Update ui_server.rs to use Command::new_sidecar()
- Test process lifecycle management

**Phase 3**: Production Hardening
- Error handling for sidecar failures
- Port conflict resolution
- Logging and debugging
- Health checks

**OLD Approaches** (Fallback if sidecar doesn't work):
- Phase 1: Fix immediate issues ✅ Done
- Phase 2: Implement flat node_modules (if needed)
- Phase 3: Optimize bundle size

## Implementation

### Changes Made

#### 1. ui_server.rs - Set Working Directory

```rust
fn spawn_embedded_server(app: &AppHandle, port: u16, project: Option<&DesktopProject>) -> Result<Child> {
    let standalone = find_embedded_standalone_dir(app)?;
    let server_dir = standalone.join("packages/ui");
    
    let mut command = Command::new(node_exe);
    command
        .current_dir(&server_dir)  // ← Critical fix
        .arg("server.js")
        .env("PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1");
    
    // ... rest of implementation
}
```

#### 2. ui_server.rs - Debug Logging

Added comprehensive logging throughout:
- Standalone directory resolution
- Node.js discovery process
- Server path validation
- Working directory confirmation
- .next directory existence
- NODE_PATH configuration
- Server spawn status
- Port readiness checks

**Sample Output**:
```
[DEBUG] Standalone dir: "/usr/lib/lean-spec-desktop/ui-standalone"
[DEBUG] Server.js exists: true
[DEBUG] Node executable: node (version: v22.12.0)
[DEBUG] Server working dir: "/usr/lib/lean-spec-desktop/ui-standalone/packages/ui"
[DEBUG] .next exists: true
[DEBUG] Server process spawned with PID: 123456
[DEBUG] Waiting for server on 127.0.0.1:18095
```

#### 3. sync-ui-build.mjs - Symlink Handling

**Current Implementation**:
```javascript
if (entry.isSymbolicLink()) {
  try {
    // Resolve and copy symlink target
    const target = await fs.readlink(src);
    const absoluteTarget = path.resolve(path.dirname(src), target);
    const stats = await fs.stat(absoluteTarget);
    
    if (stats.isDirectory()) {
      await copyDir(absoluteTarget, dest);
    } else if (stats.isFile()) {
      await fs.copyFile(absoluteTarget, dest);
    }
  } catch (error) {
    console.warn(`Skipping broken symlink: ${src}`);
  }
}
```

**Issue**: Only copies immediate symlink targets, not their dependencies

### Next Steps

1. **Implement flat node_modules copier**:
   ```javascript
   async function createFlatNodeModules(standalone, packagesUI) {
     const pnpmDir = path.join(standalone, 'node_modules/.pnpm');
     const flatModules = path.join(packagesUI, 'node_modules');
     
     // Walk .pnpm structure
     // Copy each package to flat location
     // Preserve package.json and structure
   }
   ```

2. **Update sync-ui-build.mjs** to call flattener after copy

3. **Test packaged app** with proper dependencies

4. **Fix bundled Node.js path** in resource resolution

## Plan

### Phase 0: Evaluate Sidecar Approach (NEW - Highest Priority)

- [ ] Research `pkg` compatibility with Next.js standalone
- [ ] Test proof-of-concept: `pkg packages/ui/.next/standalone/packages/ui/server.js`
- [ ] Verify binary includes .next directory and assets
- [ ] Test binary on Linux/macOS/Windows
- [ ] Measure binary size vs current approach
- [ ] Document any Next.js-specific configuration needed

### Phase 1: Implement Sidecar (If POC succeeds)

- [ ] Add `pkg` to package.json devDependencies
- [ ] Create build script to generate platform binaries
- [ ] Configure naming convention: `ui-server-{triple}` (e.g., `ui-server-x86_64-unknown-linux-gnu`)
- [ ] Place binaries in `src-tauri/binaries/`
- [ ] Update `tauri.conf.json` with `externalBin: ["binaries/ui-server"]`
- [ ] Remove old `download-node.mjs` and `sync-ui-build.mjs` scripts

### Phase 2: Update Rust Code

- [ ] Remove `ui_server.rs` module (replaced by sidecar)
- [ ] Update `main.rs` setup to spawn sidecar
- [ ] Implement proper error handling for sidecar spawn
- [ ] Add health check to wait for server ready
- [ ] Store sidecar handle for cleanup on exit
- [ ] Remove old Node.js discovery logic

### Phase 3: Testing and Validation

- [ ] Test development mode (dev still uses pnpm dev)
- [ ] Build DEB/DMG/MSI packages
- [ ] Extract and test sidecar binary standalone
- [ ] Verify UI server starts correctly
- [ ] Test all app features work
- [ ] Performance/size comparison with old approach

### Phase 4: Documentation and Cleanup

- [ ] Update desktop README with new architecture
- [ ] Document sidecar build process
- [ ] Add troubleshooting guide
- [ ] Clean up old bundling code
- [ ] Update CI/CD for sidecar builds

### Phase 5: Fallback - Flat node_modules (If sidecar fails)

- [ ] Create `flattenNodeModules()` function in sync-ui-build.mjs
- [ ] Walk .pnpm directory structure
- [ ] Copy all packages to flat node_modules
- [ ] Handle nested dependencies correctly
- [ ] Test with development build

### OLD Plans (Deprecated if sidecar works)

~~### Phase 1: Debug and Diagnosis ✅ Complete~~

- [x] Identify why UI server fails to start
- [x] Add comprehensive debug logging to ui_server.rs
- [x] Test working directory fixes
- [x] Document pnpm structure issues
- [x] Test various symlink handling approaches

### Phase 2: Implement Flat node_modules (In Progress)

- [ ] Create `flattenNodeModules()` function in sync-ui-build.mjs
- [ ] Walk .pnpm directory structure
- [ ] Copy all packages to flat node_modules
- [ ] Handle nested dependencies correctly
- [ ] Test with development build

### Phase 3: Fix Bundled Node.js Path

- [ ] Update `bundled_node_path()` to look in `resources/node/` instead of `node/`
- [ ] Test bundled Node.js is found correctly
- [ ] Verify fallback to system Node.js still works

### Phase 4: Testing and Validation

- [ ] Build DEB package with flat dependencies
- [ ] Extract and test server startup
- [ ] Verify all dependencies resolve
- [ ] Test full app functionality
- [ ] Performance/size benchmarking

### Phase 5: Cleanup and Documentation

- [ ] Remove/reduce debug logging (keep essentials)
- [ ] Update desktop README with troubleshooting
- [ ] Document sync-ui-build.mjs changes
- [ ] Add comments explaining pnpm workaround

## Test

### Functional Tests

**Server Spawn**:
- [x] Server process spawns with correct working directory
- [x] Debug logging shows all critical paths
- [ ] All Node.js dependencies resolve correctly
- [ ] Server starts and listens on assigned port

**Desktop App**:
- [ ] DEB package builds successfully
- [ ] App launches without errors
- [ ] UI loads from embedded server
- [ ] All features work (spec browsing, editing, etc.)

### Verification Tests

**Development Mode**:
- [x] `pnpm dev:desktop` works as expected
- [x] Hot reload functions properly
- [x] All dependencies available

**Production Build**:
- [ ] `pnpm tauri build --bundles deb` succeeds
- [ ] Bundle size is reasonable (<200MB)
- [ ] Extracted bundle has proper structure
- [ ] Server.js and .next/ directory present
- [ ] node_modules/ is properly flattened
- [ ] No broken symlinks in bundle

**Runtime**:
- [ ] Server starts within 5 seconds
- [ ] No module resolution errors
- [ ] UI accessible at http://127.0.0.1:PORT
- [ ] App window loads UI correctly

## Dependencies

- **165-tauri-v2-migration**: Uses Tauri v2 resource bundling
- **148-leanspec-desktop-app**: Core desktop app architecture

## Notes

### pnpm Structure Explanation

pnpm uses hard links and symlinks to save disk space:

```
node_modules/
├── .pnpm/                           # Real package storage
│   ├── next@16.0.8_deps/
│   │   └── node_modules/
│   │       ├── next/                # Actual package files
│   │       └── styled-jsx -> ../../styled-jsx@5.1.6.../
│   └── styled-jsx@5.1.6_deps/
│       └── node_modules/
│           └── styled-jsx/          # Actual package files
└── next -> .pnpm/next@16.0.8_deps/node_modules/next
```

**Node.js Resolution**: Walks up from `require()` location looking for `node_modules/package-name`

**Problem**: When symlinks break or point to `.pnpm/...` structure, Node can't find transitive deps

### Why Next.js Standalone?

Next.js standalone mode (via `output: 'standalone'`) is designed for Docker/containers:
- Bundles only production dependencies
- Optimizes for minimal size
- Expects to run `node server.js` from specific location

**Tauri Incompatibility**: Standalone mode assumes proper node_modules structure, but Tauri resource bundling doesn't preserve pnpm's complex symlink setup.

### Alternative Approaches Considered

1. **Switch to npm**: Would create flat node_modules
   - Pro: Simpler structure
   - Con: Larger, slower workspace builds

2. **Use Next.js static export**: No Node.js needed
   - Pro: Simple, fast
   - Con: Loses API routes (needed for spec operations)

3. **Rewrite UI with static-friendly framework**: Eliminate server requirement
   - Pro: Clean solution
   - Con: Massive refactoring effort

4. **Keep current + document workaround**: Require Node.js on user's system
   - Pro: No changes needed
   - Con: Poor user experience, defeats purpose of desktop app

5. **⭐ Tauri Sidecar with pkg** (NEW - Recommended)
   - Pro: Official pattern, no node_modules, clean architecture
   - Con: Build complexity, requires testing
   - Status: Best long-term solution

### pkg + Next.js Compatibility Notes

**Challenges**:
- Next.js uses dynamic imports and requires
- May need custom webpack config
- `.next` directory must be accessible to bundled binary

**Potential Solutions**:
1. Use `pkg` with `--public-packages` flag
2. Configure `pkg.assets` in package.json to include `.next/`
3. Alternative: Use `nexe` or `ncc` if `pkg` doesn't work
4. Consider `@vercel/ncc` for Next.js-specific bundling

**Research Links**:
- [pkg documentation](https://github.com/vercel/pkg)
- [Tauri sidecar guide](https://tauri.app/v1/guides/building/sidecar/)
- [Next.js standalone mode](https://nextjs.org/docs/advanced-features/output-file-tracing)

### Debug Output Examples

**Successful Spawn**:
```
[DEBUG] Standalone dir: "/tmp/.../usr/lib/lean-spec-desktop/ui-standalone"
[DEBUG] Server.js path: ".../ui-standalone/packages/ui/server.js"
[DEBUG] Server.js exists: true
[DEBUG] Node executable: node
[DEBUG] Server working dir: ".../ui-standalone/packages/ui"
[DEBUG] .next exists: true
[DEBUG] Server process spawned with PID: 397499
[DEBUG] Waiting for server on 127.0.0.1:17465
```

**Dependency Error**:
```
Error: Cannot find module 'styled-jsx/package.json'
Require stack:
- .../ui-standalone/packages/ui/node_modules/next/dist/server/require-hook.js
- .../ui-standalone/packages/ui/node_modules/next/dist/server/next.js
- .../ui-standalone/packages/ui/server.js
```

## Progress Log

**2025-12-11 - Initial Investigation & Diagnosis**:
- ✅ Identified working directory issue
- ✅ Added comprehensive debug logging throughout ui_server.rs
- ✅ Fixed server spawn process (working directory + arg changes)
- ✅ Discovered pnpm symlink packaging issue
- ✅ Attempted multiple symlink handling approaches:
  - Preserve symlinks → Lost in DEB packaging
  - Dereference symlinks → Only got immediate targets
  - Set NODE_PATH → Doesn't work with pnpm structure
- ❌ Current solution incomplete - missing transitive dependencies
- 📝 Documented findings in this spec

**2025-12-11 - Sidecar Approach Discovery**:
- 💡 Learned about Tauri sidecar pattern for external binaries
- 📚 Researched `pkg` for bundling Node.js + Next.js server
- ✨ Identified Option D (sidecar) as superior long-term solution
- 📋 Updated spec with new recommended approach
- 🎯 Reprioritized: POC sidecar approach before continuing with node_modules workarounds

**Next Session**:
- Test `pkg` with Next.js standalone build
- Verify compatibility and measure bundle size
- If successful, implement full sidecar integration
- If pkg fails, explore `nexe` or `ncc` alternatives
- Fallback: Continue with flat node_modules if all bundlers fail
