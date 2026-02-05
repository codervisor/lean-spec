---
status: planned
created: 2026-02-05
priority: medium
tags:
- i18n
- web-app
- ai
- translation
created_at: 2026-02-05T08:02:16.294313312Z
updated_at: 2026-02-05T08:02:16.294313312Z
---

# AI-Powered Spec Translation with Persistence

> **Status**: 🗓️ Planned · **Priority**: Medium · **Tags**: i18n, web-app, ai, translation

## Overview

**Problem**: Developers need to read specs written in languages they don't understand. The previous approach (spec 143) proposed external translation APIs which adds complexity and costs.

**Solution**: Leverage the existing AI provider infrastructure (AISettingsTab) for on-demand spec translation with local persistence to prevent redundant API calls.

**Key advantages**:
- **Zero new integrations** - Reuses configured LLM providers (OpenAI, Anthropic, etc.)
- **Context-aware** - LLMs understand markdown/spec structure natively
- **Cached translations** - Persisted locally, regenerated only when source changes
- **User's choice of model** - Uses their preferred/configured provider

## Design

### Translation Flow

1. User clicks "Translate" button in spec detail view
2. System checks if cached translation exists and source hasn't changed
3. If cache miss/stale: Call configured LLM with translation prompt
4. Store translated content with source hash for cache invalidation
5. Display translated content with toggle to original

### Persistence Strategy

**Storage location**: `~/.leanspec/translations/{project-id}/{spec-path}/{lang}.md`

- `project-id`: Hash or slug of project root path for uniqueness
- Ensures translations are scoped per project (multi-project mode safe)

**Cache validation**:
```typescript
interface CachedTranslation {
  sourceHash: string;      // MD5 of original content
  targetLang: string;      // e.g., "zh-Hans", "en"
  translatedContent: string;
  translatedAt: string;    // ISO timestamp
  modelUsed: string;       // e.g., "gpt-4o", "claude-sonnet-4-20250514"
  projectPath: string;     // Original project root for reference
}
```

- On translate request, compare `sourceHash` with current spec content hash
- If match → return cached translation
- If mismatch → regenerate and update cache

### Translation Prompt

```
Translate the following markdown spec to {targetLanguage}.

Rules:
1. Preserve all YAML frontmatter keys (only translate values)
2. Keep code blocks, file paths, and URLs unchanged
3. Preserve markdown formatting (headers, lists, bold, links)
4. Keep technical terms in English when appropriate
5. Maintain the same structure and section order

---
{specContent}
```

### API Integration

**New endpoints**:
- `GET /api/specs/:specPath/translations/:lang` - Get cached or fresh translation
- `DELETE /api/specs/:specPath/translations/:lang` - Invalidate cache

**Backend flow**:
1. Check cache file exists and hash matches
2. If valid cache → return content
3. Else → call `/api/chat/completions` with translation prompt using configured default provider
4. Save to cache file and return

### UI Components

**Spec Detail Header additions**:
- "Translate" dropdown button with language options
- Languages: English, 简体中文, 日本語 (expandable)
- Toggle indicator: "Viewing: Original | Translated (中文)"
- "Refresh translation" button when viewing translated content

## Plan

- [ ] Create translation cache directory structure and types
- [ ] Implement cache read/write utilities with hash validation
- [ ] Add `/api/specs/:specPath/translations/:lang` endpoint
- [ ] Create translation prompt template
- [ ] Add "Translate" dropdown to SpecDetailHeader component
- [ ] Implement translated content display with original toggle
- [ ] Add "Refresh translation" action for manual cache invalidation
- [ ] Handle translation errors gracefully (fallback to original)

## Test

- [ ] Cache is created on first translation request
- [ ] Subsequent requests return cached content (no API call)
- [ ] Cache invalidates when spec content changes
- [ ] Manual refresh regenerates translation
- [ ] Code blocks and frontmatter keys preserved
- [ ] Original/translated toggle works correctly
- [ ] Graceful fallback when no AI provider configured
- [ ] Translations isolated per project (multi-project mode)

## Non-Goals

- Real-time translation (too expensive, unnecessary)
- Support for all languages (start with EN ↔ ZH)
- Translation of non-spec content
- Cloud sync of translations (local cache only)

## Notes

**Why this supersedes spec 143**:
- No external API integration needed (Google Translate, etc.)
- Uses existing provider infrastructure from AISettingsTab
- Higher quality translations due to LLM context awareness
- Simpler implementation path

**Dependencies**: Requires at least one AI provider configured in settings.
