# LeanSpec Examples

This directory contains practical examples and templates for implementing the LeanSpec methodology in your projects.

## Available Examples

### [basic-setup/](./basic-setup/)

A complete, ready-to-use LeanSpec setup for your repository, including:

- **AGENTS.md** - Standard Operating Procedures and guidelines for AI coding agents
- **Spec Template** - A flexible, general-purpose template for any specification
- **leanspec Script** - Unified command-line tool for managing specs

**Best for**: Teams getting started with LeanSpec or setting up a new repository.

**Quick start**:
```bash
# Copy the basic setup to your repository
cp -r examples/basic-setup/AGENTS.md .
cp -r examples/basic-setup/spec-templates .
cp -r examples/basic-setup/scripts .

# Create your first spec
./scripts/leanspec create my-feature
```

## Using These Examples

Each example directory contains:
1. A README explaining the structure and usage
2. Complete, working files you can copy to your project
3. Customization guidance for your specific needs

## What's Inside

### AGENTS.md Templates
System prompts and SOPs that define how AI agents should work with LeanSpec in your repository. Think of this as the "constitution" for your AI-powered development workflow.

### Spec Template
A flexible, general-purpose template that works for any type of specification - features, APIs, components, processes, or anything else. Designed to be adapted to your specific needs.

### leanspec Script
A unified command-line tool to streamline spec management:
- `create` - Generate new specs from the template
- `archive` - Archive deprecated specs
- `list` - View all specs in your repository

## Philosophy

These examples demonstrate the LeanSpec mindset in practice:

- **Clarity over Documentation** - Templates focus on essential information
- **Adaptable over Rigid** - Easy to customize for your needs
- **Automated over Manual** - Scripts reduce repetitive work
- **Living over Frozen** - Designed to evolve with your project

## Contributing Examples

Have a great LeanSpec setup for a specific tech stack or use case? We'd love to see it!

Consider contributing examples for:
- Specific frameworks (React, Vue, Angular, Django, Rails, etc.)
- Microservices architectures
- Mobile development (iOS, Android, React Native)
- Monorepo setups
- Different team sizes or structures

## Need Help?

- Read the [main README](../README.md) for LeanSpec methodology
- Check the [template](../LEANSPEC_TEMPLATE.md) for a simple example
- Open an issue if you have questions or suggestions

---

**Remember**: These are examples, not requirements. LeanSpec is a mindset—adapt these to fit your team's needs!
