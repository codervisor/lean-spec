# Implementation: Migration Command

Implementation plan and testing strategy for `lean-spec migrate`.

## Migration Workflow

```
┌─────────────────────────────────────────┐
│ 1. Scan Input Path                      │
│    - Find all documents (format-agnostic)│
│    - Count files to migrate             │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │ --with specified? │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        NO                 YES
        │                   │
┌───────▼────────┐  ┌───────▼──────────────┐
│ 2a. Manual     │  │ 2b. Verify AI CLI    │
│     Mode       │  │                      │
│                │  │ - Check installed    │
│ Generate       │  │ - Verify version     │
│ generic prompt │  │ - Test connectivity  │
│ Output to user │  │                      │
└────────────────┘  └──────────┬───────────┘
                               │
                               │ ✓ Verified
                               │
                    ┌──────────▼─────────────┐
                    │ 3. AI Auto-Execute     │
                    │                        │
                    │ - AI analyzes format   │
                    │ - Batch documents      │
                    │ - Execute migration    │
                    │ - Create specs         │
                    │ - Set metadata         │
                    └──────────┬─────────────┘
                               │
                    ┌──────────▼─────────┐
                    │ 4. Validate        │
                    │    - Run validate  │
                    │    - Check links   │
                    │    - Report status │
                    └────────────────────┘
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Basic command structure and manual mode

- [ ] Create `migrate` command scaffold in CLI
- [ ] Implement document scanning (format-agnostic file finder)
- [ ] Build generic migration prompt generator
- [ ] Add instruction output for manual mode
- [ ] Basic error handling (path not found, no files)

**Deliverable**: `lean-spec migrate <path>` outputs migration prompt

### Phase 2: Manual Migration (Week 1-2)

**Goal**: Refine prompt for real-world use

- [ ] Refine generic migration instructions based on feedback
- [ ] Add examples for common formats (ADR, RFC, Linear)
- [ ] Test prompt with ChatGPT, Claude, Copilot
- [ ] Validate with real-world document sets (5+ projects)
- [ ] Document manual migration workflow

**Deliverable**: Users can successfully migrate using manual mode

### Phase 3: AI CLI Integration (Week 2-3)

**Goal**: Automated AI-assisted migration

- [ ] Design AI CLI tool registry (copilot, claude, gemini)
- [ ] Implement CLI verification (`which`, version check)
- [ ] Add error handling for missing/outdated tools
- [ ] Implement AI CLI execution for each provider
- [ ] Add `--dry-run` mode
- [ ] Add post-migration validation

**Deliverable**: `lean-spec migrate <path> --with copilot` auto-migrates

### Phase 4: Testing & Documentation (Week 3)

**Goal**: Production-ready quality

- [ ] Integration tests with sample repos
- [ ] Test AI CLI detection and execution
- [ ] Add migration guide to docs site
- [ ] Create migration examples/tutorials
- [ ] Performance testing (100+ documents)

**Deliverable**: Documented, tested, production-ready feature

### Phase 5: Polish for 0.2 (Week 4)

**Goal**: Great user experience

- [ ] CLI UX improvements (colors, formatting)
- [ ] Progress indicators for batch processing
- [ ] Error message clarity and actionability
- [ ] Migration report summary with stats
- [ ] Beta user testing and feedback

**Deliverable**: Ship-ready feature for 0.2 launch

## Testing Strategy

### Unit Tests

- [ ] Document scanning finds all files correctly
- [ ] Prompt generation includes all required instructions
- [ ] AI CLI detection works for all providers
- [ ] Version parsing and comparison logic
- [ ] Error messages are clear and actionable
- [ ] Command-line argument parsing

### Integration Tests

**Basic Migration:**
- [ ] Migrate sample ADR repository (10+ docs)
- [ ] Migrate sample RFC repository
- [ ] Mixed format migration (various doc types)
- [ ] Empty directory handling
- [ ] Single file migration

**AI-Assisted Mode:**
- [ ] AI CLI detection (installed/missing/outdated)
- [ ] AI CLI execution completes successfully
- [ ] Dry-run produces no actual changes
- [ ] Validation runs after migration
- [ ] Error handling when AI CLI fails

**Edge Cases:**
- [ ] Very large repos (100+ documents)
- [ ] Nested directory structures
- [ ] Special characters in filenames
- [ ] Duplicate document names
- [ ] Partial migration (some docs fail)

### Real-World Validation

- [ ] Migrate actual ADR repo from open source project
- [ ] Migrate actual RFC repo from open source project
- [ ] User testing with 3+ beta users
- [ ] AI-assisted migration accuracy >90%
- [ ] Test with all 3 AI providers (Copilot, Claude, Gemini)

### Performance Tests

- [ ] Migrate 10 documents: <1 minute (manual mode)
- [ ] Migrate 100 documents: <5 minutes (manual mode)
- [ ] Migrate 100 documents: <15 minutes (AI mode)
- [ ] Memory usage stable with large repos
- [ ] No memory leaks during batch processing

## Future Enhancements

**Post-0.2 Improvements:**

- **Bidirectional sync**: Export LeanSpec back to source format
- **Incremental migration**: Auto-migrate new docs as they appear
- **Custom mappings**: User-defined source → LeanSpec rules
- **Web UI**: Visual migration tool with preview
- **Progress tracking**: Resume interrupted migrations
- **Conflict resolution**: Interactive UI for duplicate handling
- **Attachment support**: Migrate images/diagrams from source
- **Relationship mapping**: Auto-detect and link related specs

## Open Questions

**For team discussion:**

1. Should we support exporting back to source format?
2. How to handle complex relationships (ADR supersedes)?
3. Should AI mode require explicit consent/confirmation?
4. Support for attachments/images in source docs?
5. Should we cache AI responses for retry scenarios?
6. How to handle rate limits on AI CLI tools?
