---
status: in-progress
created: 2025-11-02T00:00:00.000Z
tags:
  - docs
  - ux
priority: high
---

# Simplify README.md to be more lean

> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-02 · **Tags**: docs, ux

## The Market Problem

### Competing SDD Tools & Their Struggles

| Tool | Over-Documentation | Rigid Format | User Experience |
|------|-------------------|--------------|-----------------|
| **BMAD** | ❌ Yes | ❌ Yes | Heavyweight |
| **GitHub SpecKit** | ❌ Yes | ❌ Yes | Opinionated |
| **Kiro** | ❌ Yes | ❌ Yes | Complex |
| **OpenSpec** | ✅ No | ❌ Yes | Limited flexibility |
| **LeanSpec** | ✅ No | ✅ No | Lean & adaptive |

**The Gap**: Developers don't want to choose between:
- "Lightweight but inflexible" (OpenSpec)
- "Flexible but heavyweight" (BMAD, SpecKit, Kiro)

**LeanSpec's Opportunity**: Be the first to solve both - lightweight AND flexible.

### Internal Problem

**Current State**: README.md is **383 lines** - we're shooting ourselves in the foot!

**The Irony**: A project built to solve "over-documentation" has an overwhelming README that violates its own principles:
- ❌ Too much upfront information (contradicts our core message)
- ❌ Unclear information hierarchy (hides the competitive advantage)
- ❌ Mixed audiences without clear paths (confuses potential users)
- ❌ Hard to scan quickly (doesn't demonstrate being "lean")

**Impact**:
- Potential users never discover we solve their pain
- Core differentiation gets lost in details
- Looks hypocritical ("preach lean, write verbose")
- Competitors with simpler landing pages look better

## Core Principle

> **README is a marketing + onboarding tool for humans to make fast decisions: "Does this solve MY problem? How do I start?"**
>
> Everything else belongs elsewhere.

## The Hook We Need

README must immediately communicate:

1. **What we solve** (not what we are)
   - Problem: Other SDD tools force you to choose between lightweight and flexible
   - Solution: LeanSpec is lean AND adapts to your workflow

2. **Why it matters**
   - Developers hate documentation overhead and rigid formats
   - AI-powered development needs clarity without verbosity
   - Teams waste time on spec process instead of building

3. **Proof** (social/competitive)
   - Unlike BMAD/SpecKit/Kiro: Not over-documented
   - Unlike OpenSpec: Actually flexible, not rigid
   - Built for modern AI + human hybrid teams

## Proposed Solutions

### Option A: Progressive Disclosure (Recommended)

**Why This Works**: It doesn't just organize information—it demonstrates our core value through the README itself.

**Structure:**
1. **Value Proposition Hook** (4-5 lines) - The problem we solve + why we're different
2. **Quick Proof** (3-4 lines) - One concrete example showing flexibility
3. **Install & Start** (5-7 lines) - `pnpm install` → `lspec init` → Done
4. **Core Commands** (5-7 lines) - Most common operations
5. **Learn More** (2-3 lines) - Links to deeper docs for different audiences

**What Gets Moved:**
- `docs/PHILOSOPHY.md` ← Principles and methodology (the "why LeanSpec exists")
- `docs/COMMANDS.md` ← Complete command reference
- `docs/FRONTMATTER.md` ← Frontmatter specification
- `docs/TEMPLATES.md` ← Template system details + comparisons to other tools
- `docs/INTEGRATION.md` ← Existing project integration patterns
- `docs/COMPARISONS.md` ← Detailed comparison with BMAD/SpecKit/Kiro/OpenSpec

**Target**: ~100 lines total

**Key Positioning**:
- README itself demonstrates "lean" principle (walks the talk)
- Hook immediately answers "Is this for me?" (BMAD users asking about documentation = YES, this is for you)
- Flexibility examples show we're not rigid like competitors
- Links to detailed docs let researchers and technical leads find depth without overwhelming newcomers

**Pros:**
- Fast scanning for humans
- Clear next steps based on use case
- Easier to maintain individual docs
- Better SEO (focused content)
- **Demonstrates our core principle through the README itself** ← This is the real win

**Cons:**
- Requires creating new doc files
- Need to ensure links are discoverable

---

### Option B: Collapsible Sections

Use `<details>` tags to hide advanced content:

```markdown
## Quick Start
[Essential commands here]

<details>
<summary>Advanced Commands & Visualization Tools</summary>
[Extended command list]
</details>

<details>
<summary>Template System Deep Dive</summary>
[Template details]
</details>
```

**Pros:**
- Single-file convenience
- User controls detail level
- Quick to implement

**Cons:**
- Still visually cluttered when collapsed
- Harder to maintain large single file
- Not ideal for deep linking

---

### Option C: Split by Audience

Create audience-specific entry points:

- `README.md` ← Quick overview + install (50 lines)
- `docs/USER-GUIDE.md` ← Complete user documentation
- `docs/CONTRIBUTOR-GUIDE.md` ← Development setup
- `docs/AI-INTEGRATION.md` ← AI agent setup

Keep `AGENTS.md` and `CONTRIBUTING.md` at root.

**Pros:**
- Clear audience targeting
- Each doc has focused purpose
- Reduces cognitive load

**Cons:**
- More files to navigate
- Risk of content duplication

## Recommendation

**Go with Option A (Progressive Disclosure)** because:

1. **Demonstrates our core value** - The README itself proves we practice what we preach (lightweight, not bloated)
2. **Captures the market opportunity** - Immediately shows BMAD/SpecKit/Kiro users "This is what you're looking for"
3. **Positions against rigid competitors** - Shows flexibility through examples, not walls of text
4. **Serves humans first** - Fast scanning, clear paths based on use case
5. **Scales better** - Each doc has single responsibility, easier to maintain
6. **Better competitive positioning** - Comparison docs let researchers understand nuance without overwhelming homepage

**Key Insight**: Think of README as a **landing page + competitive differentiator**, not a **manual**.

The README becomes proof-by-example that LeanSpec solves the exact problems other tools create.

## Plan

- [ ] **Strategy Phase**
  - [ ] Finalize hook messaging (which version resonates?)
  - [ ] Decide on direct vs. indirect competitive positioning
  - [ ] Plan comparison doc structure

- [ ] **Create New Docs**
  - [ ] `docs/PHILOSOPHY.md` - Why LeanSpec exists
  - [ ] `docs/COMMANDS.md` - Complete command reference
  - [ ] `docs/FRONTMATTER.md` - Frontmatter specification
  - [ ] `docs/TEMPLATES.md` - Template system + flexibility examples
  - [ ] `docs/INTEGRATION.md` - Existing project integration
  - [ ] `docs/COMPARISONS.md` - Detailed comparison with BMAD/SpecKit/Kiro/OpenSpec

- [ ] **Rewrite README**
  - [ ] Hook section (4-5 lines) with competitive positioning
  - [ ] Problem solved (3-4 lines)
  - [ ] Install & Quick Start (5-7 lines)
  - [ ] Core Commands (5-7 lines)
  - [ ] Learn More (2-3 lines with audience-specific links)

- [ ] **Update Infrastructure**
  - [ ] Update `docs/README.md` index with new structure
  - [ ] Update all cross-references and links
  - [ ] Add navigation hints in doc headers

## Success Criteria

- [ ] README.md is ≤ 150 lines (target ~100)
- [ ] New user can understand "what is LeanSpec" in < 30 seconds
- [ ] A developer frustrated with BMAD/SpecKit over-documentation recognizes this immediately
- [ ] Clear path to "getting started" in < 5 seconds
- [ ] Value proposition hook clearly differentiates from competitors
- [ ] All detailed content preserved (just moved)
- [ ] No broken links
- [ ] Maintains SEO value (key content still in README)
- [ ] Passes the "3am tired developer test" - still usable when exhausted
- [ ] Comparison docs are discoverable from README for researchers/leads

## Open Questions

1. Should the Hook explicitly mention competing tools (BMAD, SpecKit, Kiro) or use indirect positioning?
   - **Direct**: "Unlike BMAD and SpecKit, LeanSpec doesn't overwhelm with documentation"
   - **Indirect**: "Tired of rigid spec tools that demand over-documentation?"
   - Recommendation: Start indirect in README (less defensive), direct in `docs/COMPARISONS.md`

2. Where should the comparison matrix go?
   - In README as a proof point?
   - In dedicated `docs/COMPARISONS.md`?
   - Recommendation: Both - simple comparison in README, detailed analysis in dedicated doc

3. How much space for template examples?
   - The "flexibility" positioning requires showing the standard + enterprise templates work differently
   - Recommendation: One visual example in README, full details in `docs/TEMPLATES.md`

4. Should we include testimonial/quote positioning?
   - "Unlike OpenSpec, we're actually flexible"
   - "Developers spending 2+ hours on specs with BMAD might be in the wrong tool"
   - Recommendation: No quotes in README (too salesy), but build this into comparison docs

5. Should Quick Start show `npm` or `pnpm`? (both?)

6. Keep "LeanSpec for AI Coding Agents" section in README or move to dedicated doc?
   - Recommendation: Brief mention (1 line) → link to `docs/AI-INTEGRATION.md`

## References

Good examples of lean READMEs:
- [Commander.js](https://github.com/tj/commander.js) - Clean, scannable
- [Chalk](https://github.com/chalk/chalk) - Visual, quick examples
- [Inquirer](https://github.com/SBoudrias/Inquirer.js) - Progressive disclosure done right
