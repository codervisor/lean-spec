1. **Discover context** - Run `lean-spec stats` or `lean-spec board` to see current state
2. **Search existing specs** - Use `lean-spec search` or `lean-spec list` to find relevant work
3. **Check dependencies** - Run `lean-spec deps <spec>` if working on existing spec
4. **Create or update spec** - Add frontmatter with required fields (status: `planned`)
5. **Start implementation** - Mark `in-progress` BEFORE implementing what the spec describes
6. **Implement changes** - Keep spec in sync as you learn
7. **Complete implementation** - Mark `complete` AFTER implementing what the spec describes
8. **Document** - Report progress and document changes into the spec

**Remember**: Status tracks implementation work, not spec document creation. Creating a spec = planning (stays `planned` until implementation starts).

**Note on Archiving**: Archive specs when they're no longer actively referenced (weeks/months after completion), not immediately. Use `lean-spec archive <spec>` to move old specs to `archived/` directory.
