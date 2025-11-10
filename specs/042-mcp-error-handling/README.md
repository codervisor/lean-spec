---
status: complete
created: '2025-11-04'
tags:
  - bug
  - mcp
  - stability
  - error-handling
priority: critical
related:
  - 043-official-launch-02
completed: '2025-11-04'
---

# MCP Server Should Not Exit on Tool Errors

> **Status**: ✅ Complete · **Priority**: Critical · **Created**: 2025-11-04 · **Tags**: bug, mcp, stability, error-handling

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Critical bug:** When MCP server tool calls encounter errors (e.g., spec not found), the commands call `process.exit(1)`, crashing the entire MCP server and terminating the agent chat session.

**Example from logs:**
```
2025-11-04 15:31:05.575 [warning] [server stderr] Error: Spec not found: 041-simplify-viewer-commands
2025-11-04 15:31:05.578 [info] Connection state: Error Process exited with code 1
```

**Impact:**
- 🔴 **Crashes entire agent session** - User loses context and has to restart
- 🔴 **No graceful error handling** - Agent can't recover or try alternatives
- 🔴 **Poor UX** - Single typo in spec name kills the session
- 🔴 **Violates MCP protocol** - Tools should return error objects, not exit

**Root cause:** Commands like `showCommand`, `viewCommand`, `readCommand`, `openCommand`, etc. call `process.exit(1)` on errors. This is fine for CLI usage but catastrophic when called from MCP server.

## Design

### Solution: Never Exit, Return Errors

MCP tools should **never** call `process.exit()`. Instead, they should:
1. Throw errors that the MCP server catches
2. Return error responses via MCP protocol
3. Let the agent handle the error gracefully

### Code Changes Needed

**1. Update all viewer commands to throw instead of exit:**

```typescript
// BEFORE (crashes MCP server)
if (!spec) {
  console.error(chalk.red(`Error: Spec not found: ${specPath}`));
  process.exit(1);
}

// AFTER (returns error to agent)
if (!spec) {
  throw new Error(`Spec not found: ${specPath}. Try: lean-spec list`);
}
```

**2. Wrap MCP tool handlers with error catching:**

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    // ... tool logic ...
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});
```

**3. Remove console.error() from commands when used via MCP:**

Commands should accept a `silent` option or check if they're running in MCP mode:

```typescript
export async function showCommand(
  specPath: string,
  options: {
    noColor?: boolean;
    throwErrors?: boolean;  // NEW: for MCP usage
  } = {}
): Promise<void> {
  const spec = await readSpecContent(specPath, process.cwd());
  
  if (!spec) {
    const message = `Spec not found: ${specPath}. Try: lean-spec list`;
    if (options.throwErrors) {
      throw new Error(message);  // MCP mode
    } else {
      console.error(chalk.red(`Error: ${message}`));  // CLI mode
      process.exit(1);
    }
  }
  // ...
}
```

### Files to Update

**Commands with process.exit():**
- `src/commands/viewer.ts` (5 instances: showCommand, readCommand, openCommand)
- `src/commands/update.ts` (likely has exit calls)
- `src/commands/archive.ts` (likely has exit calls)
- Any other command that calls `process.exit()`

**MCP Server:**
- `src/mcp-server.ts` - Add try/catch to all tool handlers
- Ensure tool responses include `isError: true` for errors

## Plan

- [ ] Audit all command files for `process.exit()` calls
- [ ] Add `throwErrors` option to all command functions
- [ ] Update viewer commands to throw instead of exit when `throwErrors: true`
- [ ] Update MCP tool handlers to pass `throwErrors: true`
- [ ] Wrap all MCP tool handlers in try/catch
- [ ] Return proper error responses via MCP protocol
- [ ] Test error scenarios (spec not found, invalid input, etc.)
- [ ] Verify MCP server stays alive after errors
- [ ] Update tests to verify both CLI and MCP modes

## Test

### MCP Error Handling Tests

- [ ] Call `lean-spec_update` with non-existent spec → returns error, server stays alive
- [ ] Call `lean-spec_read` with non-existent spec → returns error, server stays alive
- [ ] Try to create spec with invalid name → returns error, server stays alive
- [ ] Multiple consecutive errors → server handles all gracefully
- [ ] Agent session remains active after tool errors
- [ ] Error messages are clear and actionable

### CLI Behavior Tests

- [ ] CLI commands still exit with code 1 on errors (backward compat)
- [ ] Error messages still display properly in terminal
- [ ] No regression in CLI UX

### Manual Verification

```bash
# Test MCP via VS Code Copilot
1. Try to update non-existent spec: @lean-spec update 999-fake
2. Verify: Error message appears, chat continues
3. Try valid command after error: @lean-spec list
4. Verify: Works normally, server didn't crash
```

## Notes

**Why this is critical:**
- MCP servers are long-running processes shared across multiple agent interactions
- A single tool error shouldn't kill the entire server
- This violates the MCP protocol design (tools return errors, not crash)

**MCP Protocol Spec:**
From the MCP documentation, tools should return:
```json
{
  "content": [{"type": "text", "text": "error message"}],
  "isError": true
}
```

NOT: `process.exit(1)`

**Related Issues:**
- This affects ALL commands, not just viewer commands
- Need consistent error handling strategy across codebase
- Consider creating a `CommandContext` class to handle CLI vs MCP modes

**Alternative Approaches Considered:**
1. ~~Catch process.exit() globally~~ - Too hacky, hard to debug
2. ~~Spawn commands in child processes~~ - Too complex, performance overhead
3. **Add throwErrors flag** - ✅ Clean, explicit, testable

**Follow-up Work:**
- Create consistent error handling pattern for all commands
- Add logging/telemetry for MCP errors
- Document command authoring guidelines (never use process.exit in shared code)
