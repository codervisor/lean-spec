# LeanSpec Example Setup

This directory contains a complete example of how to structure a repository using the LeanSpec methodology with AI-powered development teams.

## Directory Structure

```
examples/basic-setup/
├── AGENTS.md                    # AI agent SOPs and guidelines
├── spec-templates/              # Template for LeanSpec documents
│   └── template.md             # General-purpose LeanSpec template
├── scripts/                     # Unified management script
│   └── leanspec                # All-in-one command for managing specs
└── README.md                    # This file
```

## Getting Started

### 1. Copy to Your Repository

Copy the contents of this `basic-setup` directory to your repository root:

```bash
# From your repository root
cp -r examples/basic-setup/AGENTS.md .
cp -r examples/basic-setup/spec-templates .
cp -r examples/basic-setup/scripts .
```

### 2. Customize AGENTS.md

Edit `AGENTS.md` to match your team's specific workflow, coding standards, and conventions. This file serves as the "constitution" for AI agents working in your repository.

### 3. Create Your First Spec

Use the unified `leanspec` command to manage your specs:

```bash
# Create a new spec
./scripts/leanspec create user-export

# Create a spec in a specific directory
./scripts/leanspec create user-export ./specs

# List all specs
./scripts/leanspec list

# Archive a spec
./scripts/leanspec archive ./specs/LEANSPEC_old-feature.md "Replaced by new implementation"
```

### 4. Integrate with Your Workflow

#### For AI Coding Agents

Make sure AI agents are instructed to:
1. Read `AGENTS.md` to understand the workflow
2. Always consult the relevant `LEANSPEC_*.md` before implementing features
3. Update specs as they learn during implementation

#### For Human Developers

1. Start each feature by creating a LeanSpec document
2. Review and update specs during code reviews
3. Use specs as the source of truth in discussions
4. Archive specs when features are deprecated

## File Descriptions

### AGENTS.md

**Purpose**: Standard Operating Procedures (SOPs) and guidelines for AI coding agents.

**Key Sections**:
- Core Principles: The "constitution" for AI agents
- Working with LeanSpec: Step-by-step workflow
- Code Standards: Expectations for testing, documentation, and quality
- Handling Ambiguity: What to do when specs are unclear
- Quality Gates: Checklist before marking work complete

**Customization**: Adapt this file to your team's specific needs, coding standards, and workflow preferences.

### Spec Template

**template.md** - A flexible, general-purpose LeanSpec template that works for any type of specification.

The template includes:
- Goal (Why) - Purpose and value
- Key Scenarios - Critical use cases
- Acceptance Criteria - Testable conditions
- Technical Contracts - Essential interfaces and constraints
- Non-Goals - Explicit scope boundaries
- Notes - Additional context

**Philosophy**: The template is intentionally generic so you can adapt it to any use case - features, APIs, components, processes, or anything else. Add, remove, or modify sections as needed. LeanSpec is about clarity, not rigid structure.

### leanspec Script

A unified command-line tool for managing all your LeanSpec documents.

**Commands**:

```bash
# Create a new spec
./scripts/leanspec create <name> [directory]

# Archive an existing spec
./scripts/leanspec archive <spec-file> [reason]

# List all specs
./scripts/leanspec list [directory] [--archived]

# Show help
./scripts/leanspec help
```

**Examples**:
```bash
./scripts/create-spec.sh feature user-export
```bash
./scripts/leanspec create user-export
./scripts/leanspec create api-payments ./src/api/specs
./scripts/leanspec list
./scripts/leanspec list ./src --archived
./scripts/leanspec archive ./specs/LEANSPEC_old-feature.md "Replaced by v2"
```

**Features**:
- Unified interface for all spec management tasks
- Create specs with automatic date substitution
- Archive specs with metadata tracking
- List specs with color-coded status indicators
- Built-in help and usage examples

## Best Practices

### 1. Spec Placement

**Option A: Centralized**
```
specs/
├── LEANSPEC_user-export.md
├── LEANSPEC_payments-api.md
└── archived/
```

**Option B: Co-located**
```
src/
├── features/
│   ├── user-export/
│   │   ├── LEANSPEC_user-export.md
│   │   └── UserExport.tsx
│   └── payments/
│       ├── LEANSPEC_payments-api.md
│       └── PaymentsAPI.ts
```

Choose based on your team's preferences. Co-location can make specs easier to discover.

### 2. Naming Conventions

- **Always prefix with `LEANSPEC_`**: Makes specs easy to find and grep
- **Use kebab-case**: `LEANSPEC_user-export.md`, not `LEANSPEC_UserExport.md`
- **Be descriptive**: `LEANSPEC_csv-export.md` better than `LEANSPEC_export.md`

### 3. Workflow Integration

#### Git Workflow
```bash
# 1. Create spec
./scripts/leanspec create my-feature

# 2. Fill in the spec and commit
git add specs/LEANSPEC_my-feature.md
git commit -m "Add spec for my-feature"

# 3. Implement (referencing the spec)
git commit -m "Implement my-feature per LEANSPEC_my-feature.md"

# 4. Update spec if needed
git commit -m "Update spec: clarify edge case handling"
```

#### PR Template Integration
Add to your PR template:
```markdown
## LeanSpec Reference
- [ ] Spec document: [Link to LEANSPEC_*.md]
- [ ] All acceptance criteria met
- [ ] Spec updated if implementation revealed gaps
```

### 4. AI Agent Integration

In your system prompts or AI agent configuration:

```markdown
Before implementing any feature:
1. Check for a LEANSPEC_*.md file related to the work
2. Read AGENTS.md for workflow guidelines
3. Follow the Goal → Scenarios → Criteria flow
4. Update the spec if you discover missing information
```

### 5. Maintenance

- **Review quarterly**: Check that active specs still reflect reality
- **Archive promptly**: Don't let deprecated specs linger
- **Keep AGENTS.md current**: Update as workflow evolves
- **Refine the template**: Adjust based on what works for your team

## Customization Tips

### Adapt the Template

The general-purpose template is designed to be flexible. Customize it for your needs:

**For Different Use Cases**:
- Keep core sections (Goal, Scenarios, Criteria, Non-Goals)
- Add domain-specific sections as needed
- Remove sections that don't apply
- Adjust detail level based on audience

**Examples of Adaptations**:
- Add "API Endpoints" section for backend services
- Add "Component Props" section for UI components
- Add "Migration Plan" section for database changes
- Add "Performance Requirements" for high-scale features

The key is to maintain clarity and lean principles while adapting to your specific context.

### Extend the Script

The `leanspec` script is simple bash and can be extended:

- Add validation checks for spec content
- Integrate with issue trackers or project management tools
- Add custom commands for your workflow
- Implement spec linting or quality checks

## Troubleshooting

### Script Doesn't Run
```bash
# Make it executable
chmod +x scripts/leanspec
```

### Template Not Found
```bash
# Ensure template exists in the correct location
ls spec-templates/template.md
```

### Git Ignores Specs
```bash
# Make sure .gitignore doesn't exclude them
# Add explicit includes if needed:
!LEANSPEC_*.md
```

## Examples in Action

See the parent repository for real examples of LeanSpec in use:
- [LEANSPEC_TEMPLATE.md](../../LEANSPEC_TEMPLATE.md) - The original template
- [README.md](../../README.md) - Complete methodology documentation

## Contributing

Found a better way to organize specs? Improved a script? Please contribute back to the LeanSpec project!

---

**Remember**: LeanSpec is a mindset, not rigid rules. Adapt this setup to fit your team's needs. The goal is clarity and reduced cognitive load, not perfect adherence to templates.
