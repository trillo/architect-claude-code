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

Install the plugin, then register the `architect` MCP server for your app — the app rides the OAuth
**client id** (`architect-claude-code-<appName>`), registered via the CLI so your shell fills in the
name:

```bash
claude plugin marketplace add trillo/architect-claude-code
claude plugin install architect

export ARCHITECT_APP_NAME="Your_App_Name"                      # your Trillo Observability app's name
export ARCHITECT_MCP_URL="https://aos.trillo.ai/api/v2.0/mcp"  # or your deployment's URL
claude mcp add --transport http \
  --client-id "architect-claude-code-$ARCHITECT_APP_NAME" \
  --callback-port 8091 \
  architect "$ARCHITECT_MCP_URL"
```

Then authenticate: `/mcp` → **architect** → authenticate.

**Why the CLI and not the plugin's `.mcp.json`:** Claude Code does not expand `${VAR}` inside the
`oauth` block of `.mcp.json`, so the target app can't be set by an env var there. Registering via
the CLI lets your shell expand it into a literal client id (a public identifier, not a secret).

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

- `ARCHITECT_APP_NAME` — the Trillo Observability app to work against; forms the client id
  `architect-claude-code-$ARCHITECT_APP_NAME`.
- `ARCHITECT_MCP_URL` — the Trillo AOS MCP endpoint (e.g. `https://aos.trillo.ai/api/v2.0/mcp`, or
  your dev / self-hosted URL).

## Status

v0.1.0 — first cut. Comprehension tools reuse the existing Trillo Observability functions; guidance
runs on a seeded capability catalog (`software` domain), starting with `rbac-review`. The backend
(Capability store + `seed`/`list`/`find`/`get`/`upsert` functions) lives in the Trillo Observability
app.
