1. **Discover context** - Run `lean-spec stats` or `lean-spec board` to see current state
2. **Search existing specs** - Use `lean-spec search` or `lean-spec list` to find relevant work
3. **Check dependencies** - Run `lean-spec deps <spec>` if working on existing spec
4. **Create or update spec** - Add frontmatter with required fields and helpful metadata
5. **Start work** - **IMMEDIATELY** update status: `lean-spec update <spec> --status in-progress`
6. **Implement changes** - Keep spec in sync as you learn
7. **Complete** - **IMMEDIATELY** update status: `lean-spec update <spec> --status complete`
8. **Archive when done** - `lean-spec archive <spec>` moves to archive
