---
status: planned
created: 2026-02-27
priority: high
tags:
- ui
- sessions
- ux
- prompt-input
- frontend
depends_on:
- 328-session-context-redesign
created_at: 2026-02-27T03:35:03.152191Z
updated_at: 2026-02-27T03:35:09.906837Z
---
# Session Creation UX: Prompt-First with Context Attachments

## Overview

The current "Create AI Session" dialog uses a traditional form layout that doesn't match natural AI interaction patterns. Two additional problems compound this:

1. **Black-box prompt**: The backend silently wraps user input with `"Implement the following specs:\n\n{content}"` via `build_context_prompt()` — users never see or control the system template that drives their session.
2. **Inconsistent spec context**: Session creation supports spec attachment, but the AI chat `PromptInput` has unused `usePromptInputReferencedSources` infrastructure. Both surfaces should share the same spec-as-context pattern.

**Goal**: Redesign session creation as a prompt-first experience with transparent, customizable prompt defaults and a reusable spec-context pattern shared between sessions and chat.

## Requirements

### Prompt-First Input
- [ ] Replace the form-based dialog with a prompt-centric layout using the `PromptInput` component
- [ ] The prompt textarea is the primary and most prominent element
- [ ] Support Enter-to-submit (Shift+Enter for newlines)

### Visible & Customizable Prompt Default
- [ ] Show users the effective prompt that will be sent to the runner (no hidden assembly)
- [ ] Provide a sensible default prompt template when specs are attached (e.g., editable "Implement the following specs" preamble)
- [ ] Users can edit or replace the default — the template is a starting point, not a locked behavior
- [ ] Backend API: make `prompt` truly optional; when omitted, the backend applies a configurable default template (not hardcoded in `build_context_prompt`)
- [ ] Consider a project-level prompt template config (e.g., in `.lean-spec/config.yaml`) so teams can customize
- [ ] The composed prompt (template + specs) should be previewable before session start

### Specs as Context Attachments (Shared Pattern)
- [ ] Replace single `SpecSearchSelect` dropdown with a multi-spec context attachment pattern
- [ ] Add a context button (e.g., `@` or `+` icon) that opens a spec search popover
- [ ] Display attached specs as inline chips/badges near the prompt textarea
- [ ] Allow removing individual attached specs via chip dismiss button
- [ ] Pre-populate with `defaultSpecId` when provided
- [ ] Wire `usePromptInputReferencedSources` so referenced sources are included in `onSubmit` message
- [ ] **Reuse the same spec attachment UI in the AI chat input** — both sessions and chat share one pattern

### Runner & Mode Selectors
- [ ] Display runner and mode as compact inline selectors in the footer area (pill/button style)
- [ ] Runner selector shows currently selected runner with dropdown on click
- [ ] Mode selector shows current mode with toggle or dropdown
- [ ] Keep existing runner auto-detection logic

### Layout & Interaction
- [ ] Remove the full `Dialog` wrapper — consider a panel/inline approach
- [ ] Auto-focus the prompt textarea on open
- [ ] Show error state inline
- [ ] Submit button integrated into the prompt input

## Non-Goals

- No custom prompt templates marketplace or sharing mechanism
- No changes to session list/detail views (covered by spec 249)
- No file attachments for sessions (only spec context)

## Technical Notes

### Key Files
- `packages/ui/src/components/sessions/session-create-dialog.tsx` — current component to redesign
- `packages/ui/src/components/library/ai-elements/prompt-input.tsx` — prompt input (wire referenced sources)
- `packages/ui/src/components/chat/chat-sidebar.tsx` — chat must also adopt spec-context pattern
- `packages/ui/src/components/chat/chat-container.tsx` — chat container to integrate spec context
- `rust/leanspec-core/src/sessions/manager.rs` — `build_context_prompt()` to make configurable
- `rust/leanspec-core/src/ai_native/chat.rs` — chat system prompt (related)

### Backend Changes Required
The current `build_context_prompt()` hardcodes `"Implement the following specs:\n\n"`. This must be either:
1. Moved to a configurable template in `.lean-spec/config.yaml`, or
2. Sent from the frontend as part of the prompt (making the assembly transparent)

The `PromptInputMessage` type must be extended to include referenced sources in `onSubmit`.

## Acceptance Criteria

- Session creation feels like starting an AI conversation, not filling a form
- Users can see and edit the full prompt that drives the session (no hidden assembly)
- Default prompt template is sensible but not locked — users control it
- Specs are attachable as context in both session creation AND AI chat using the same UI pattern
- `usePromptInputReferencedSources` is wired end-to-end in `PromptInput`
- Runner and mode are visible but secondary to the prompt
- Existing `defaultSpecId` prop still works