---
name: design-doc
description: Write a design document (or a write-up) of past work on a topic by joining Sidecar's record of the work — the why, the alternatives tried, decisions, problems, open items — with the git history of the files that work changed, for the exact current mechanics. Use when the user asks for a design doc, a write-up, a history or "how does X work and why" for something already built with a coding agent.
---

# Design doc — Sidecar record + git

> **This skill is retrospective — for a feature already built.** For a **new feature** (forward
> design, before building), use the `write-design-doc` skill's forward mode: ground the design in
> existing code (find reusable mechanisms *first* — fan out search subagents where the agent has them), then write
> goals/non-goals → proposed design → alternatives → build plan → spec/acceptance, with the UI
> handoff and API reference as appendices, landing in `designs/`.

Sidecar holds the **conversation** side of past work: what was asked and decided, what was tried
and dropped, problems, open items. Git holds the **code** side: exactly what changed and what the
code does now. A design document needs both. Neither alone is enough: summaries can name a wrong
model or a wrong number; commit messages rarely say what was tried and rejected.

## The flow

1. **Find the topics.** `getTopicTree({ agentId })` lists the agent's topics (most recent
   first). Pick every topic that belongs to what the user asked about — work is often spread over
   a few (e.g. a design topic, a pod-port topic, a timeout fix). Confirm the list with the user
   if it is not obvious.
2. **Read the record.** `getTopic({ topicId })` for each topic returns its episodes, oldest
   first: summary, decisions, items (open items, concerns, problems), `files`
   (`{path, op, repo}`), `commits` (`{hashes, messages}`), start/end time, execution ids.
3. **Join to git (locally — the repos are on this machine).** For each episode:
   - commits named in the record: `git -C <repo> show --stat <hash>`;
   - commits by files and time: `git -C <repo> log --since=<start - 5 min> --until=<end + 60 min>
     --format='%h %ad %s' -- <the episode's files in that repo>`.
     `scripts/git_join.py` does this for a saved `getTopic` response.
   Drop commits that only touched shared journal files (`issues.md`, `MEMORY.md`, notes).
4. **Get the exact mechanics from the code.** Read the key files at the last commit (or HEAD) for
   parameters, data model and APIs. **The code wins** over a summary when they disagree.
5. **Drill into executions only for what neither has** — the user's reasoning, an evaluation
   result: `searchExecutions({ agentId, query })`, then `getExecutionDetails({ executionId })`.
6. **Write the document** as a local markdown file (then offer to save it to Sidecar — step 7):
   1. Problem and goals
   2. How it evolved (versions, why each was replaced)
   3. Current design — stage by stage, with parameters from the code
   4. Data model and APIs
   5. Runtime and evaluation results
   6. Key decisions (with reasons)
   7. Problems hit and how they were resolved
   8. Security / privacy concerns
   9. Open items
   10. Corrections to the record (where code or executions contradicted a summary)
   11. Commits behind each topic (episode → commits)

7. **Offer to save it to Sidecar** (the `docs` skill): type `Design`, a subfolder from the topic,
   `sources` = the topics (`sidecar://agents/<id>/topics/<id>`), the key executions and the commits
   it cites, `generatedBy: architect-design-doc/<model>`, `origin` when the file is in a repo.

## Rules

- Facts carry their source: an episode, an execution id, or a commit. Mark your own inference.
- Keep stages distinct: proposed / built / pushed / deployed / verified — say only what the
  record or git shows.
- An episode with no files cannot be joined by files; look for hashes in its `commits`, or search
  its executions.
- Prompts and replies may contain secrets; never copy tokens or keys into the document.
