---
status: complete
created: '2025-12-17'
tags:
  - ui
  - enhancement
  - developer-experience
priority: medium
created_at: '2025-12-17T11:21:38.645Z'
updated_at: '2025-12-17T11:29:37.733Z'
completed_at: '2025-12-17T11:29:37.733Z'
completed: '2025-12-17'
transitions:
  - status: complete
    at: '2025-12-17T11:29:37.733Z'
---

# UI Dynamic Port Allocation

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-12-17 · **Tags**: ui, enhancement, developer-experience

## Overview

The current LeanSpec UI implementation uses a hardcoded default port (3000). When this port is already in use by another service, the UI server fails to start, resulting in a poor developer experience with cryptic error messages.

**Problem**: Port 3000 conflicts are common in development environments where multiple Node.js services run simultaneously (React dev servers, Next.js apps, Vite, etc.). Users must manually kill conflicting processes or remember to specify `--port` flag every time.

**Solution**: Implement automatic port detection and allocation. When the specified port is unavailable, automatically find and use the next available port, similar to how Create React App, Vite, and other modern dev tools handle port conflicts.

**Impact**: 
- Eliminates port conflict errors
- Improves developer experience (zero-config startup)
- Maintains backward compatibility with explicit `--port` flag

## Design

### Technical Approach

Implement port availability detection before server startup using Node.js's built-in `net` module:

1. **Port Detection Logic**:
   - Try to bind to the requested port
   - If unavailable, increment port number and retry
   - Limit search range (e.g., try next 10 ports)
   - Display clear message showing actual port used

2. **Implementation Points**:
   - Add `findAvailablePort()` utility function in `packages/ui/bin/ui.js`
   - Call before spawning Next.js server process
   - Update console output to show actual port when different from requested
   - Pass resolved port to server via `PORT` environment variable

3. **User Experience**:
   ```
   ⚠ Port 3000 is in use, trying 3001...
   ✓ LeanSpec UI running on http://localhost:3001
   ```

### Architecture Decisions

**Why not use a library?** Node.js `net.Server` provides sufficient functionality for port detection. Adding a dependency for this simple task increases bundle size unnecessarily.

**Port search strategy**: 
- Start from requested port
- Try up to 10 consecutive ports
- Fail with clear error if no port available in range
- This matches behavior of popular tools (Vite, CRA, etc.)

**Configuration**:
- Respect explicit `--port` flag (user intent)
- Auto-detection only when using default port
- Consider adding `--strict-port` flag for CI/production use cases

## Plan

- [x] **Step 1**: Add port availability checker
  - Implement `isPortAvailable(port)` function using `net.createServer()`
  - Add unit tests for port checking logic

- [x] **Step 2**: Implement port resolution
  - Create `findAvailablePort(startPort, maxAttempts)` function
  - Return first available port or throw error if none found
  - Add logging for port scanning attempts

- [x] **Step 3**: Update UI launcher
  - Modify `startUi()` to call port resolution before server spawn
  - Update console messages to show actual port vs requested port
  - Handle edge cases (permission errors, port range exhausted)

- [x] **Step 4**: Update documentation
  - Update `packages/ui/README.md` with new behavior
  - Add examples showing automatic port allocation
  - Document `--strict-port` flag if implemented

- [x] **Step 5**: Testing
  - Manual testing with port conflicts
  - Test port range exhaustion scenario
  - Verify `--port` flag still works
  - Test dry-run mode output

## Test

**Functional Tests**:
- [x] Default behavior: Port 3000 available → uses 3000
- [x] Port conflict: 3000 in use → finds next available (3001, 3002, etc.)
- [x] Explicit port: `--port 4000` → uses exactly 4000 (with auto-fallback if unavailable)
- [x] Port exhaustion: All ports 3000-3009 in use → shows clear error
- [x] Edge cases: Invalid port range (>65535) → validation error

**User Experience Tests**:
- [x] Clear message shown when port changed
- [x] Browser opens with correct URL (actual port, not requested)
- [x] `--dry-run` shows actual resolved port
- [x] Terminal output distinguishes requested vs actual port

**Backward Compatibility**:
- [x] Existing `--port` flag works unchanged
- [x] Environment variable `PORT` still respected (via Next.js server)
- [x] Config file port setting works as before

## Implementation Summary

**Changes Made**:
1. Added `isPortAvailable(port)` function using Node.js `net.createServer()` to test port availability
2. Implemented `findAvailablePort(startPort, maxAttempts)` that tries up to 10 consecutive ports
3. Updated `startUi()` to resolve actual port before launching server or showing dry-run output
4. Added clear user feedback when port is automatically changed
5. Updated `packages/ui/README.md` with new port allocation section

**Implementation Details**:
- Port detection uses `0.0.0.0` binding (all network interfaces, matching Next.js server)
- Tries up to 10 consecutive ports before failing
- Shows warning for each port attempt: "⚠ Port 3000 is in use, trying 3001..."
- Confirms final port: "✓ Using port 3001"
- Works in both normal and `--dry-run` modes
- Zero configuration required - works out of the box

**Testing Results**:
- ✅ All manual tests passed
- ✅ Port conflict detection working correctly
- ✅ Automatic fallback to next available port
- ✅ Clear error messages when ports exhausted
- ✅ Backward compatibility maintained

## Notes

### Alternatives Considered

1. **Use `get-port` package**: Popular, well-tested, but adds unnecessary dependency
2. **Random port selection**: Less predictable for users
3. **Fail immediately**: Current behavior, poor UX
4. **Ask user interactively**: Delays startup, poor for scripts/CI

### Research Findings

- **Vite**: Tries next 10 ports, shows clear "Port 3000 is in use, trying 3001..." message
- **Create React App**: Similar behavior with "Something is already running on port 3000" message
- **Next.js dev**: Shows error and suggests alternative port but doesn't auto-switch

### Future Enhancements

- Add `--strict-port` flag for CI environments (fail instead of auto-resolve)
- Consider port preference persistence (last successful port)
- Add port range configuration in `leanspec.yaml`

### Post-Implementation Issues

**Issue**: Address binding mismatch (2025-12-17)
- **Problem**: Initial implementation bound port checker to `127.0.0.1`, but Next.js server binds to `0.0.0.0`
- **Symptom**: Port detection succeeded but server startup failed with `EADDRINUSE: address already in use 0.0.0.0:3000`
- **Root Cause**: Different network interfaces - `127.0.0.1` (localhost only) vs `0.0.0.0` (all interfaces)
- **Fix**: Changed `isPortAvailable()` to bind to `0.0.0.0` to match Next.js server behavior
- **Lesson**: Port availability checks must use the same binding address as the actual server

**Test Results After Fix**:
```
⚠ Port 3000 is in use, trying 3001...
⚠ Port 3001 is in use, trying 3002...
✓ Using port 3002
```
✅ Now working as designed - automatically finds next available port with clear user feedback

### Implementation Reference

Core port detection pattern:
```javascript
import { createServer } from 'node:net';

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    // IMPORTANT: Use '0.0.0.0' to match Next.js server binding
    server.listen(port, '0.0.0.0');
  });
}
```
