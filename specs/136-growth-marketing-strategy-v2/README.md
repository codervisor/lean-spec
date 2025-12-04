---
status: planned
created: '2025-12-04'
tags:
  - marketing
  - growth
  - strategy
  - community
priority: critical
created_at: '2025-12-04T01:43:22.417Z'
---

# LeanSpec Growth Marketing Strategy v2

> **Status**: 📅 Planned · **Priority**: Critical · **Created**: 2025-12-04

## Overview

Address declining traction (78 stars, 4k→1k npm downloads) with differentiated marketing strategy after initial launch attempts on HN, Reddit, V2EX, and personal channels failed to gain sustained momentum.

**Channels already tried:** WeChat, HN, Reddit, V2EX, personal blog (marvinzhang.dev), Medium, Dev.to

**Hypothesis for low traction:**
1. **Timing & Discovery** - Launched after Spec Kit, OpenSpec, Kiro already captured mindshare
2. **Differentiation gap** - Features similar enough that switching cost > perceived benefit
3. **Social proof** - Low stars/downloads create negative feedback loop
4. **Content format** - Tool announcements get lost; stories/outcomes resonate more

## Diagnosis

### Unique Selling Proposition (USP)

**Current problem:** LeanSpec is "just another SDD tool" in a crowded market.

**Solution:** Position LeanSpec + AgentRelay + Devlog as an **integrated AI development platform**:

| Component | Role | Competitor Gap |
|-----------|------|----------------|
| **LeanSpec** | "The Brain" - What to build (specs, intent, memory) | Spec Kit/OpenSpec don't have execution or observability |
| **AgentRelay** | "The Hands" - How to execute (orchestration, terminals, agents) | No spec integration or observability |
| **Devlog** | "The Eyes" - What happened (observability, analytics, audit) | No spec or orchestration integration |
| **Together** | Full-stack AI dev platform: Define → Execute → Observe → Iterate | **No competitor has all three** |

### The "Codervisor" Platform Story

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CODERVISOR PLATFORM                                 │
│                "The Complete AI Development Stack"                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │   LeanSpec    │───►│  AgentRelay   │───►│    Devlog     │              │
│   │   (Brain)     │    │   (Hands)     │    │    (Eyes)     │              │
│   │               │    │               │    │               │              │
│   │ • Specs       │    │ • HQ Server   │    │ • Activity    │              │
│   │ • MCP Server  │    │ • Runners     │    │ • Analytics   │              │
│   │ • Validation  │    │ • PTY/Terminal│    │ • Audit Trail │              │
│   │ • Web UI      │    │ • Web UI      │    │ • Web UI      │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│                                                                             │
│   "Define intent"      "Execute with AI"    "See what happened"            │
│                                                                             │
│                    ◄──────── Feedback Loop ────────►                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why this is defensible:**
1. **Complete stack** - No competitor has spec + orchestration + observability
2. **Network effect** - Users of any tool benefit from the others
3. **Integration moat** - Seamless Define→Execute→Observe workflow
4. **Platform narrative** - "Codervisor" > individual tools
5. **Multiple entry points** - Users can start with any tool

### USP Messaging

**Tagline options:**
- "The complete AI development stack: Define → Execute → Observe"
- "From spec to shipped to analyzed. AI agents you can actually trust."
- "Codervisor: Intent. Execution. Observability."

**Elevator pitch:**
> "Codervisor is an open-source AI development platform. LeanSpec captures what you want to build. AgentRelay orchestrates AI agents to build it. Devlog shows you exactly what happened. Together, they close the loop from intent to execution to insight."

---

### Why Existing Users Don't Switch

| Barrier | Impact | Mitigation |
|---------|--------|------------|
| **Switching cost** | High - must migrate existing specs | Emphasize migration tool, highlight 1-command migration |
| **Learning curve** | Medium - new concepts | Focus on "try for 10 minutes" messaging |
| **Uncertainty** | High - "will it be maintained?" | Show velocity (135+ specs), weekly releases |
| **Risk** | Medium - what if it breaks | Emphasize local-first, git-native (zero lock-in) |

### Why New Users Don't Start

| Barrier | Impact | Mitigation |
|---------|--------|------------|
| **Don't know what SDD is** | Critical - category education needed | Lead with pain points, not solution |
| **Satisfied with vibe coding** | High - no felt need for specs | Target "burned by AI" moments |
| **Too many AI tools** | High - fatigue | "Works with what you have" messaging |
| **Looks like another TODO** | Medium - low urgency | Emphasize AI performance boost |

