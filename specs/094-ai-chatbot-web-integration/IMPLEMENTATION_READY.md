# Implementation-Ready Checklist for Spec 94

## Summary of Refinements

This document captures the CI and npm distribution refinements made to make spec 94 implementation-ready.

## Key Decisions

### 1. npm Distribution Strategy ✅

**Decision**: Publish `@leanspec/chat-server` as standalone npm package

**Rationale**:
- Optional dependency model (users without AI don't need Node.js runtime)
- Independent versioning and updates
- Reusable across UI and Desktop
- Smaller bundle sizes (~5MB vs 50MB+ inline)

**Package Structure**:
```
@leanspec/chat-server  ← NEW standalone package
@leanspec/http-server  ← Existing Rust binary packages
@leanspec/ui           ← Existing UI package (adds optional dep)
```

### 2. CI/CD Build Pipeline ✅

**New Jobs Added** to `.github/workflows/publish.yml`:
1. `build-chat-server` - Build and test Node.js package
2. `publish-chat-server` - Publish to npm (before main packages)

**Testing Strategy**:
- Unit tests: Tool schema validation with Zod
- Integration tests: Mocked AI SDK streaming
- Environment: Uses mock API keys for CI

**Publishing Order** (critical for dependency resolution):
```
1. Rust platform binaries (@leanspec/cli-*, @leanspec/mcp-*, @leanspec/http-*)
2. @leanspec/chat-server (NEW)
3. Main packages (@leanspec/ui, lean-spec, @leanspec/mcp)
```

### 3. Process Management ✅

**Development**:
```bash
pnpm dev:all  # Runs HTTP server + chat server + UI concurrently
```

**Production Options**:
- **Docker Compose** (recommended): Separate containers with Unix socket
- **Embedded** (advanced): Rust spawns Node.js subprocess
- **Systemd** (self-hosted): Two systemd services

**Health Monitoring**:
- Rust HTTP server pings chat server `/health` every 30s
- Auto-restart on failure
- Graceful shutdown handling

### 4. Deployment Scenarios ✅

**Local Development**: 3 processes (HTTP + chat + UI)
**Production Web**: Docker Compose with Unix socket
**Desktop App**: Optional subprocess if AI features enabled
**Self-Hosted**: systemd services

## Implementation Risks Mitigated

### Risk 1: Circular Dependencies ✅
**Solution**: Chat-server published before UI package

### Risk 2: Platform-Specific IPC ✅
**Solution**: Unix socket (default) + HTTP fallback (Windows, cloud)

### Risk 3: Process Lifecycle Management ✅
**Solution**: Health checks + auto-restart logic in Rust HTTP server

### Risk 4: Version Synchronization ✅
**Solution**: `pnpm sync-versions` in CI before publish

### Risk 5: npm Package Not Found ✅
**Solution**: CI waits for chat-server propagation before publishing UI

## Updated Plan Phases

The implementation plan now includes:

1. **Phase 1**: Package setup with proper npm structure
2. **Phase 2**: CI/CD integration (NEW - added tests and publish jobs)
3. **Phase 3**: Rust proxy handler
4. **Phase 4**: Tool implementation
5. **Phase 5**: UI components
6. **Phase 6**: Multi-step orchestration
7. **Phase 7**: Process management (NEW - added health checks, Docker, systemd)
8. **Phase 8**: Testing & docs (ENHANCED - added CI verification)
9. **Phase 9**: Desktop integration (optional, future)

## Verification Checklist

Before starting implementation, ensure:

- [x] Publishing order is documented
- [x] CI jobs are clearly defined
- [x] Package structure is finalized
- [x] Process management strategy is chosen
- [x] Deployment scenarios are documented
- [x] Health check strategy is defined
- [x] Test strategy covers CI and local dev
- [x] Version sync process is clear

## Ready to Implement?

**Status**: ✅ **YES** - All critical gaps addressed

**Next Steps**:
1. Review this spec with team
2. Assign to engineer
3. Start with Phase 1 (package setup)
4. Verify CI integration works with dev version
5. Implement phases sequentially

## Open Questions (Non-Blocking)

1. **AI Gateway vs Direct Keys**: Recommend AI Gateway for production?
   - **Answer**: Yes, recommended. Simplifies key management and adds caching.

2. **Rate Limiting**: Implement in Rust HTTP server or chat-server?
   - **Answer**: Rust HTTP server (applies to all API routes, not just chat).

3. **Desktop Integration**: Required for v1 or defer?
   - **Answer**: Optional for v1. Add as Phase 9 if time permits.

4. **Cost Management**: Add usage tracking?
   - **Answer**: Nice to have. Can add in follow-up spec.

## Success Metrics

After implementation:
- [ ] `@leanspec/chat-server` published to npm
- [ ] CI workflow publishes all packages successfully
- [ ] Dev version workflow works end-to-end
- [ ] Health checks prevent chat server crashes
- [ ] All deployment scenarios documented and tested
- [ ] Integration tests pass in CI

---

**Document Created**: 2026-01-16
**Spec Version**: v2 (refined for CI/npm distribution)
**Status**: Ready for implementation
