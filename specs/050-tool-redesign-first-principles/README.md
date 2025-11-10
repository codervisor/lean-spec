---
status: planned
created: '2025-11-05'
tags:
  - architecture
  - cli
  - mcp
  - redesign
  - first-principles
  - dx
  - v0.3.0
priority: medium
related:
  - 049-leanspec-first-principles
  - 048-spec-complexity-analysis
  - 043-official-launch-02
created_at: '2025-11-05T00:00:00Z'
updated_at: '2025-11-05T05:03:54.951Z'
---

# Tool Redesign: First Principles Application

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-05 · **Tags**: architecture, cli, mcp, redesign, first-principles, dx, v0.3.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Purpose**: Redesign CLI and MCP tools by applying the 5 LeanSpec first principles from spec 049, creating tools that practice what we preach.

**Why Now**: 
- We've established clear first principles (spec 049)
- Current tools evolved organically without systematic design
- Need to dogfood our own philosophy in the implementation
- Opportunity to showcase first-principles thinking in practice

**Key Insight**: Tools should embody the philosophy they enable. If LeanSpec optimizes for Context Economy and Signal-to-Noise, our tools must do the same.

**Result**: Redesigned CLI and MCP that demonstrate first principles through their interface design, implementation structure, and user experience.

## Background

### Current Tool State

**CLI (`lean-spec` command)**:
- 15+ commands with inconsistent patterns
- Some commands do too much (`stats` vs `stats --full`)
- Error messages vary in helpfulness
- No clear mental model for users

**MCP Server**:
- Good functionality but complex interface
- Some operations require multiple round-trips
- Not optimized for AI agent workflows
- Error handling inconsistent

### The First Principles (from spec 049)

1. **Context Economy** - Fit in working memory (human + AI)
2. **Signal-to-Noise Maximization** - Every word must inform decisions
3. **Progressive Disclosure** - Start simple, add complexity when pain is felt
4. **Intent Over Implementation** - Capture why, not just how
5. **Bridge the Gap** - Align human intent with machine execution

### Design Constraints

**Human Usage** (CLI):
- Working memory: 7±2 items
- Need discoverable commands
- Want quick feedback loops
- Prefer consistent patterns

**AI Usage** (MCP):
- Token efficiency critical
- Clear success/failure states
- Batching for complex operations
- Structured, parseable output

## Design

### Core Philosophy: Tools as Philosophy Demo

**Principle**: Our tools should be the best example of LeanSpec thinking.

**Application**: Every command, parameter, and output designed through first-principles lens.

### CLI Redesign: Progressive Command Structure

**Current Problem**: 15 commands with no clear organization
**Solution**: Group by mental model, progressive disclosure

#### Level 1: Discovery (Context Economy)
```bash
lean-spec                    # Show overview + 3 most common commands
lean-spec help               # Show all commands, grouped by purpose
lean-spec status             # Project health at-a-glance
```

#### Level 2: Core Operations (Signal-to-Noise)
```bash
# View/Navigate (most common)
lean-spec list              # Smart defaults, most relevant first
lean-spec view <spec>       # Single spec, optimized display
lean-spec search <query>    # Focused search with ranking

# Modify (when needed)
lean-spec create <name>     # Guided creation with templates
lean-spec update <spec>     # Status/metadata only
lean-spec edit <spec>       # Open in editor

# Project (occasional)
lean-spec board            # Kanban view
lean-spec stats            # Key metrics only
```

#### Level 3: Advanced (Progressive Disclosure)
```bash
# Analysis (when pain is felt)
lean-spec validate         # Check first principles adherence  
lean-spec complexity       # Detailed complexity analysis
lean-spec deps <spec>      # Relationship analysis
lean-spec split <spec>     # Guided spec splitting

# Power User (specific needs)
lean-spec stats --full     # Comprehensive analytics
lean-spec export           # Various formats
lean-spec init             # Project setup
```

**Key Changes**:
- Grouped by frequency of use (Context Economy)
- Each command has single clear purpose (Signal-to-Noise)  
- Advanced features hidden until needed (Progressive Disclosure)
- Intent clear from command name (Intent Over Implementation)
- Same patterns work for humans and AI (Bridge the Gap)

