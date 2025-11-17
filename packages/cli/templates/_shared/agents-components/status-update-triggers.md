**CRITICAL - What "Work" Means:**
- ❌ **NOT**: Creating/writing the spec document itself
- ✅ **YES**: Implementing what the spec describes (code, docs, features, etc.)
- **Example**: Creating a spec for "API redesign" ≠ work complete
  - Work = Actually redesigning the API as described in the spec
  - Status `planned` until someone starts the redesign
  - Status `in-progress` while redesigning
  - Status `complete` after redesign is done

**Status Update Triggers:**
- ✅ **Before starting implementation** → `lean-spec update <spec> --status in-progress`
- ✅ **After completing implementation** → `lean-spec update <spec> --status complete`
- ✅ **If blocked or paused** → Update status and document why in spec
- ❌ **NEVER mark spec complete just because you finished writing it**
