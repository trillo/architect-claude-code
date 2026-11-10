# Architect — Claude Code plugin

An **architecture copilot** sidecar for Claude Code, backed by a **Trillo Observability** (Trillo
AOS) deployment. Install the plugin, sign in to your Trillo AOS account, and Claude can:

- **Comprehend past work** — reconstruct what your coding agents have done, from telemetry
  (agents → topics → executions → scoped Q&A).
- **Offer optional guidance** on new work — reusable *dynamic skills* (SKILL.md-style instructions
  stored in Sidecar and fetched over MCP: specs writing, architecture, design, an RBAC review, your
  own procedures), applied to your local code, with the deliverable saved as a local file you keep.

You don't change how you work. Guidance is offered, never required.

The plugin registers one MCP server (**`architect`**, on Trillo AOS) and ships six skills:
`architect-overview` (start here: status card + router), `dynamic-skills` (find, use, create and
edit dynamic skills), `comprehension` (analyze past work), `design-doc` (a design document of past work: the
Sidecar record joined to the git history of the files it changed), `docs` (save, find, read and update
documents in Sidecar, and import existing markdown), and `journal` (optional: keep
workflow / issues / rules as local files).

## Install

Install the plugin, then register the `architect` MCP server for your app. The target app rides the
OAuth **client id** (`architect-claude-code-<appName>`, a public identifier — not a secret), and the
MCP URL is your Trillo AOS deployment + `/api/v2.0/mcp`.

**1. Install the plugin:**

```bash
claude plugin marketplace add trillo/architect-claude-code
```

```bash
claude plugin install architect
```

**2. Connect it to your app** — replace `<appName>` with your Trillo Observability app's name and
`<your-aos-host>` with your deployment, then paste the whole (single-line) command. `--scope user`
makes architect available in **every** project you code in (drop it for current-project-only):

```bash
claude mcp add --scope user --transport http --client-id "architect-claude-code-<appName>" --callback-port 8091 architect "https://<your-aos-host>/api/v2.0/mcp"
```

**3. Start Claude Code** (the previous commands only edit config — this opens a session; run it in the same folder):

```bash
claude
```

**4. Authenticate:** inside the Claude Code session (not the shell), run `/mcp` → **architect** → **authenticate**. A browser opens to sign in, then redirects back; `/mcp` should then show **architect** connected.

**Why the CLI and not the plugin's `.mcp.json`:** Claude Code does not expand variables inside the
`oauth` block of `.mcp.json`, so the target app can't be parameterized there. Registering via the
CLI lets you put the app directly into the client id (a public identifier, not a secret).

## Update

To get a new version, run this in your shell (not inside a Claude Code session):

```bash
claude plugin marketplace update architect && claude plugin update architect
```

An open session keeps running the old version until you run `/reload-plugins` in it, or start a
new session (`claude --continue` picks up your last conversation). Your `architect` MCP
registration carries over, so you don't need to redo steps 2–4. If `/mcp` shows **architect**
disconnected afterwards, run `/mcp` → **architect** → **authenticate** again.

## Configuration

Two values go directly into the `claude mcp add` command (step 2 above) — no env vars to set:

- **app name** — your Trillo Observability app's name, in the client id
  `architect-claude-code-<appName>`. It selects which app AOS authenticates you against.
- **MCP URL** — your Trillo AOS deployment + `/api/v2.0/mcp`
  (e.g. `https://aos.trillo.ai/api/v2.0/mcp`, or your dev / self-hosted host).

Tip: a Trillo Observability deployment can hand you a ready-to-paste command with both filled in —
the Agent Keys → setup wizard renders this step with your app name and MCP URL already substituted.

## Status

v0.1.14: memory sync removed (Oloom no longer collects Claude Code memory; the plugin has no hooks or
settings). Comprehension tools reuse the existing Trillo Observability functions; guidance
runs on dynamic skills: system skills are the app's `skills/<name>.md` files (read-only, changed by a
deploy) plus each user's own (`listSkills` / `getSkill` / `saveSkill` / `deleteSkill` in the Sidecar app).