## Strategy

### Pivot: From "Tool Launch" to "Platform Story"

**Old approach (failed):** "Here's a cool SDD tool, try it"  
**New approach:** "Here's an AI development platform: LeanSpec (brain) + AgentRelay (hands)"

### Three Pillars

**1. Platform-Led Growth** (NEW - Primary)
- Market "Codervisor" as the umbrella brand
- Demo the full loop: Spec → AgentRelay → Execution → Iterate
- Each tool drives discovery of the other

**2. Video & Visual Content** (Primary)
- Full workflow demos showing both tools together
- "Watch AI build a feature from spec" videos
- Short-form content on AI coding pitfalls

**3. Integration-Led Growth** (Secondary)
- Deep integrations with AI tools people already use
- Partner content with Cursor/Windsurf/Claude communities
- "Codervisor + [Tool X]" guides for specific workflows

**4. Community-Led Growth** (Long-term)
- Build around "AI-native development" philosophy
- Contributors become evangelists
- Success stories from real projects

## Plan

### Phase 1: Video & Visual Content (Weeks 1-4)

**Goal:** Showcase the platform story that differentiates from competitors

**Hero content (Platform demo):**
- [ ] YouTube: "The Complete AI Dev Stack in 10 minutes" (LeanSpec → AgentRelay → Devlog full loop)
- [ ] YouTube: "What AI agents actually do to your code" (Devlog observability showcase)
- [ ] Landing page video: 90-sec "What is Codervisor?" explainer (all 3 tools)

**Supporting content:**
- [ ] YouTube Shorts / TikTok: "AI broke my code again" series (15-60s pain points)
- [ ] "Watch AI build a feature" real-time demo (AgentRelay terminals)
- [ ] "See what Copilot actually did" (Devlog analytics demo)
- [ ] Cursor/Windsurf integration tutorial video (LeanSpec MCP)

**Visual content:**
- [ ] Infographic: "The AI Development Stack" (Codervisor 3-tool diagram)
- [ ] GIF demos for Twitter/X threads
- [ ] Before/after: blind AI coding vs spec-driven with observability

**Distribution:**
- YouTube (searchable, evergreen)
- Twitter/X (shareable, viral potential)
- Chinese: Bilibili, Xiaohongshu (different audience than WeChat)

### Phase 2: Strategic Integrations (Weeks 3-6)

**Goal:** Capture users where they already work

- [ ] Cursor community integration guide + video
- [ ] Windsurf workflow tutorial
- [ ] Claude Desktop + LeanSpec MCP showcase
- [ ] GitHub Copilot Chat + MCP integration
- [ ] Aider workflow example

**Partnership outreach:**
- Offer to write integration guides for AI tool blogs
- Reach out to AI tool YouTubers for collaboration

### Phase 3: Social Proof Loop (Weeks 5-8)

**Goal:** Create visible momentum

- [ ] "100 Stars" milestone campaign (share what we learned)
- [ ] Collect and showcase 3-5 real user stories
- [ ] Weekly changelog highlights on Twitter
- [ ] GitHub Sponsors setup (signals commitment)
- [ ] Compare before/after: projects with/without specs

### Phase 4: Community Foundation (Weeks 7-12)

**Goal:** Build a community around the philosophy

- [ ] Discord/Slack community for "AI-assisted development"
- [ ] Monthly "Show Your Spec" showcase
- [ ] Office hours / AMA sessions
- [ ] Contributor recognition program
- [ ] "First Principles SDD" newsletter

## Differentiated Messaging

### Old Messaging (Generic)
> "LeanSpec is a lightweight SDD framework for AI-powered teams"

### New Messaging (Platform Story)

**Platform pitch:**
> "Codervisor: The open-source AI development stack. LeanSpec (intent) + AgentRelay (execution) + Devlog (observability)."

**For frustrated AI users:**
> "Stop re-prompting. Define specs, let agents execute, see exactly what happened."

**For skeptics:**
> "Not another AI wrapper. It's infrastructure: specs + orchestration + observability."

**For teams:**
> "Your AI agents need specs like your code needs tests. And audit trails like your deploys need logs. We provide all three."

