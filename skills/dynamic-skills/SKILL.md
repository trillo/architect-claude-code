---
name: dynamic-skills
description: Dynamic skills - reusable instructions (write a design doc, specs, architecture, the user's own procedures) stored in Sidecar and fetched over MCP instead of installed locally. Use ONLY when the user explicitly asks - to list skills, to use a named skill ("use the write-design-doc skill"), or to create, change, turn off or delete a skill. Never on your own initiative.
---

# Dynamic skills

Dynamic skills work like local skills (a `SKILL.md`: name, description, markdown body), but
they live in Sidecar, so they reach every machine at once and the user can grow them. Two layers:
- **System** skills ship with Sidecar.
- **My** skills are the user's own, per agent. One with the same name as a system skill replaces it
  for that agent.

The server merges the two; you always see one skill per name.

## Which agent

Pass `agentId` to every call: the agent selected in this conversation, if any; otherwise this
session's coding agent. Find that agent as `oloom-overview` does: `getSessions({ agentId,
sessionId: "${CLAUDE_SESSION_ID}" })` over the user's coding agents; the one that returns the session
is it (use the top-level `agentId`, never `sessionAgentId`).
Never ask for or pass the collector key.

## Only when asked

Dynamic skills must not get in the way of normal work. Use them only when the user explicitly asks:
- Do not list, suggest or apply a skill on your own, even when one seems to fit.
- Do not offer to create or update a skill on your own.
- Do not mention them unless the user does.

## Using skills

1. **"What skills do I have?"** → `listSkills({ agentId })`: show name + description (`skills`).
2. **"Use <skill>"** (the name need not be exact; match it against `listSkills`, ask if unclear) →
   fetch the body with `getSkill({ name, agentId })`. Never guess a body.
3. If a skill named `base` exists, read it too while a dynamic skill is in use, and follow it.
   It applies only to work done with dynamic skills.
4. **Say** which one you use, in one line: *"Using dynamic skill: write-design-doc."*
5. **Apply** it to the user's real code and situation. Deliverables are local files in the shape
   the skill suggests and the user prefers. After a design, PRD, spec or report, the `docs` skill's
   save offer applies.
6. **After compaction**, fetch the skill again before continuing; the summary may have dropped it.

**Who wins:** the user in the conversation first, then local project instructions (CLAUDE.md,
AGENTS.md, installed skills), then the dynamic skill, then `base`. Frontmatter keys such as `allowed-tools`
or `model` have no effect for dynamic skills; read them as notes.

## Creating a skill

- Only when the user asks (*"save this as a skill"*).
- Write it in SKILL.md form:
  - `name`: lowercase letters, digits and hyphens;
  - `description`: what it does **and when to use it** (that is how it gets chosen later; at most
    1024 characters);
  - the body: plain steps and rules, following `base`. Keep it short. The structure is whatever
    the work needs.
- Show the draft. Save only when the user agrees: `saveSkill({ agentId, content, generatedBy })`,
  with `generatedBy` set to `oloom-skills/<model>` when you wrote it, or `human:<email>` when
  the user did.

## Changing a skill

- `getSkill({ name, agentId })` → edit → `saveSkill({ agentId, name, content, expectedVersion })`,
  where `expectedVersion` is the version you read. On 409, fetch again, merge, save.
- **A system skill:** first copy it - `duplicateSkill({ name, agentId, layer: "system" })` (same
  name, so it replaces the system skill for this agent; the copy remembers where it came from) -
  then edit the copy. Say so once: *"This makes your own copy of <name>; delete it to go back to the
  system version."*
- **Copy a skill** under a new name or to another of the user's agents:
  `duplicateSkill({ name, agentId, newName?, targetAgentId? })`.
- **Rename:** `saveSkill({ id, name: newName })`. Masking is by name: a renamed copy stops replacing
  the system skill of its old name (that one applies again - tell the user).
- **Turn a system skill off** for this agent: `saveSkill({ agentId, name, disabled: true })`; back on
  with `disabled: false`.
- **Delete** (after the user confirms): `deleteSkill({ agentId, name })`. A system skill of the same
  name applies again.
- No change notes or version comments. Every save is a version. If someone asks what changed,
  compare versions (`getSkill({ name, agentId, version })`).

## Rules

- Never save or change a skill without the user's agreement.
- Never put tokens, keys or personal data in a skill.
- System skills are part of the application: read-only, changed or removed only by a release. A user
  works differently by making their own copy, which hides the system skill for them.
