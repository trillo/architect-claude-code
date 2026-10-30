---
description: Keep a distilled journal of the current work as three local markdown files — workflow.md (the steps taken), issues.md (problems found), rules.md (rules discovered). Use when the user asks to journal, track, or record the work, or accepts the journal offer from architect-overview.
---

# Journal: distilled checkpoints of the work

The full record of every session is already in Trillo Observability telemetry. The journal is the
**distilled** version: the few checkpoints worth keeping, in files the user can read, edit, and
commit. It's optional. Start it only when the user asks for it or accepts the offer.

## Where

Ask once: *"Where should the journal live?"* Suggest `journal/` at the repo root, or a folder
next to the user's existing docs. Remember the answer for the session. If the folder already has
journal files, **continue them** (append a new session, keep issue and rule numbering going).
Never start a second journal beside an existing one.

## The three files

### workflow.md: the steps taken
One section per session, newest last. A table of **end-user steps** only: what the user asked
or did, and what came of it. Diagnosis, fixes, and internal tooling go in issues.md, not here.

```markdown
## Session 2026-10-30

| # | Step | Tool(s) | Outcome |
|---|---|---|---|
| 1 | "Show me the capabilities" | `listCapabilities` | Empty catalog → I-01 |

**Current state:** …
**Next:** …
```

### issues.md: problems to fix
One entry per issue, numbered `I-01`, `I-02`, … and never renumbered. Status is `open`,
`fixed (<commit>)`, or `wontfix`.

```markdown
### I-01 — <one-line title> · open
- **Seen:** what happened, with exact output where short.
- **Impact:** why it matters.
- **Cause:** confirmed cause, or **Hypothesis (unverified):** …
- **Fix:** what was done or proposed.
```

### rules.md: rules discovered
Numbered `R-01`, `R-02`, … Each one is a single line with a short **Why**. A rule is something
to always or never do that the work taught you, not a restatement of the code.

```markdown
- **R-01 — <rule>.** <detail>. *Why:* <reason>.
```

## When to write

At **checkpoints**, not every turn:
- a step completes with an outcome worth keeping → workflow.md
- a problem is found, its cause confirmed, or it's fixed → issues.md (update the entry in place)
- a rule emerges, often from a user correction → rules.md

After writing, tell the user in one short line what you recorded (e.g. "Journal: added I-07,
updated step 9"). Don't paste the entries into chat.

## Ground rules

- **Facts vs. inference.** Mark guesses as *hypothesis (unverified)* until confirmed.
- **Distill.** A row or entry is a few lines. Detail lives in telemetry.
- **The user reviews.** Never commit or push journal files unless asked.
- **The user's wording wins.** If they rename, reorder, or reshape the files, follow their shape.
