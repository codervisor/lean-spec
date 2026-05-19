#!/bin/bash
set -euo pipefail

# Cloud-only: in Claude Code on the web, every container starts fresh, so we
# install the onsager-ai/dev-skills bundle into ~/.claude/skills/ on each
# session start. Local terminal sessions are skipped so a developer's
# hand-installed skills are left alone.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "--- installing onsager-ai/dev-skills globally ---"
npx -y skills add -g onsager-ai/dev-skills --skill '*' -a claude-code -y
