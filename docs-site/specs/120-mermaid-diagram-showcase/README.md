---
status: complete
created: '2025-11-25'
tags:
  - test
  - ui
  - mermaid
  - visualization
priority: medium
created_at: '2025-11-25T12:52:24.676Z'
related:
  - 119-ui-diagram-rendering
updated_at: '2025-11-26T08:24:39.899Z'
completed_at: '2025-11-26T08:24:39.899Z'
completed: '2025-11-26'
transitions:
  - status: complete
    at: '2025-11-26T08:24:39.899Z'
---

# Mermaid Diagram Showcase

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-25 · **Tags**: test, ui, mermaid, visualization

**Project**: lean-spec  
**Team**: Core Development

## Overview

This spec serves as a test fixture for validating Mermaid diagram rendering in the LeanSpec UI. It contains various diagram types to ensure the `@leanspec/ui` package correctly renders all supported Mermaid diagram formats.

**Related**: See spec 119 (UI Diagram Rendering) for the implementation details.

## Diagram Examples

### Flowchart

A basic flowchart showing a decision process:

```mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
```

### Sequence Diagram

Illustrating component interactions:

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Core
    participant FileSystem
    
    User->>CLI: lean-spec create my-feature
    CLI->>Core: createSpec(name, options)
    Core->>FileSystem: mkdir(specsDir/name)
    FileSystem-->>Core: success
    Core->>FileSystem: writeFile(README.md)
    FileSystem-->>Core: success
    Core-->>CLI: Spec created
    CLI-->>User: ✓ Created: specs/my-feature/
```

### Class Diagram

Showing the core architecture:

```mermaid
classDiagram
    class Spec {
        +string id
        +string name
        +string status
        +string[] tags
        +string priority
        +getContent()
        +updateMetadata()
    }
    
    class SpecManager {
        +Spec[] specs
        +create(name)
        +update(id, data)
        +delete(id)
        +search(query)
    }
    
    class FileSystem {
        +read(path)
        +write(path, content)
        +exists(path)
    }
    
    SpecManager --> Spec
    SpecManager --> FileSystem
```

### State Diagram

Spec lifecycle states:

```mermaid
stateDiagram-v2
    [*] --> Planned: create
    Planned --> InProgress: start work
    InProgress --> Complete: finish
    InProgress --> Blocked: issue found
    Blocked --> InProgress: resolved
    Complete --> Archived: archive
    Archived --> [*]
```

### Entity Relationship Diagram

Spec relationships model:

```mermaid
erDiagram
    SPEC ||--o{ TAG : has
    SPEC ||--o{ TRANSITION : records
    SPEC }o--o{ SPEC : depends_on
    SPEC }o--o{ SPEC : related_to
    
    SPEC {
        string id
        string name
        string status
        string priority
        datetime created_at
        datetime updated_at
    }
    
    TAG {
        string name
    }
    
    TRANSITION {
        string status
        datetime at
    }
```

### Gantt Chart

Project timeline visualization:

```mermaid
gantt
    title Sample Feature Development
    dateFormat  YYYY-MM-DD
    section Phase 1
    Research         :done, p1, 2024-01-01, 14d
    Design           :done, p2, after p1, 7d
    section Phase 2
    Implementation   :active, p3, after p2, 21d
    Testing          :p4, after p3, 14d
    section Phase 3
    Documentation    :p5, after p4, 7d
    Release          :milestone, after p5, 0d
```

### Pie Chart

Spec status distribution:

```mermaid
pie title Spec Status Distribution
    "Complete" : 45
    "In Progress" : 8
    "Planned" : 12
    "Archived" : 35
```

### Git Graph

Branch and merge visualization:

```mermaid
gitGraph
    commit id: "init"
    branch feature/mermaid
    checkout feature/mermaid
    commit id: "add mermaid"
    commit id: "add themes"
    checkout main
    merge feature/mermaid
    commit id: "release"
```

## Test Criteria

### Rendering Tests
- [ ] Flowchart renders with correct node shapes and arrows
- [ ] Sequence diagram shows all participants and messages
- [ ] Class diagram displays classes with attributes and methods
- [ ] State diagram shows states and transitions
- [ ] ER diagram renders entities and relationships
- [ ] Gantt chart displays timeline correctly
- [ ] Pie chart shows segments with labels
- [ ] Git graph shows branches and commits

### Theme Support
- [ ] Diagrams render correctly in light mode
- [ ] Diagrams render correctly in dark mode
- [ ] Theme switching updates diagram colors

### Error Handling
- [ ] Invalid syntax shows error message
- [ ] Fallback to code block on render failure

## Notes

This spec is intentionally kept as a test fixture and should not be marked as complete or archived. It serves as a living reference for validating diagram rendering functionality in the UI package.
