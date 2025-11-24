1. **Discover context** - Run `lean-spec stats`, `lean-spec board`, or `lean-spec gantt`
2. **Search existing specs** - Use `lean-spec search` or `lean-spec list --tag=<relevant>`
3. **Check dependencies** - Run `lean-spec deps <spec>` to understand dependencies
4. **Create or update spec** - Add complete frontmatter with compliance tags (status: `planned`)
5. **Get reviews** - Assign reviewer, tag for security review if needed
6. **Start implementation** - Mark `in-progress` BEFORE implementing what the spec describes
7. **Implement changes** - Keep spec in sync, update status appropriately
8. **Complete implementation** - Mark `complete` AFTER implementing what the spec describes
9. **Document** - Report progress and document changes into the spec

**Remember**: Status tracks implementation work, not spec document creation. Creating a spec = planning (stays `planned` until implementation starts).

**Note on Archiving**: Archive specs when they're no longer actively referenced (weeks/months after completion), not immediately. Used for historical specs, not recent work. Use `lean-spec archive <spec>` to move old specs to `archived/` directory.