**For solo devs:**
> "Vibe coding got me 80% there. Spec-driven orchestration with full observability got me to production."

**For enterprise:**
> "Complete audit trails for AI-assisted development. Know what your AI agents did, why, and how well."

## Distribution Channels (Revised)

### High-Value (Focus Here)
| Channel | Content Type | Why |
|---------|--------------|-----|
| **YouTube** | Tutorials, demos | Searchable, visual learners, evergreen |
| **Twitter/X** | Threads, GIFs, short videos | Developer community, shareable |
| **AI tool communities** | Integration guides | Pre-qualified users |
| **Bilibili** | Chinese tutorials | Untapped audience vs WeChat |
| **GitHub Discussions** | Q&A, showcases | SEO, community building |

### Medium-Value (Opportunistic)
| Channel | Content Type | Why |
|---------|--------------|-----|
| **HN** | Show HN (milestone stories) | High variance, but high ceiling |
| **Reddit** | Answers, not promos | Subreddit rules strict |
| **Product Hunt** | One-time launch | Time investment high |
| **Podcasts** | Guest appearances | Credibility, niche audiences |

### Already Tried (Iterate, Don't Repeat)
| Channel | What to Change |
|---------|----------------|
| **Medium/Dev.to** | Repurpose into video scripts, don't write new articles |
| **V2EX** | Deprioritize - overlap with WeChat |
| **WeChat** | Focus on group engagement, not broadcast |
| **Personal blog** | SEO backlinks only |

## Metrics

### Lead Indicators (Track Weekly)
- [ ] Content views/reads (target: 1k/week)
- [ ] GitHub profile visits (target: 100/week)
- [ ] Twitter impressions (target: 5k/week)
- [ ] Integration guide completions (target: 10/week)

### Lag Indicators (Track Monthly)
- [ ] GitHub stars (target: 200 by end of Q1)
- [ ] npm weekly downloads (target: 2k stable)
- [ ] Community members (target: 50 in Discord)
- [ ] Contributors (target: 5 external PRs)

## Test

Success criteria at 90-day checkpoint:
- [ ] 200+ GitHub stars (from 78)
- [ ] 2k+ npm weekly downloads (stable, not declining)
- [ ] 10+ integration guides published
- [ ] 5+ user testimonials collected
- [ ] 1+ external contributor PRs merged

## Notes

### What We're NOT Doing

- ❌ Paid advertising (too early, not enough signal on messaging)
- ❌ Aggressive HN/Reddit posting (diminishing returns, reputation risk)
- ❌ Feature parity race with Spec Kit/OpenSpec (lose on resources)
- ❌ Enterprise sales motions (premature)

### Key Insight

Spec Kit (GitHub) and OpenSpec (Fission-AI) have **institutional backing**. Competing head-to-head loses.

**LeanSpec's edge (as standalone tool):**
1. Philosophy-first - First principles > feature lists
2. Agility - No committee approval for changes
3. AI-native from day 1 - MCP server, token optimization built-in
4. Local-first, zero lock-in - Trust signal for skeptics

**Codervisor's edge (as platform):**
1. **Complete stack** - No competitor has spec + orchestration + observability
2. **Multiple entry points** - Start with LeanSpec, AgentRelay, OR Devlog
3. **Network effect** - Each tool drives the others
4. **"Full stack for AI dev"** - New category, not competing in existing ones
5. **Trust through transparency** - Devlog provides audit trails others lack

### Platform Integration Roadmap

| Phase | LeanSpec ↔ AgentRelay | LeanSpec ↔ Devlog | AgentRelay ↔ Devlog |
|-------|----------------------|-------------------|---------------------|
| **Now** | Manual workflow | Manual workflow | Manual workflow |
| **v1** | AgentRelay reads specs | Devlog links events to specs | Devlog captures AgentRelay sessions |
| **v2** | AgentRelay updates spec status | Spec completion triggers analytics | Real-time agent monitoring |
| **v3** | LeanSpec MCP triggers AgentRelay | AI recommendations from Devlog insights | Unified dashboard |

### Open Questions

- Should we rebrand under "Codervisor" umbrella immediately?
- Which tool is the best "entry point" for new users?
- What's the activation moment that hooks users?
- How to demo the full LeanSpec → AgentRelay → Devlog loop compellingly?
- Should we prioritize Devlog completion (40-45%) before platform marketing?