### MCP Redesign: Batch-First Architecture

**Current Problem**: Many small operations, chatty interface
**Solution**: Batch operations, rich context in responses

#### Core Operations
```typescript
// Single spec operations (atomic)
view(specPath: string, options?: ViewOptions) -> SpecWithContext
update(specPath: string, changes: SpecChanges) -> SpecWithContext
create(name: string, template: SpecTemplate) -> SpecWithContext

// Multi-spec operations (batched) 
list(filters?: Filters) -> SpecSummary[]
search(query: string, options?: SearchOptions) -> SearchResults
board() -> KanbanBoard

// Project operations (contextual)
stats(level?: 'basic' | 'full') -> ProjectStats  
validate(specs?: string[]) -> ValidationReport
health() -> ProjectHealth
```

**Key Changes**:
- Rich context in every response (Context Economy for AI)
- Structured errors with actionable guidance (Signal-to-Noise)
- Batch operations reduce round-trips (Progressive Disclosure)
- Clear success/failure states (Intent Over Implementation)
- Same data structure for CLI/MCP (Bridge the Gap)

### Shared Principles: Output Design

#### Context Economy in Output
```bash
# Bad: Information overload
lean-spec list
049-leanspec-first-principles | planned | created: 2025-11-04 | priority: critical | tags: philosophy,meta,foundation,principles | related: 048-spec-complexity-analysis,043-official-launch-02,012-sub-spec-files | 1,042 lines (warning: >400) | last modified: 2 hours ago

# Good: Essential info, detail on demand  
lean-spec list
📋 049 leanspec-first-principles (critical)
✅ 048 spec-complexity-analysis 
🔄 047 git-timestamps (in-progress)

lean-spec list --verbose  # Detail when requested
lean-spec view 049        # Full context for specific spec
```

#### Signal-to-Noise in Commands
```bash
# Bad: Ambiguous what it does
lean-spec show 049 --with-meta --include-related --format=detailed

# Good: Clear intent, smart defaults
lean-spec view 049        # Show spec (formatted by default)
lean-spec view 049 --raw  # Raw when needed (progressive disclosure)
lean-spec view 049 --json # Structured when needed
```

### Implementation Strategy

#### Phase 1: CLI Core Redesign
- Implement new command grouping
- Standardize output formats  
- Add progressive disclosure patterns
- Maintain backward compatibility with deprecation warnings

#### Phase 2: MCP Optimization
- Implement batch operations
- Standardize response structures
- Add rich error context
- Optimize for AI workflows

#### Phase 3: Integration
- Ensure CLI and MCP use same core logic
- Unified configuration system
- Consistent behavior across interfaces
- Performance optimization

## Plan

### Phase 1: Foundation (Week 1-2)
**Goal**: New CLI command structure with backward compatibility

**Tasks**:
- [ ] Design new command hierarchy 
- [ ] Implement core command groups (view/modify/project)
- [ ] Add progressive disclosure for advanced commands
- [ ] Create unified output formatting system
- [ ] Add deprecation warnings for old patterns
- [ ] Update help system to show grouped commands

**Success Criteria**:
- New users find commands intuitively
- Output fits in terminal without scrolling (Context Economy)
- Every command has single clear purpose (Signal-to-Noise)

### Phase 2: MCP Optimization (Week 3-4)  
**Goal**: Batch-first MCP with rich context

**Tasks**:
- [ ] Implement batch operations for multi-spec workflows
- [ ] Redesign response structures with full context
- [ ] Add structured error handling with actionable guidance
- [ ] Optimize for common AI agent patterns
- [ ] Create MCP performance benchmarks

**Success Criteria**:
- AI agents can accomplish tasks in fewer round-trips
- Rich context reduces need for additional queries
- Clear success/failure states for all operations

### Phase 3: Integration & Polish (Week 5-6)
**Goal**: Unified experience across interfaces

**Tasks**:
- [ ] Ensure CLI and MCP use same underlying logic
- [ ] Create unified configuration system
- [ ] Add cross-interface consistency tests
- [ ] Performance optimization and profiling
- [ ] Documentation updates reflecting new philosophy

