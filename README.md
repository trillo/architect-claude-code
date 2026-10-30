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

## Update

To get a new version, run this in your shell (not inside a Claude Code session):

```bash
claude plugin marketplace update architect && claude plugin update architect
```

An open session keeps running the old version until you run `/reload-plugins` in it, or start a
new session (`claude --continue` picks up your last conversation). Your `architect` MCP
registration carries over, so you don't need to redo steps 2–4. If `/mcp` shows **architect**
disconnected afterwards, run `/mcp` → **architect** → **authenticate** again.

**Updating from 0.1.0 to 0.1.1 or later:** 0.1.1 adds two plugin settings for memory sync, and
an update doesn't ask for them. Run `/plugin`, open the **Installed** tab, select **architect**,
choose **Disable**, then **Enable**. Enabling asks for the collector endpoint and key (see
[Memory sync](#memory-sync-bundled-hook)). Then run `/reload-plugins`.

## Memory sync (bundled hook)

The plugin ships a lifecycle hook (`hooks/sync-memory.mjs`, run via `node`) that uploads
Claude Code's **distilled memory** — the cross-session facts it remembers — to the same
Trillo collector as your telemetry. That memory is the one knowledge layer not in
telemetry, so it lets the comprehension tools build cleaner topic summaries and answer
"how did we build X" more completely.

**Configure it once.** When you enable the plugin, Claude Code asks for two values: the same
collector you already use for telemetry.

- **Collector endpoint**: the value of your `OTEL_EXPORTER_OTLP_ENDPOINT`.
- **Collector key**: the `<key>` in `OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <key>"`.
  It's stored in your OS credential store.

The hook can't read your telemetry env directly, because Claude Code strips `OTEL_*` variables
from every process it spawns, hooks included. That's why it asks for the values separately.

After that it's automatic. It fires on session start and after each turn, uploads only
new or changed fragments (content-hash diff), sends distilled fragments only (never raw
transcripts), and never blocks Claude Code. No python or jq needed, and it works on Windows.

**Check it's working:** `~/.claude/projects/<project>/memory/.sync_log` holds one line from the
last run: `synced N fragments`, `up to date`, `skipped: …` with the reason, or `upload failed: …`.

**To turn it off** without uninstalling the plugin, clear the collector endpoint in the plugin
config, or set `TRILLO_MEMORY_SYNC=off` (or `0` / `false` / `no`) in your shell env. Telemetry
keeps flowing; only memory sync stops.

## Configuration

Two values go directly into the `claude mcp add` command (step 2 above) — no env vars to set:

- **app name** — your Trillo Observability app's name, in the client id
  `architect-claude-code-<appName>`. It selects which app AOS authenticates you against.
- **MCP URL** — your Trillo AOS deployment + `/api/v2.0/mcp`
  (e.g. `https://aos.trillo.ai/api/v2.0/mcp`, or your dev / self-hosted host).

Tip: a Trillo Observability deployment can hand you a ready-to-paste command with both filled in —
the Agent Keys → setup wizard renders this step with your app name and MCP URL already substituted.

## Status

v0.1.1: memory sync reads the collector from plugin config (v0.1.0 read `OTEL_*`, which hooks
never see, so it never synced). v0.1.0 was the first cut. Comprehension tools reuse the existing Trillo Observability functions; guidance
runs on a seeded capability catalog (`software` domain), starting with `rbac-review`. The backend
(Capability store + `seed`/`list`/`find`/`get`/`upsert` functions) lives in the Trillo Observability
app.
