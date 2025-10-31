# LeanSpec

A lightweight, agile Spec-Driven Development (SDD) methodology and adaptive workflow designed to reduce spec "mind burden" and keep teams—both humans and AI coding agents—focused on what truly matters.

> **LeanSpec is not just a document—it's an adaptive workflow, SOP (Standard Operating Procedure), and living process for AI-powered development teams.**

## The Problem

Traditional software specifications often suffer from:
- **Documentation Overload**: Lengthy documents that nobody (human or AI) reads or maintains
- **Frozen Contracts**: Specs that become outdated as soon as development begins
- **Exhaustive Overthinking**: Trying to document every possible edge case upfront
- **Mind Burden**: Cognitive load from managing verbose, complicated documentation
- **Lost Intent**: The "why" gets buried under mountains of "what" and "how"

Development teams—including AI coding agents—need clear direction without being buried in documentation debt.

## The LeanSpec Solution

LeanSpec is a **mindset and methodology, not a rigid format or tool**. It's about capturing what truly matters with minimal overhead.

A simple example structure might include:
- **The Goal**: Why this work exists
- **Key Scenarios**: The critical user journeys that must succeed
- **Acceptance Criteria**: Clear, testable conditions for "done"
- **Technical Contracts**: Essential interfaces and constraints
- **Non-Goals**: What we're explicitly not doing (to maintain focus)

But the key is the mindset: focus on clarity, keep it lean, make it living documentation. The structure should serve your needs, not constrain them.

## Agile Principles

LeanSpec is built on these core principles:

### 🎯 Clarity over Documentation
Write just enough to communicate intent clearly. If it doesn't add clarity, don't write it.

### 🚀 Essential Scenarios over Exhaustive Lists
Focus on the 20% of scenarios that deliver 80% of the value. Document what must work, not every possible edge case.

### 📱 Living Guide over Frozen Contract
Specs should evolve with the project. Update them as you learn, don't treat them as immutable contracts.

### 🧠 Reduced Mind Burden over Comprehensive Coverage
Keep specs short and scannable. The goal is to reduce cognitive load, not create reference manuals.

### ⚡ Speed over Perfection
Ship a "good enough" spec quickly. You can always refine it based on feedback and learning.

### 🤝 Collaboration over Specification
Use specs as conversation starters, not as replacements for human communication.

## Getting Started

The LeanSpec mindset is simple:

1. **Start with why**: What problem are you solving?
2. **Capture the essentials**: What absolutely must be communicated?
3. **Stay lean**: If it doesn't add clarity, cut it
4. **Keep it living**: Update as you learn

For a practical example, see [LEANSPEC_TEMPLATE.md](LEANSPEC_TEMPLATE.md)—but remember, it's just one way to apply the methodology. Adapt the structure to fit your needs and context.

## When to Use LeanSpec

**Perfect for:**
- New features or components
- API designs
- Architecture decisions that need shared understanding
- Quick alignment on work direction
- Providing context to AI coding agents for implementation tasks
- **Establishing an adaptive SOP for AI-powered development teams**
- **Integrating with system prompts and agent instructions**

**Not ideal for:**
- Detailed API reference documentation (use code comments + auto-generated docs)
- Step-by-step user manuals (use dedicated user documentation)
- Compliance requirements that mandate specific formats

## LeanSpec for AI Coding Agents

In the era of AI-assisted development, LeanSpec serves as both a methodology and an adaptive workflow for AI-powered development teams. It's not just about writing specs—it's about establishing a living process that integrates with AI agent systems.

### Core Benefits for AI Teams

- **Clear Context**: Starting with "why" gives AI agents the purpose behind the work
- **Concrete Scenarios**: Specific examples help AI understand expected behavior
- **Testable Criteria**: Clear targets guide AI implementation
- **Boundaries**: Explicit non-goals help AI avoid scope creep
- **Adaptable Structure**: Whatever format you choose, consistency helps AI parse effectively

AI coding agents work best with clear, concise specifications that balance context with brevity—exactly what the LeanSpec mindset promotes.

### Implementing LeanSpec as an AI Workflow

LeanSpec becomes truly powerful when integrated as a **Standard Operating Procedure (SOP)** for your AI-powered development team:

#### System Prompts and Context Engineering

To effectively use LeanSpec with AI agents, consider implementing:

1. **System-Level Instructions** (e.g., `AGENTS.md`)
   - Define how AI agents should interpret and apply LeanSpec principles
   - Establish coding standards and conventions
   - Specify how to handle ambiguity or missing information
   - Set expectations for testing, documentation, and code quality

2. **Context Engineering**
   - Structure your repository to make LeanSpec documents discoverable
   - Use consistent naming conventions (e.g., `LEANSPEC_*.md`)
   - Place specs near the code they describe
   - Link related specs together for complex features

3. **Adaptive Workflow Integration**
   - Start each work item with a LeanSpec document
   - Have AI agents reference the spec during implementation
   - Update specs as understanding evolves (living documentation)
   - Use specs as the source of truth for feature discussions

#### Example: AGENTS.md for LeanSpec Workflow

Create an `AGENTS.md` file in your repository to guide AI agents:

```markdown
# AI Agent Instructions

## Working with LeanSpec

When implementing features in this repository:

1. **Always start by reading the relevant LeanSpec document**
2. **Follow the Goal → Scenarios → Criteria flow**
3. **Respect Non-Goals explicitly stated**
4. **Ask clarifying questions if acceptance criteria are unclear**
5. **Update the LeanSpec if you discover gaps or ambiguities**

## Code Standards

- Write tests that validate the Acceptance Criteria
- Reference the LeanSpec document in PR descriptions
- Keep code focused on stated goals
```

This transforms LeanSpec from a documentation format into an operational workflow that guides AI behavior systematically.

## Philosophy

> "The best spec is the one that gets read, understood, and acted upon—by humans and AI alike."

LeanSpec is a **mindset, methodology, and adaptive workflow**—not just a format. It embraces agile thinking: start small, iterate based on feedback, and focus on outcomes over outputs. A one-page spec that everyone (including AI coding agents) understands beats a fifty-page document that nobody reads.

The methodology is about principles over process—adapt it to your team, your tools, and your context. When working with AI-powered development teams, LeanSpec becomes an SOP that integrates with system prompts, context engineering, and agent instructions to create a cohesive, intelligent workflow.

## Example Setup

Ready to implement LeanSpec in your repository? Check out the [examples/](examples/) directory for:

- **Complete setup template** - AGENTS.md, spec template, and unified management script
- **Ready-to-use automation** - Single command for creating, archiving, and listing specs
- **Customization guidance** - Adapt the template to your specific needs

Quick start:
```bash
# Copy the basic setup to your repository
cp -r examples/basic-setup/AGENTS.md .
cp -r examples/basic-setup/spec-templates .
cp -r examples/basic-setup/scripts .

# Create your first spec
./scripts/leanspec create my-feature
```

See the [examples README](examples/README.md) for more details.

## Contributing

Have ideas for improving LeanSpec? Open an issue or submit a pull request. Keep it lean! 🚀

## License

MIT License - See [LICENSE](LICENSE) for details.