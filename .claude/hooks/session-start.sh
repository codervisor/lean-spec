#!/bin/bash
set -euo pipefail

# Cloud-only: in Claude Code on the web, every container starts fresh, so we
# install the onsager-ai/dev-skills bundle into ~/.claude/skills/ on each
# session start. Local terminal sessions are skipped so a developer's
# hand-installed skills are left alone.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Best-effort: a transient npm/registry/GitHub blip shouldn't fail the whole
# session start. On failure we log a warning and let the session continue
# without the bundle.
echo "--- installing onsager-ai/dev-skills globally ---"
if ! npx -y skills add -g onsager-ai/dev-skills --skill '*' -a claude-code; then
  echo "warning: onsager-ai/dev-skills install failed; session will start without the bundle." >&2
fi