**Success Criteria**:
- Identical behavior between CLI and MCP for same operations
- Performance meets or exceeds current implementation
- Documentation demonstrates first principles in practice

### Phase 4: Validation (Week 7)
**Goal**: Prove we practice what we preach

**Tasks**:
- [ ] User testing with both interfaces
- [ ] Measure adherence to first principles
- [ ] Gather feedback from AI agent usage
- [ ] Performance benchmarking
- [ ] Create case studies of improvements

**Success Criteria**:
- Tools demonstrate all 5 first principles
- Users report improved experience
- AI agents more efficient in workflows
- Implementation serves as reference for first-principles design

## Test

### First Principles Validation

**Context Economy** (Tools fit in working memory):
- [ ] CLI commands grouped into 3 clear levels
- [ ] MCP operations batchable to reduce context
- [ ] Output designed for human/AI consumption limits

**Signal-to-Noise Maximization** (Every element informs decisions):
- [ ] Each command has single clear purpose
- [ ] Output contains only actionable information
- [ ] Error messages guide toward resolution

**Progressive Disclosure** (Complexity when pain is felt):
- [ ] Basic commands handle 80% of use cases
- [ ] Advanced features available but not prominent
- [ ] `--verbose` and detailed modes for when needed

**Intent Over Implementation** (Why, not just how):
- [ ] Command names reflect user goals, not system operations
- [ ] Help text explains purpose, not just syntax
- [ ] Error messages explain what user was trying to achieve

**Bridge the Gap** (Human + AI alignment):
- [ ] Same operations available in CLI and MCP
- [ ] Consistent data structures across interfaces
- [ ] Output formats optimized for both human and machine parsing

### User Experience Tests

**New User Journey**:
- [ ] Can discover main commands in <2 minutes
- [ ] Can complete basic workflow (create/view/update) without documentation
- [ ] Advanced features discoverable when needed

**AI Agent Efficiency**:
- [ ] Common workflows require fewer tool calls
- [ ] Batch operations reduce token usage
- [ ] Error recovery is automated where possible

**Performance Benchmarks**:
- [ ] CLI response time <100ms for common commands
- [ ] MCP operations complete in comparable time to current implementation  
- [ ] Memory usage within acceptable bounds

### Philosophy Demonstration

**Can we say our tools demonstrate LeanSpec?**:
- [ ] Tools embody the principles they enable
- [ ] Implementation structure follows first principles
- [ ] User experience optimized through first-principles lens
- [ ] Tools serve as reference implementation for philosophy

## Success Metrics

**Quantitative**:
- CLI command discovery time: <2 minutes (vs current ~5 minutes)
- AI agent efficiency: 30% fewer tool calls for common workflows
- User task completion: 90% success rate without documentation
- Performance: Match or exceed current implementation

**Qualitative**:
- Tools feel "lean" and focused
- Clear mental model for command organization
- AI agents can use efficiently without extensive prompting
- Implementation demonstrates first principles in practice

**Philosophy Validation**:
- Tools practice what LeanSpec preaches
- Can point to tools as examples of first-principles thinking
- Users understand LeanSpec philosophy through tool usage
- Tools serve as template for future first-principles design

## Notes

### Why This Redesign Matters

This is foundational work because:
- **Credibility**: Tools must practice LeanSpec philosophy  
- **Usability**: First principles create better user experiences
- **Teaching**: Tools become examples of the methodology
- **Scaling**: Systematic design enables growth without complexity creep

### Key Design Decisions

**Progressive Command Hierarchy**: Instead of flat command list, organize by frequency and complexity
**Batch-First MCP**: Optimize for AI workflows while maintaining human usability
**Unified Output**: Same data structures work for both CLI and MCP consumption
**First-Principles Validation**: Every design decision justified by the 5 principles

### Success Indicators

We'll know this succeeded when:
- New users intuitively discover commands
- AI agents accomplish tasks more efficiently  
- Tools feel like natural extensions of LeanSpec thinking
- Implementation becomes reference for first-principles design

---

**Remember**: We're not just building better tools. We're proving that LeanSpec philosophy creates superior user experiences when applied systematically.
