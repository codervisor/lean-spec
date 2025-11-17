1. **Discover context** - Run `lean-spec stats`, `lean-spec board`, or `lean-spec gantt`
2. **Search existing specs** - Use `lean-spec search` or `lean-spec list --tag=<relevant>`
3. **Check dependencies** - Run `lean-spec deps <spec>` to understand dependencies
4. **Create or update spec** - Add complete frontmatter with compliance tags
5. **Get reviews** - Assign reviewer, tag for security review if needed
6. **Start work** - **IMMEDIATELY** update status: `lean-spec update <spec> --status in-progress`
7. **Implement changes** - Keep spec in sync with implementation
8. **Complete** - **IMMEDIATELY** update status: `lean-spec update <spec> --status complete`
9. **Archive when done** - `lean-spec archive <spec>` after completion
