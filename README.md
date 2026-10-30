# Architect — Claude Code plugin

An **architecture copilot** sidecar for Claude Code, backed by a **Trillo Observability** (Trillo
AOS) deployment. Install the plugin, sign in to your Trillo AOS account, and Claude can:

- **Comprehend past work** — reconstruct what your coding agents have done, from telemetry
  (agents → topics → executions → scoped Q&A).
- **Offer optional architectural guidance** on new work — reusable *capabilities* (how to build an
  RBAC matrix, audit DB connections, optimize a multi-step UI, …), applied to your local code, with
  the deliverable saved as a local file you keep.

You don't change how you work. Guidance is offered, never required.

The plugin registers one MCP server (**`architect`**, on Trillo AOS) and ships three skills:
`architect-overview` (start here / router), `capability-workflow` (guidance on new work), and
`comprehension` (analyze past work).

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

## Memory sync (bundled hook)

The plugin ships a lifecycle hook (`hooks/sync-memory.mjs`, run via `node`) that uploads
Claude Code's **distilled memory** — the cross-session facts it remembers — to the same
Trillo collector as your telemetry. That memory is the one knowledge layer not in
telemetry, so it lets the comprehension tools build cleaner topic summaries and answer
"how did we build X" more completely.

It is **automatic and on by default**: installing the plugin registers it, and it reuses the
telemetry env you already set (`OTEL_EXPORTER_OTLP_ENDPOINT` + the bearer key inside
`OTEL_EXPORTER_OTLP_HEADERS`). If those aren't set, it does nothing. It fires on session
start and after each turn, uploads only new/changed fragments (content-hash diff), sends
distilled fragments only (never raw transcripts), and never blocks Claude Code. No python
or jq needed; works on Windows.

**To turn it off** without uninstalling the plugin, set `TRILLO_MEMORY_SYNC=off` (or `0` /
`false` / `no`) alongside your telemetry env — telemetry keeps flowing, only memory sync stops.

So Claude Code setup is **two steps, not three**: (1) the telemetry env, and (2) this
plugin (which carries the MCP server, the skills, and this hook). Turn the sync off by
removing the plugin, or by unsetting the telemetry env.

## Configuration

Two values go directly into the `claude mcp add` command (step 2 above) — no env vars to set:

- **app name** — your Trillo Observability app's name, in the client id
  `architect-claude-code-<appName>`. It selects which app AOS authenticates you against.
- **MCP URL** — your Trillo AOS deployment + `/api/v2.0/mcp`
  (e.g. `https://aos.trillo.ai/api/v2.0/mcp`, or your dev / self-hosted host).

Tip: a Trillo Observability deployment can hand you a ready-to-paste command with both filled in —
the Agent Keys → setup wizard renders this step with your app name and MCP URL already substituted.

## Status

v0.1.0 — first cut. Comprehension tools reuse the existing Trillo Observability functions; guidance
runs on a seeded capability catalog (`software` domain), starting with `rbac-review`. The backend
(Capability store + `seed`/`list`/`find`/`get`/`upsert` functions) lives in the Trillo Observability
app.
