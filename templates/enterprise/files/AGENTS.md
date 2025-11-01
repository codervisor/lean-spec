# AI Agent Instructions

## Project: {project_name}

Enterprise-grade development with security and compliance requirements.

## Core Rules

1. **Security first** - Follow security standards, no shortcuts
2. **Read specs/** - Check for compliance requirements
3. **Follow LeanSpec** - Lean doesn't mean skipping governance
4. **Document decisions** - Especially security and compliance choices

## Security Standards

- No hardcoded secrets or credentials
- Input validation on all external data
- Secure authentication/authorization
- Follow principle of least privilege
- Log security-relevant events

## Compliance Requirements

- PII handling follows data protection policies
- Audit trails for sensitive operations
- Change management process for production
- Code review required before merge

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

1. Create spec with security/compliance sections
2. Technical review
3. Security team review (if applicable)
4. Stakeholder sign-off
5. Implementation with tests
6. Final review before deployment

## Quality Standards

- Security requirements verified
- Tests include security scenarios
- Documentation complete
- Compliance checklist completed

---

**Remember**: Enterprise doesn't mean heavy. Keep specs lean while meeting governance needs.
