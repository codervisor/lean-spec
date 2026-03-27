---
status: draft
created: 2026-03-27
priority: critical
tags:
- strategy
- positioning
- vision
- harness-engineering
created_at: 2026-03-27T00:00:00Z
updated_at: 2026-03-27T00:00:00Z
---

# LeanSpec Positioning and Codervisor Vision

## Overview

### Context: The Market Has Shifted

The spec-driven development (SDD) space has moved from niche to mainstream in early 2026. Three well-funded platforms shipped dedicated SDD tooling nearly simultaneously:

- **GitHub Spec Kit** (72.7K stars, 22+ agent platforms) -- agent-agnostic spec framework with GitHub's distribution advantage
- **AWS Kiro** (GA Nov 2025) -- full IDE with built-in spec workflow, deep AWS integration
- **Tessl Framework** ($125M funding) -- spec-as-source vision, 10K+ spec registry
- **Intent by Augment Code** -- living specs with bidirectional sync
- **OpenSpec** -- lightweight static specs, brownfield-first

Meanwhile, the AI infrastructure layer has converged:

- **MCP** (Anthropic -> Linux Foundation) -- de facto agent-to-tool standard, 97M monthly SDK downloads
- **A2A** (Google -> Linux Foundation) -- agent-to-agent coordination, 150+ orgs
- **Agent Skills** (Anthropic) -- open standard for procedural knowledge
- **AGENTS.md** (OpenAI -> Linux Foundation) -- repo-level agent configuration standard

OpenAI formalized **Harness Engineering** (Feb 2026) as the successor to prompt engineering and context engineering -- the discipline of building constraints, feedback loops, and verification systems that guide AI agents.

### Problem

LeanSpec currently positions as a lightweight spec management tool. This puts it in direct competition with Spec Kit (GitHub's distribution), Kiro (AWS's IDE integration), and Tessl ($125M in funding). LeanSpec cannot win on distribution, IDE integration, or capital.

More fundamentally, as AI models improve, much of LeanSpec's current feature set faces commoditization:

| Feature | Commoditization Risk |
|---------|---------------------|
| Token economy (<2K specs) | High -- larger context windows reduce relevance |
| Kanban / project tracking | High -- Jira, Linear, GitHub Issues |
| Dependency graphs | Medium -- models infer from code |
| Spec search | High -- models search codebases directly |
| MCP integration | High -- plumbing, not differentiator |
| Insights / health metrics | Medium -- models can analyze on the fly |

### What Models Cannot Replace

Despite improving capabilities, AI cannot replace:

1. **Human intent that isn't in the code** -- business decisions, regulatory constraints, strategic priorities, lessons learned from past failures
2. **Multi-stakeholder alignment** -- PM, engineer, designer, legal agreeing on what "done" means
3. **Accountability** -- auditable record of intent for regulated industries, compliance
4. **Non-determinism verification** -- AI produces different outputs for the same input; something must verify against a stable reference

### The Real Problems

The three problems developers actually face with AI-assisted development:

1. **Intent drift** -- over time, the codebase stops reflecting what was originally intended
2. **AI slop** -- plausible but mediocre/incorrect code accumulates at machine speed
3. **Code quality erosion** -- death by a thousand AI-generated PRs

These are not solved by writing better specs. They are solved by continuous monitoring and prevention.

## Design

### LeanSpec's Evolved Position

LeanSpec continues as the **human-AI alignment layer** -- the bridge between human intent and AI execution, and between multiple AI agents. The spec remains valuable as:

- The explicit record of intent that isn't in the code
- The coordination mechanism for multi-agent and multi-human workflows
- The accountability artifact for compliance and audit
- An input signal for the broader intelligence system

LeanSpec evolves from "spec management tool" to "intent alignment layer that feeds into a codebase intelligence system."

### The Codervisor Platform Vision

Inspired by how Palantir converges military intelligence from multiple sources into a knowledge graph for high-quality predictions and risk assessments, Codervisor builds the equivalent for software development:

