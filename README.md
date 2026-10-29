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
