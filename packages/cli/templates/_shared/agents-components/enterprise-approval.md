## Approval Workflow

1. **Discover context** - Run `lean-spec stats`, `lean-spec board`, `lean-spec deps`
2. **Create spec** - Include all required frontmatter fields
3. **Technical review** - Assign reviewer in frontmatter
4. **Security team review** - For security/compliance-tagged specs
5. **Stakeholder sign-off** - Update status to `planned`
6. **Implementation** - Update status to `in-progress`, keep spec in sync
7. **Final review** - Before deployment
8. **Complete** - Mark `complete` after successful deployment

**Note**: Archive specs only when they're no longer actively referenced (weeks/months later), not immediately after completion.
