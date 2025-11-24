1. **Check existing work** - Run `lean-spec board` or `lean-spec search`
2. **Create or update spec** - Add frontmatter with `status` and `created` (status: `planned`)
3. **Start implementation** - Mark `in-progress` BEFORE implementing what the spec describes
4. **Implement changes** - Keep spec in sync as you learn
5. **Complete implementation** - Mark `complete` AFTER implementing what the spec describes
6. **Document** - Report progress and document changes into the spec

**Remember**: Status tracks implementation work, not spec document creation. Creating a spec = planning (stays `planned` until implementation starts).

**Note on Archiving**: Archive specs when they're no longer actively referenced (weeks/months after completion), not immediately. Use `lean-spec archive <spec>` to move old specs to `archived/` directory.
