---
name: session-handoff
description: Use at end of session to write a handoff summary for the next session
---

# Session Handoff

Write a concise handoff summary when the user says "wrap up" or at the end of a session.

## Trigger

- User says "wrap up", "end session", "handoff", or similar
- Session is ending with incomplete work

## Output

Write to `.claude/sessions/LATEST.md`:

```markdown
# Session Handoff — YYYY-MM-DD HH:MM

## What we did
- [Completed tasks]

## Current state
- [Where things stand now]

## Next steps
- [ ] [Immediate next task]
- [ ] [Follow-up tasks]

## Open questions
- [Any blockers or decisions needed]
```

## On Session Start

The `load-handoff.sh` hook automatically displays the last handoff when a session starts. User can say "resume" to continue where we left off.
