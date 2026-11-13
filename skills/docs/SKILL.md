---
name: docs
description: Save, find, read and update documents (markdown — designs, PRDs, specs, plans, reports, notes) in Sidecar, so the people who follow the work can see and search them. Use when the user asks to save, share, store, find, open or update a document in Sidecar, to import existing markdown, and — offered once — right after writing a design, PRD, spec or report.
---

# Docs — documents in Sidecar

Sidecar keeps the documents a developer and their coding agent produce next to the agents and topics
the work came from. A document's **metadata** (its frontmatter) and **content** (markdown, no YAML
block) are stored separately; every save of new content is a new **version**. Tools: `saveDocument`,
`getDocument`, `listDocuments`, `searchDocuments`, `search`, `updateDocumentInfo`, `deleteDocument`,
`rebuildIndex`.

## Who sees a document

- The **owner** (the writer) always.
- Unless it is **private**: also anyone who can see the document's **agent**.

## The document's agent

- A document belongs to **the writer's own agent**: the agent of the key this session runs under.
  Never another user's agent - even when the work analyzed someone else's (shared) agent. Cite that
  agent's topics as `sources` instead.
- Always pass `sessionId: "${CLAUDE_SESSION_ID}"` to `saveDocument`; the server finds the agent.
  Don't look it up yourself; never ask for or pass the collector key.
- If the save is refused because the agent can't be determined, the message lists the user's agents:
  ask the user which one, then save again with `agentId` set to it.
- If it is refused because the agent belongs to another organization, tell the user to switch to that
  organization and save again.
- Move a document to another of the user's own agents with `updateDocumentInfo({ id, agentId })`.

## Saving

**When:** when the user asks; and, after you write a design, PRD, spec or report, offer **once**:
*"Save this to Sidecar? People who can see your agent will see it — or keep it private."* Never
save silently.

**A new document** — give `type` and `title`; the server composes the path: the type's folder
(Design → `designs/`, PRD → `prds/`, Spec → `specs/`, Plan → `plans/`, Decision → `decisions/`,
Runbook → `runbooks/`, Report → `reports/`, Note → `notes/`; any other type gets its own folder) + a
file name from the title.
- **One level only.** The folder tree is exactly one level deep: every document lives directly in a
  top-level folder, never in a sub-folder. **Never pass `subfolder`.** Deep trees are hard to browse,
  and a single flat level keeps every reader's documents organized the same way.
- **Design documents** (`type: design`) land in `designs/`. A design document works out *how* to
  build a net-new feature or change — problem, proposed design, alternatives, spec/acceptance.
- **Enhancement requests** go in a top-level `enhancements/` folder — the short "we should build X"
  note that still needs design: `path: "enhancements/<title-slug>.md"`, `type: note`. Designing one
  produces a design document in `designs/`.
- **Bookkeeping documents only on request.** Don't create Decision, WorkLog or other record-keeping
  documents on your own (and don't offer to). Write them only when the user asks.
- **Frontmatter** (`frontmatter`, JSON):
  - `description` — one line on what the document is (search relies on it; always write one);
  - `tags`; `status: draft`;
  - `sources` — what it was built from, `{id, resource, title}`: topics as
    `sidecar://agents/<agentId>/topics/<topicId>`, executions as
    `sidecar://agents/<agentId>/executions/<executionId>`, commits as `git:<repo>@<hash>`; cite them in
    the body with footnote markers `[^id]`, and put the footnote definitions in a `## Sources` section
    at the end (grouped, never inline prose). The viewer hides citations by default and reveals them
    with a toggle, so keep the marker in the sentence and the detail in the note — don't write raw
    `file:line` or URLs into the running text.
- `generatedBy`: `architect-docs/<model>` for what you wrote; `human:<email>` (the user's email) when the user wrote it.
- **A file that lives in a repo**: pass `origin {repo, path, commit}` (current HEAD). Saving the same
  repo file again updates the same document.
- **A local file with a YAML block**: send it as is if the block is simple (`key: value`, `[a, b]`);
  otherwise split it and send the frontmatter as JSON.
- **First save of a document**: say who will see it (the user + people who can see their agent) and
  offer private. After that, no prompt.

**Updating** — always by `id` (from the save, or `listDocuments`): `getDocument({ id, part: "content" })`
→ edit (in a local file if it is long) → `saveDocument({ id, content, expectedVersion })`. On **409**
(someone saved a newer version): fetch the latest, show what changed, merge, save again with its
version. Never overwrite blindly. Move with `updateDocumentInfo({ id, path })`, never by retitling.
New content clears a human verification; tell the user if the document was verified, so they can
verify it again.

**After a save**, report: the path and version; who can see it; and **any redactions** (*"2
credentials were redacted"*) — the stored copy then differs from the local file.

## Finding and reading

- **By meaning or words:** `searchDocuments({ query, folder?, type?, mine?, agentId?, topicId? })` — one
  result per document with its best-matching passage (`match.heading`, `match.snippet`); prefer it to
  `listDocuments` for "find the doc about …". If a save reported `index.pending` or `index.error`, or
  search misses documents saved before search existed, run `rebuildIndex()` (async; returns a taskId).
- **Across topics and documents:** `search({ query, agentId? })` returns `topics` (an episode match
  shows as its topic, with the episode's date and passage) and `documents`, each best first — use it
  for "where did we decide / discuss X".
- **By place or filter:** `listDocuments({ search | folder | topicId | agentId | type | mine })` — show title, description,
  path, owner, version, and the trust tier: agent-written and unverified (`generatedBy` not `human:`,
  no `verifiedBy`) vs human-reviewed (`verifiedBy` starts with `human:`).
- `getDocument({ id, part })` — `content` to read; `full` for the file with frontmatter; `version` for
  an older one. Quote the relevant section rather than pasting the whole document.

## Other actions

- Private / public, rename, retitle, tags, status: `updateDocumentInfo`.
- **Verify** (the user confirms the document is right): `updateDocumentInfo({ id, verify: true })`.
- Delete: `deleteDocument({ id })` — owner only, after the user confirms; versions are kept.

## Import existing markdown

"Import the docs in <folder>": list the `.md` files; propose a table — local file → type → subfolder →
one-line description — and ask the user to confirm or edit it; then save each with `origin`
(repo, path, HEAD commit), `generatedBy: human:<email>` unless an agent wrote it, and report what was
saved, skipped or redacted. Re-running the import updates the same documents (matched by `origin`).

## Rules

- Never save without the user's agreement (asked, or the one-time offer accepted).
- Never put tokens or keys into a document; the server redacts what it recognizes, but don't rely on it.
- Only the owner can change or delete a document; for someone else's, save your own copy.
