# AI Agent Instructions

## Project: {project_name}

Enterprise-grade development with security and compliance requirements.

## Core Rules

1. **Security first** - Follow security standards, no shortcuts
2. **Read specs/** - Check for compliance requirements
3. **Follow LeanSpec** - Lean doesn't mean skipping governance
4. **Document decisions** - Especially security and compliance choices

## Discovery Commands

Before starting work, understand project context and dependencies:

- `lspec stats` - See work distribution across specs
- `lspec board` - View specs organized by status
- `lspec list --tag=<tag>` - Find specs by tag (e.g., `--tag=security`)
- `lspec search "<query>"` - Full-text search across specs
- `lspec deps <spec>` - Check dependencies before starting work
- `lspec gantt` - View project timeline and milestones

These commands help you understand what exists, what's in progress, and what depends on what.

## Spec Frontmatter

When creating or updating specs, include YAML frontmatter with all relevant fields:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [security, api, compliance]  # for discovery
priority: low|medium|high|critical
assignee: username
reviewer: reviewer-username  # required for review
issue: JIRA-123  # link to issue tracker
epic: EPIC-456  # link to epic
compliance: [SOC2, GDPR, HIPAA]  # applicable standards
depends_on:
  - path/to/other/spec
---
```

**Required fields:**
- `status`, `created` - basic tracking
- `tags`, `priority` - planning and discovery
- `assignee`, `reviewer` - accountability
- `compliance` - regulatory requirements (if applicable)

**Integration fields:**
- `issue`, `epic` - link to external systems
- `depends_on` - explicit dependencies

**Update with:**
```bash
lspec update <spec> --status in-progress --assignee yourname
# or edit frontmatter directly
```

## Security & Compliance in Frontmatter

Tag specs with relevant compliance standards:
```yaml
tags: [security, api, pii]
compliance: [SOC2, GDPR]
```

This helps with:
- Compliance audits and reporting
- Security review prioritization
- Regulatory requirement tracking

## When Specs Are Required

Required for:
- Features touching PII or sensitive data
- Changes to authentication/authorization
- New external integrations
- Breaking changes to APIs
- Infrastructure changes

Optional for:
- Internal refactors
- Bug fixes (unless security-related)
- Minor UI changes

## Approval Workflow

1. **Discover context** - Run `lspec stats`, `lspec board`, `lspec deps`
2. **Create spec** - Include all required frontmatter fields
3. **Technical review** - Assign reviewer in frontmatter
4. **Security team review** - For security/compliance-tagged specs
5. **Stakeholder sign-off** - Update status to `planned`
6. **Implementation** - Update status to `in-progress`, keep spec in sync
7. **Final review** - Before deployment
8. **Complete & archive** - Mark `complete`, then archive

## Workflow

1. **Discover context** - Run `lspec stats`, `lspec board`, or `lspec gantt`
2. **Search existing specs** - Use `lspec search` or `lspec list --tag=<relevant>`
3. **Check dependencies** - Run `lspec deps <spec>` to understand dependencies
4. **Create or update spec** - Add complete frontmatter with compliance tags
5. **Get reviews** - Assign reviewer, tag for security review if needed
6. **Implement changes** - Keep spec in sync, update status appropriately
7. **Update status** - Mark progress through workflow states
8. **Archive when done** - `lspec archive <spec>` after completion

## Quality Standards

- Security requirements verified
- Tests include security scenarios
- Documentation complete
- Compliance checklist completed
- Code is clear and maintainable
- Specs stay in sync with implementation

---

**Remember**: Enterprise doesn't mean heavy. Keep specs lean while meeting governance needs.