```
Data Sources                  Intelligence Layer              Downstream Value
─────────────────             ──────────────────              ────────────────
Git history        ─┐
PR reviews         ─┤
LeanSpec specs     ─┤         Converge, Extract,             Drift detection
Test suites        ─┼────→    Link into Knowledge    ────→   AI slop prevention
CI/CD signals      ─┤         Graph                          Quality prediction
Issue trackers     ─┤                                        Risk assessment
Agent session logs ─┤                                        Intent alignment
Code itself        ─┘                                        Convention enforcement
```

### Product Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Codervisor Platform                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ LeanSpec │  │ Synodic  │  │Orchestra │  │   Eval   │   │
│  │          │  │          │  │          │  │          │   │
│  │ Intent   │  │ Harness  │  │ Session  │  │ Quality  │   │
│  │ alignment│  │ & rules  │  │ mgmt &   │  │ metrics  │   │
│  │ layer    │  │ engine   │  │ workflow │  │ & gates  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │           │
│       └─────────────┴──────┬──────┴─────────────┘           │
│                            │                                │
│                   Knowledge Graph                           │
│                   (codebase intelligence)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**LeanSpec** -- Intent alignment layer. Captures what humans want, in a format both humans and AI understand. Specs feed into the knowledge graph as intent signals.

**Synodic** -- Harness engineering engine. Collects agent events, crystallizes rules from multiple sources (codebase patterns, agent mistakes, developer feedback, specs), enforces conventions. Currently handles the tracking layer; evolves to include the full feedback loop.

**Orchestra** -- Session management and multi-agent workflow coordination.

**Eval** -- Quality measurement and gating. Evaluates AI output against crystallized rules and intent.

### Rule Crystallization Process (V1)

The immediate, buildable feature that bridges LeanSpec and Synodic:

```
Phase 1: Discovery (sub-agents scan in parallel)
├── Codebase scanner: architectural patterns, naming conventions,
│   error handling patterns, dependency structure, test patterns
├── Git history analyzer: recurring decisions, past corrections,
│   stable vs volatile areas
├── Spec reader: intent signals, constraints, acceptance criteria
│   from LeanSpec specs
└── Agent event analyzer: common mistakes, violation patterns
    from Synodic event logs

Phase 2: Crystallization (master agent synthesizes)
├── Analyze findings from all sub-agents
├── Identify high-confidence conventions (appear consistently)
├── Rank by importance (violation frequency x impact)
├── Generate rules with provenance (why each rule exists,
│   with evidence from the codebase)
└── Output: L1 static rules + L2 AI-judge rules

Phase 3: Enforcement (continuous)
├── L1: Fast, deterministic checks on every PR
├── L2: LLM-as-judge for nuanced, context-dependent rules
└── Feedback: developer confirm/reject -> rules evolve

Phase 4: Export (portable, hierarchical)
├── Entry points (top-level rules and routing)
│   ├── AGENTS.md (OpenAI Codex, Jules, Amp, Factory)
│   ├── CLAUDE.md (Claude Code)
│   ├── .cursor/rules/ (Cursor)
│   └── Custom formats as needed
│
└── Skills (deep procedural knowledge packages)
    ├── Methodology skills: when to spec, how to decompose, SDD workflow
    ├── Domain skills: project-specific patterns, architecture decisions
    ├── Convention skills: naming, error handling, testing patterns
    └── Compliance skills: regulatory constraints, security requirements
```

The entry point files (AGENTS.md, CLAUDE.md) define **what** the rules are -- concise, declarative. Skills define **how** to apply them -- procedural knowledge with judgment and decision trees. This mirrors a module system:

```
AGENTS.md                          = package.json (declares dependencies, entry points)
.claude/skills/architecture.md     = src/architecture.ts (deep procedural knowledge)
.claude/skills/testing-patterns.md = src/testing.ts (domain-specific methodology)
.claude/skills/compliance.md       = src/compliance.ts (regulatory decision trees)
```

Entry points reference skills: "For architectural decisions, follow the architecture skill." Skills contain the detailed methodology that would bloat a single rules file. This solves the scaling problem identified in the Codified Context paper (arXiv:2602.20478) -- single-file manifests don't scale, but a hierarchy of entry points + skill packages does.

The crystallization process produces both layers:
- **L1 rules** become entry point directives (AGENTS.md / CLAUDE.md)
- **L2 procedural knowledge** becomes skills (methodology, judgment calls, decision trees)

