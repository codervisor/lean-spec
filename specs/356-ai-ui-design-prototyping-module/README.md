---
status: draft
created: 2026-03-06
priority: high
tags:
- ai
- ui
- ux
- image-generation
- agent-browser
- design-review
created_at: 2026-03-06T09:35:10.798877274Z
updated_at: 2026-03-06T09:35:10.798877274Z
---

# AI-Driven UI Design Prototyping Module

## Overview

Create a UI design module that turns existing product screenshots and flow captures into prototype design directions using pluggable image-generation models. The module should use browser automation to gather reference context, generate multiple visual variants, and then validate whether the proposed UI still matches the original product intent, constraints, and UX quality bar.

This should not be framed as "AI replaces product design". The stronger position is a hybrid workflow: AI produces fast, high-variance concept exploration, while a traditional UI/UX designer role remains the validation and acceptance layer for interaction quality, hierarchy, accessibility, and brand alignment.

## Requirements

### 1. Reference Capture and Context Extraction

- [ ] The module should ingest one or more existing UI screenshots as reference input.
- [ ] The module should support browser-driven capture flows using agent-browser or an equivalent adapter so references can be collected from live product states, not only static uploads.
- [ ] The module should capture minimal supporting metadata alongside images: route/screen name, viewport, theme, component state, and user task being represented.
- [ ] The module should extract a structured design brief from the captured references covering layout hierarchy, key UI regions, information density, visual style signals, and interaction goals.

### 2. Model-Orchestrated Prototype Generation

- [ ] The module should support multiple image-generation backends behind a common interface so teams can compare model output quality and cost.
- [ ] The initial design should assume support for providers such as Nano Banana, OpenAI image-generation APIs, Imagen-family providers, or equivalent multimodal models without hard-coding the system to a single vendor.
- [ ] The generation workflow should allow prompt templates that combine screenshots, textual design goals, product constraints, and optional brand or design-system guidance.
- [ ] The module should generate multiple UI concept variants for the same reference input rather than a single image.
- [ ] Each generated variant should preserve enough structural continuity with the source screen that a reviewer can understand what changed and why.

### 3. Critique, Scoring, and Designer Validation

- [ ] The module should run an automated critique pass that scores each generated variant against a fixed rubric: hierarchy clarity, task flow support, accessibility risk, visual coherence, implementation plausibility, and faithfulness to the original design intent.
- [ ] The module should produce an explicit change summary for each variant describing the major layout, navigation, content-density, and styling deviations from the source reference.
- [ ] The workflow should include a "designer review" stage where a human UI/UX owner can approve, reject, or request regeneration using the rubric and change summary rather than only raw images.
- [ ] The designer review stage should make clear that human validation is the final authority for UX alignment and delivery readiness.

### 4. Output Package and Delivery Alignment

- [ ] The module should output a reusable artifact bundle for each run: source references, prompt payload, generated variants, rubric scores, reviewer notes, and a selected recommendation.
- [ ] The module should support a mode focused on "alignment review" where generated concepts are judged against an original design or shipped UI to identify drift before implementation work begins.
- [ ] The module should produce implementation-facing guidance for the selected concept, including notable components, layout shifts, and open design questions.
- [ ] The module should be designed so a later phase can connect selected variants to code-generation or design-token workflows without requiring a rewrite of the core pipeline.

## Non-Goals

- Building a full Figma replacement or end-to-end product design suite.
- Claiming that image-generation output is production-ready UI without human review.
- Auto-shipping generated designs directly into the product UI.
- Solving high-fidelity interaction prototyping, motion design, or usability testing in the first version.
- Training proprietary design models in the initial phase.

## Technical Notes

### Proposed Pipeline

1. Capture reference screens with agent-browser or uploaded screenshots.
2. Normalize capture metadata into a structured design brief.
3. Route the job to one or more configured image-generation providers.
4. Generate 3-5 candidate variants per screen or flow.
5. Run a critique pass with a stable evaluation rubric.
6. Present the results in a review workspace for designer validation.
7. Export the final artifact bundle and implementation notes.

### Core Module Boundaries

- **Capture adapter**: acquires screenshots and screen metadata from browser automation or file input.
- **Brief builder**: converts visual references plus text goals into a canonical generation payload.
- **Model router**: sends requests to supported image providers and normalizes responses.
- **Critique engine**: evaluates generated concepts against alignment and UX heuristics.
- **Review workspace**: presents variants, deltas, rubric scores, and approval controls.
- **Artifact store**: preserves prompts, outputs, and review decisions for traceability.

### Design Positioning

The module should be positioned as a design acceleration tool for product teams. Its strongest use cases are:

- exploring redesign directions from an existing shipped UI,
- creating quick concept alternatives before implementation,
- checking whether implementation output drifted from design intent,
- giving non-design stakeholders a faster way to discuss visual direction before detailed design work.

### Open Questions

- Should the first milestone target single-screen redesigns only, or allow small multi-screen flows?
- Should critique be purely heuristic, or optionally use a second model as a visual design reviewer?
- Should the review workspace live in the existing web UI, desktop app, or both?
- How much structured design-system input is required for useful output in v1?

## Acceptance Criteria

- [ ] A user can capture or upload an existing UI screen and generate multiple design variants from it.
- [ ] At least two image-generation backends can be configured through the same module contract.
- [ ] Every generated variant includes a machine-readable prompt package and an alignment summary.
- [ ] The system presents a rubric-based comparison view that supports human approve/reject/regenerate decisions.
- [ ] The review flow makes the human designer role explicit for final UX validation.
- [ ] The exported artifact bundle is sufficient for a follow-up implementation or design handoff discussion.

## Notes

This proposal pairs naturally with existing agent-browser screenshot and UI-e2e efforts, but it should remain a separate spec unless those capture primitives become hard blockers. The main risk is mistaking visually attractive output for validated UX quality, so the review model must keep alignment, usability, and implementation realism ahead of novelty.