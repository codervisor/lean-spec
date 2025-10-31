# LeanSpec Example Setup

This directory contains a complete example of how to structure a repository using the LeanSpec methodology with AI-powered development teams.

## Directory Structure

```
examples/basic-setup/
├── AGENTS.md                    # AI agent SOPs and guidelines
├── spec-templates/              # Template files for different spec types
│   ├── feature-template.md      # Template for feature specifications
│   ├── api-template.md          # Template for API specifications
│   └── component-template.md    # Template for component specifications
├── scripts/                     # Automation scripts for spec management
│   ├── create-spec.sh          # Create new specs from templates
│   ├── archive-spec.sh         # Archive deprecated specs
│   └── list-specs.sh           # List all specs in repository
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

Use the creation script to generate a new spec:

```bash
# Create a feature spec
./scripts/create-spec.sh feature user-export ./specs

# Create an API spec
./scripts/create-spec.sh api payments ./specs

# Create a component spec
./scripts/create-spec.sh component button ./specs
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

### Spec Templates

Three template types are provided:

#### feature-template.md
For general features and functionality. Includes:
- Goal and success metrics
- Key scenarios with user stories
- Acceptance criteria (must/should have)
- Technical contracts and dependencies
- Non-goals and open questions

#### api-template.md
For API endpoints and interfaces. Includes:
- Request/response formats
- Authentication and authorization
- Error handling
- Rate limiting
- Example requests

#### component-template.md
For UI components or reusable modules. Includes:
- Component API (props, parameters)
- Usage examples
- Accessibility requirements
- Testing strategy
- Styling approach

### Scripts

#### create-spec.sh
Creates a new spec from a template.

```bash
./scripts/create-spec.sh <type> <name> [directory]
```

**Examples**:
```bash
./scripts/create-spec.sh feature user-export
./scripts/create-spec.sh api payments ./src/api/specs
./scripts/create-spec.sh component button ./src/components
```

#### archive-spec.sh
Archives a spec when it's no longer active.

```bash
./scripts/archive-spec.sh <spec-file> [reason]
```

**Examples**:
```bash
./scripts/archive-spec.sh ./specs/LEANSPEC_old-feature.md
./scripts/archive-spec.sh ./specs/LEANSPEC_old-api.md "Replaced by v2 API"
```

The script:
- Creates an `archived/` subdirectory
- Adds an archive header with date and reason
- Optionally removes the original file

#### list-specs.sh
Lists all LeanSpec documents in the repository.

```bash
./scripts/list-specs.sh [directory] [--archived]
```

**Examples**:
```bash
./scripts/list-specs.sh                    # List specs in current directory
./scripts/list-specs.sh ./src              # List specs in src directory
./scripts/list-specs.sh . --archived       # Include archived specs
```

Output includes:
- Status indicators (Draft, In Progress, Complete)
- Creation dates
- Color-coded display
- Summary counts

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
./scripts/create-spec.sh feature my-feature

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
- **Refine templates**: Adjust based on what works for your team

## Customization Tips

### Adapt to Your Stack

**For React Projects**: Enhance `component-template.md` with:
- Storybook story requirements
- React-specific patterns (hooks, context)
- Component composition examples

**For Backend Services**: Enhance `api-template.md` with:
- Database schema changes
- Migration considerations
- Service dependencies

**For Mobile Apps**: Create new templates for:
- Screen specifications
- Navigation flows
- Platform-specific considerations

### Add New Templates

Create specialized templates as needed:

```bash
# Create a new template
cp spec-templates/feature-template.md spec-templates/database-template.md

# Edit to fit your needs
# Update create-spec.sh to support the new type
```

### Extend the Scripts

The scripts are simple bash and can be extended:

- Add validation checks
- Integrate with issue trackers
- Auto-generate from templates
- Add spec linting

## Troubleshooting

### Scripts Don't Run
```bash
# Make them executable
chmod +x scripts/*.sh
```

### Templates Not Found
```bash
# Check paths in create-spec.sh
# Ensure templates are in spec-templates/ directory
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
