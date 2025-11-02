# Documentation Organization

Clean, scannable structure following LeanSpec principles.

## 📍 Root Level (User-Facing)

```
├── README.md                    # Main docs - start here!
├── AGENTS.md                    # AI agent workflow integration
└── CONTRIBUTING.md              # How to contribute
```

**Purpose**: Keep the root clean with only essential user-facing docs.

## 📚 docs/ (Developer & Technical)

```
docs/
├── README.md                    # Documentation index
├── TESTING.md                   # Quick testing guide
├── testing-details.md           # Detailed test docs
└── ORGANIZATION.md              # This file
```

**Purpose**: Technical documentation for contributors and developers.

## 📝 examples/ (Learning by Example)

```
examples/
├── README.md                    # Example overview
└── integration-merge-example.md # Sample integration
```

**Purpose**: Practical examples and tutorials.

## 📋 templates/ (Project Setup)

```
templates/
├── minimal/                     # Bare-bones template
├── standard/                    # Recommended template
└── enterprise/                  # Full-featured template
```

**Purpose**: Ready-to-use project structures via `lspec init`.

## 🔧 specs/ (Self-Documenting)

```
specs/
└── YYYYMMDD/
    └── NNN-feature-name/
        └── README.md
```

**Purpose**: LeanSpec eating its own dog food - project specs.

## Navigation

### I want to...

**Get started** → [README.md](../README.md)  
**Set up AI agents** → [AGENTS.md](../AGENTS.md)  
**Contribute code** → [CONTRIBUTING.md](../CONTRIBUTING.md)  
**Run tests** → [docs/testing.md](testing.md)  
**See test results** → [specs/20251101/008-test-results/](../specs/20251101/008-test-results/)  
**Learn from examples** → [examples/](../examples/)  
**Choose a template** → [templates/](../templates/)

## Principles Applied

✅ **Clarity over documentation** - Each doc has a single, clear purpose  
✅ **Essential over exhaustive** - No redundant or duplicate content  
✅ **Reduced mind burden** - Easy to find what you need  
✅ **Living guide** - Structure evolves with the project

## Changes Made

**Before** (cluttered root):
```
├── README.md
├── AGENTS.md
├── TESTING.md              ← Developer docs at root
├── TEST_SUMMARY.md         ← Detailed test info at root
└── src/
    └── tests-README.md     ← Test docs scattered
```

**After** (organized):
```
├── README.md               ← Clean user-facing root
├── AGENTS.md              ← AI integration  
├── CONTRIBUTING.md        ← Contributor guide at root
├── docs/                  ← Technical reference docs
│   ├── TESTING.md
│   └── testing-details.md
└── specs/                 ← Living documentation
    └── 20251101/
        └── 008-test-results/  ← Test implementation spec
            └── TEST_SUMMARY.md
```

**Result**: Cleaner root, test results as a spec (dogfooding!), better organization.
