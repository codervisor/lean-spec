# AI Agent Instructions

This file provides Standard Operating Procedures (SOPs) and guidelines for AI coding agents working in this repository using the LeanSpec methodology.

## Core Principles (Constitution)

When working in this repository, AI agents must adhere to these foundational principles:

1. **Spec-First Development**: Always read and understand the relevant LeanSpec document before writing code
2. **Goal-Oriented**: Keep the stated Goal from the LeanSpec as the north star for all decisions
3. **Scenario-Driven**: Validate implementation against the Key Scenarios defined in the spec
4. **Criteria-Bound**: Ensure all Acceptance Criteria are met before considering work complete
5. **Respect Boundaries**: Explicitly avoid anything listed in Non-Goals to prevent scope creep

## Working with LeanSpec Documents

### Before Starting Implementation

1. **Locate the Spec**: Look for `LEANSPEC_*.md` files in the project root or feature directories
2. **Read Thoroughly**: Understand the full context including:
   - Why this work exists (Goal)
   - What success looks like (Key Scenarios)
   - How to validate completion (Acceptance Criteria)
   - What to avoid (Non-Goals)
3. **Ask Questions**: If any part of the spec is unclear or ambiguous, ask the human team for clarification before proceeding

### During Implementation

1. **Stay Focused**: Reference the spec frequently to ensure you're not drifting from the stated goals
2. **Test Against Scenarios**: Write tests that directly validate the Key Scenarios
3. **Validate Criteria**: Check off each Acceptance Criteria as you complete it
4. **Update the Spec**: If you discover missing details or need clarifications, update the spec to reflect new understanding (living documentation)

### After Implementation

1. **Final Review**: Verify all Acceptance Criteria are met
2. **Scenario Validation**: Ensure all Key Scenarios work as expected
3. **Non-Goals Check**: Confirm you haven't implemented anything from the Non-Goals list
4. **Document Changes**: Update the LeanSpec if the implementation revealed gaps or needed adjustments

## Code Standards

When implementing features based on LeanSpec documents:

### Testing
- Write tests that directly map to Acceptance Criteria
- Use Key Scenarios as test case templates
- Test names should reference the relevant spec section
- Example: `test_export_completes_within_30_seconds_for_10k_rows` (from Acceptance Criteria)

### Documentation
- Reference the LeanSpec document in PR descriptions
- Link to specific sections when explaining design decisions
- Update code comments to point to the authoritative spec

### Code Organization
- Keep implementation focused on stated goals
- Avoid "while we're here" changes that aren't in the spec
- If you identify needed work outside the spec, note it for future specs rather than implementing it now

## Handling Ambiguity

When encountering unclear or missing information:

1. **Check Non-Goals**: Sometimes what's missing is intentionally out of scope
2. **Review Technical Contracts**: Look for constraints that might clarify the ambiguity
3. **Ask for Clarification**: Present specific questions with context from the spec
4. **Propose Updates**: Suggest additions to the spec rather than making assumptions
5. **Document Decisions**: If you must make a decision, document it and update the spec

## Spec Lifecycle Management

### Creating New Specs
- Use the `leanspec create` command to generate a new spec from the template
- Place specs close to the code they describe (feature folders when applicable)
- Use consistent naming: `LEANSPEC_feature_name.md`

### Updating Specs
- Treat specs as living documents that evolve with understanding
- Document changes in commit messages: "Update LeanSpec: clarify export timeout behavior"
- Keep specs synchronized with implementation

### Archiving Specs
- Use `leanspec archive` when features are deprecated or replaced
- Archived specs provide historical context
- Never delete specs; archive them instead

## Quality Gates

Before considering any feature complete:

- [ ] All Acceptance Criteria marked as complete
- [ ] All Key Scenarios tested and working
- [ ] No Non-Goals accidentally implemented
- [ ] LeanSpec updated with any new learnings
- [ ] Tests reference the spec for traceability
- [ ] PR description links to the LeanSpec document

## Communication Guidelines

### With Human Team Members
- Be transparent about uncertainties or missing information
- Propose solutions rather than just identifying problems
- Reference specific sections of the spec in discussions
- Update the spec based on team feedback

### In Code and Commits
- Commit messages should reference the spec: "Implement CSV export per LEANSPEC_export.md"
- Code comments for complex logic should cite relevant spec sections
- PR descriptions must link to the governing LeanSpec document

## Continuous Improvement

This workflow is designed to evolve:

- If you find the workflow inefficient, suggest improvements
- If the spec format isn't working, propose adjustments
- Keep the focus on clarity, efficiency, and reduced cognitive load
- Remember: LeanSpec is a mindset, not rigid rules

---

*This AGENTS.md file is itself a living document. Update it as the team learns better ways to integrate AI agents with the LeanSpec methodology.*
