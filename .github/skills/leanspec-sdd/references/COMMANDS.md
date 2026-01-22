# Command Reference

Complete reference for LeanSpec CLI commands. For quick help, run `lean-spec --help` or `lean-spec <command> --help`.

## Discovery Commands

### List Specs
```bash
lean-spec list
```
See all specs in your project.

### Search Specs
```bash
lean-spec search "<query>"
```
Find relevant specs by content search.

## Viewing Commands

### View Spec
```bash
lean-spec view <spec>              # Formatted view
lean-spec view <spec> --raw        # Raw markdown
lean-spec view <spec> --json       # Structured JSON
lean-spec view <spec>/DESIGN.md    # View sub-spec file
```

### Open in Editor
```bash
lean-spec open <spec>
```

### List Spec Files
```bash
lean-spec files <spec>             # List all files (including sub-specs)
lean-spec files <spec> --type docs # Filter by markdown files
```

## Project Overview Commands

### Kanban Board
```bash
lean-spec board
```
Visual kanban view with project health summary.

### Project Statistics
```bash
lean-spec stats                    # Quick metrics
lean-spec stats --full             # Detailed analytics
```

## Spec Management Commands

### Create Spec
```bash
lean-spec create <name>                           # Basic creation
lean-spec create <name> --title "Human Title"     # With custom title
lean-spec create <name> --priority high           # Set priority
lean-spec create <name> --tags api,backend        # Add tags
lean-spec create <name> --assignee "Name"         # Set assignee
```

### Update Spec Metadata
**REQUIRED - Never manually edit frontmatter fields**

```bash
# Update status
lean-spec update <spec> --status planned
lean-spec update <spec> --status in-progress
lean-spec update <spec> --status complete
lean-spec update <spec> --status archived

# Note: When setting status to 'complete', the CLI will verify all checklist
# items are checked. Use --force to skip this verification.
lean-spec update <spec> --status complete --force

# Update priority
lean-spec update <spec> --priority low
lean-spec update <spec> --priority medium
lean-spec update <spec> --priority high
lean-spec update <spec> --priority critical

# Update tags
lean-spec update <spec> --tags tag1,tag2,tag3

# Update assignee
lean-spec update <spec> --assignee "Name"

# Combine multiple updates
lean-spec update <spec> --status in-progress --priority high

# Batch update multiple specs
lean-spec update 001-feature-a 002-feature-b --status in-progress
```

### Manage Relationships
```bash
# Add dependencies
lean-spec link <spec> --depends-on other-spec
lean-spec link <spec> --depends-on dep-a dep-b
lean-spec link <spec> --related other-spec

# Remove relationships
lean-spec unlink <spec> --depends-on other-spec
lean-spec unlink <spec> --depends-on dep-a dep-b
lean-spec unlink <spec> --related other-spec

# View dependency graph
lean-spec deps <spec>                # Complete graph
lean-spec deps <spec> --upstream     # Dependencies only
lean-spec deps <spec> --downstream   # Dependents only
lean-spec deps <spec> --impact       # Impact analysis
lean-spec deps <spec> --json         # JSON output
```

### Archive Spec
```bash
lean-spec archive <spec>
lean-spec archive 001-feature-a 002-feature-b
```
Moves spec to `archived/` directory.

## Token Management Commands

### Count Tokens
```bash
lean-spec tokens <spec>              # Count tokens in spec
lean-spec tokens <file-path>         # Count tokens in any file (md, code, text)
lean-spec tokens <spec> -v           # Show detailed breakdown
```

### Validate Specs
```bash
lean-spec validate                   # Validate all specs
lean-spec validate <spec>            # Validate specific spec
```

## Spec Splitting Commands

**Use when spec exceeds 3,500 tokens**

### Analyze Structure
```bash
lean-spec analyze <spec>             # Human-readable analysis
lean-spec analyze <spec> --json      # JSON output for parsing
```

### Split Spec
```bash
# Extract sections to sub-spec files
lean-spec split <spec> --output "DESIGN.md:100-250"
lean-spec split <spec> --output "TESTING.md:300-400" --output "API.md:500-600"
```

### Compact Main File
```bash
# Remove extracted sections from main README
lean-spec compact <spec> --remove "100-250"
lean-spec compact <spec> --remove "100-250" --remove "300-400"
```

## Backfill Commands

### Backfill Metadata from Git
```bash
lean-spec backfill                              # Dry run preview
lean-spec backfill --force                      # Apply changes
lean-spec backfill --include-assignee           # Backfill assignee
lean-spec backfill --include-transitions        # Full transition history
lean-spec backfill --specs 042,043              # Specific specs only
```

## Utility Commands

### Check for Conflicts
```bash
lean-spec check
```
Detect sequence number conflicts or naming issues.

### Help
```bash
lean-spec --help                     # General help
lean-spec <command> --help           # Command-specific help
```

## Common Workflows

### Starting New Work
```bash
lean-spec create feature-name
lean-spec update feature-name --status in-progress --priority high
# ... implement feature ...
lean-spec update feature-name --status complete
```

### Finding Related Work
```bash
lean-spec search "authentication"
lean-spec deps auth-system
lean-spec view auth-system
```

### Managing Complex Specs
```bash
lean-spec tokens large-spec          # Check size
lean-spec analyze large-spec         # Get split recommendations
lean-spec split large-spec --output "DESIGN.md:50-200"
lean-spec compact large-spec --remove "50-200"
```