This is iterative and evolving -- rules and skills are not one-shot extracted, they are continuously refined based on new code, new agent events, and developer feedback.

### Scaling Dimensions

The system is not limited to a single codebase:

| Scope | What it captures | Value |
|-------|-----------------|-------|
| Single repo | Code patterns, git history, local conventions | Individual project quality |
| Multi-repo / team | Cross-service architecture, shared conventions, API contracts | Team consistency |
| Organization | Department standards, compliance requirements, institutional knowledge | Enterprise governance |
| Public ecosystem | Fork patterns, star demographics, adoption signals, community conventions | Open-source intelligence |

Each scope level is a separate validation milestone. Do not build Level N+1 until Level N proves its value.

## Plan

### Phase 1: Validate Core Hypothesis (LeanSpec + Synodic V1)

- [ ] Build codebase convention extraction (sub-agent scanning)
- [ ] Build rule crystallization (master agent synthesis)
- [ ] Connect Synodic event tracking to crystallization pipeline
- [ ] Export crystallized rules as entry points (AGENTS.md / CLAUDE.md / .cursorrules) + skills packages
- [ ] Run on 3-5 real codebases, measure: do developers find the extracted rules accurate and useful?

### Phase 2: Close the Feedback Loop

- [ ] PR-level enforcement (CI check that validates against crystallized rules)
- [ ] Developer feedback mechanism (confirm / reject / refine rules)
- [ ] Iterative rule evolution based on feedback and new codebase changes
- [ ] LeanSpec spec-aware verification (check implementation against linked specs)

### Phase 3: Multi-Source Intelligence

- [ ] Ingest PR reviews, issue discussions, and commit messages as intent signals
- [ ] Link intent signals to code changes in a basic knowledge graph
- [ ] Drift detection: alert when code changes contradict established patterns or intent
- [ ] Risk scoring: flag high-risk PRs based on historical failure patterns

### Phase 4: Scale and Expand

- [ ] Multi-repo awareness (cross-service conventions, API contract consistency)
- [ ] Organization-level rule inheritance (org rules -> team rules -> repo rules)
- [ ] Predictive intelligence (which areas will break next, where debt accumulates)

## Test

- [ ] Convention extraction accuracy: >80% of extracted rules rated "accurate" by developers
- [ ] Drift detection precision: >70% of flagged violations are genuine issues (not false positives)
- [ ] Developer adoption: teams keep the CI check enabled after a 2-week trial
- [ ] Value over `/init`: extracted rules catch issues that one-shot CLAUDE.md generation misses
- [ ] Cost efficiency: running cost per repo is justified by prevented incidents

## Notes

### Competitive Positioning

LeanSpec does not compete with Spec Kit, Kiro, or Tessl on spec authoring. It occupies a unique position as the intent alignment layer that feeds into a broader codebase intelligence system. The combination of LeanSpec (intent) + Synodic (enforcement) + knowledge graph (intelligence) is not replicated by any current tool.

### Harness Engineering Alignment

This vision aligns with the harness engineering discipline formalized by OpenAI in 2026. The key insight from their experience: engineers should design constraints and feedback loops, not write code. Codervisor provides the tooling for that discipline.

### Protocol Strategy

Codervisor builds on top of existing protocols (MCP, A2A, Agent Skills, AGENTS.md) rather than competing with them. The output is a two-layer hierarchy: entry point rule files (AGENTS.md, CLAUDE.md, .cursorrules) for declarative constraints, and Agent Skills packages for deep procedural knowledge. Both are portable, open-format outputs. The intelligence that produces and maintains them is the proprietary value.

### Risk: Cost-Benefit Justification

For small projects and solo developers, Claude `/init` and Cursor `/Generate Rules` are free and sufficient. The target audience is teams of 5-50 engineers who are heavy AI coding tool users and starting to feel the pain of inconsistent AI output. The value proposition must be demonstrated concretely: prevented incidents, reduced review cycles, maintained code quality over time.

### Open Questions

1. Should the knowledge graph be a separate shared service, or embedded in each product?
2. At what team size does the cost-benefit clearly favor this system over manual review?
3. How do we handle the cold-start problem (new repos with little history)?
4. Should Codervisor be open-source, freemium, or enterprise-only?
