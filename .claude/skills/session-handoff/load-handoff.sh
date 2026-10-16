#!/usr/bin/env bash
# SessionStart hook: prints the latest handoff so Claude starts each session with it in context.
FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/sessions/LATEST.md"
if [ -f "$FILE" ]; then
  echo "=== Last session handoff (from .claude/sessions/LATEST.md) ==="
  cat "$FILE"
  echo "=== Say 'resume' for full details, or 'wrap up' at the end of this session. ==="
fi
exit 0
