# LeanSpec Example

> **Note**: This is just one simple example of how to apply the LeanSpec mindset. LeanSpec is a methodology and adaptive workflow, not a rigid format—feel free to adapt this structure to fit your needs and context, especially when integrating with AI agent systems.

## [Feature/Component Name]

### Goal (Why)

_Why does this exist? What problem does it solve? What value does it deliver?_

<!-- 
Keep this section focused on the purpose and motivation. 
Example: "Enable users to export their data in CSV format so they can analyze it in Excel."
-->

### Key Scenarios

_What are the critical user journeys that must work?_

<!-- 
Focus on the 2-5 most important scenarios. Use simple, action-oriented language.
Example:
- User clicks "Export" button and receives a CSV file with all their data
- User exports filtered data and CSV contains only the filtered subset
-->

### Acceptance Criteria

_What specific, testable conditions define "done"?_

<!-- 
List clear, verifiable criteria. Use "must" for requirements, "should" for nice-to-haves.
Example:
- Must: Export completes within 30 seconds for datasets up to 10,000 rows
- Must: CSV file follows RFC 4180 format
- Should: Progress indicator shows during export
-->

### Technical Contracts

_What are the essential interfaces, APIs, or constraints?_

<!-- 
Document only the critical technical details that other systems or developers need to know.
Example:
- API Endpoint: POST /api/v1/export
- Request: { format: "csv", filters: {...} }
- Response: 200 + file stream OR 202 + job_id for async processing
- Rate limit: 10 exports per user per hour
-->

### Non-Goals

_What are we explicitly NOT doing?_

<!-- 
Be clear about what's out of scope to prevent scope creep and maintain focus.
Example:
- Not supporting Excel (.xlsx) format in this phase
- Not including data from archived records
- Not implementing scheduled/automated exports
-->

---

## Applying the LeanSpec Mindset

Remember, this is just one example structure. The core principles are:

- **Clarity over Documentation**: Write just enough to communicate intent
- **Essential over Exhaustive**: Focus on what truly matters
- **Living over Frozen**: Update as you learn
- **Adaptable over Rigid**: Change the structure to fit your needs

Your spec might have more sections, fewer sections, or completely different ones—that's fine! The goal is clear communication with minimal overhead, not adherence to a template.

## For AI-Powered Development Teams

When using LeanSpec as part of an AI workflow:

### Integration Tips

- **Reference this spec in your system prompts** (e.g., AGENTS.md) to ensure AI agents understand the structure
- **Keep specs near the code** they describe for easy discovery
- **Use consistent naming** (e.g., `LEANSPEC_feature_name.md`) so AI can find and parse them
- **Update the spec as you build** - make it a living document that AI can reference during development

### AI Agent Context

AI agents work best when specs provide:
- Clear "why" (Goal section) for understanding purpose
- Concrete examples (Key Scenarios) for behavior understanding  
- Testable outcomes (Acceptance Criteria) for validation
- Explicit boundaries (Non-Goals) to prevent scope creep

This LeanSpec structure is designed to be both human-readable and AI-parseable, making it an effective SOP for AI-powered development workflows.
