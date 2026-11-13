# Oloom — plugin for Claude Code and Codex

**Oloom** is the knowledge layer over your coding agents' work, backed by a **Trillo Observability**
(Trillo AOS) deployment. Install the plugin, sign in to your Trillo AOS account, and your coding
agent can:

- **Comprehend past work** — reconstruct what your coding agents have done, from telemetry
  (agents → topics → executions → scoped Q&A).
- **Keep documents** — save, find and update designs, PRDs, specs and notes in Sidecar.
- **Use dynamic skills** when you ask — reusable instructions (SKILL.md-style) stored in Sidecar
  and fetched over MCP: specs writing, architecture, design, an RBAC review, your own procedures.

You don't change how you work. Skills are used only when you ask.

The plugin registers one MCP server (**`oloom`**, on Trillo AOS) and ships six skills:
`oloom-overview` (start here: status card + router), `dynamic-skills` (find, use, create and
edit dynamic skills), `comprehension` (analyze past work), `design-doc` (a design document of past work: the
Sidecar record joined to the git history of the files it changed), `docs` (save, find, read and update
documents in Sidecar, and import existing markdown), and `journal` (optional: keep
workflow / issues / rules as local files).

## Install

Install the plugin, then register the `oloom` MCP server. The OAuth **client id** is
`oloom-TAO` (a public identifier, not a secret: `TAO` is the Oloom app's name on Trillo AOS), and
the MCP URL is `https://aos-oliver.trillo.ai/api/v2.0/mcp`.

**1. Install the plugin:**

```bash
claude plugin marketplace add trillo/oloom-plugin
```

```bash
claude plugin install oloom@oloom
```

**2. Connect it to Oloom** — paste the whole (single-line) command. `--scope user`
makes oloom available in **every** project you code in (drop it for current-project-only):

```bash
claude mcp add --scope user --transport http --client-id "oloom-TAO" --callback-port 8091 oloom "https://aos-oliver.trillo.ai/api/v2.0/mcp"
```

**3. Start Claude Code** (the previous commands only edit config — this opens a session; run it in the same folder):

```bash
claude
```

**4. Authenticate:** inside the Claude Code session (not the shell), run `/mcp` → **oloom** → **authenticate**. A browser opens to sign in, then redirects back; `/mcp` should then show **oloom** connected.

**Why the CLI and not the plugin's `.mcp.json`:** Claude Code does not expand variables inside the
`oauth` block of `.mcp.json`, so the target app can't be parameterized there. Registering via the
CLI lets you put the app directly into the client id (a public identifier, not a secret).

## Install in Codex

The same repo is a Codex plugin (`.codex-plugin/plugin.json`, marketplace in
`.agents/plugins/marketplace.json`) with the same six skills. The `oloom` MCP server is
registered the same way as for Claude Code: by command, with your app in the OAuth client id.

**1. Install the plugin:**

```bash
codex plugin marketplace add trillo/oloom-plugin
```

Then install **oloom** from that marketplace: in Codex's plugin list, or the Plugins Directory
of the ChatGPT desktop app.

If your Codex can't install plugins, copy the skills instead — Codex reads skills from
`~/.agents/skills/`:

```bash
git clone https://github.com/trillo/oloom-plugin ~/.trillo/oloom && mkdir -p ~/.agents/skills && cp -R ~/.trillo/oloom/skills/* ~/.agents/skills/
```

**2. Connect it to Oloom:**

```bash
codex mcp add oloom --url "https://aos-oliver.trillo.ai/api/v2.0/mcp" --oauth-client-id "oloom-TAO"
```

**3. Sign in** — a browser opens to sign in, then redirects back (skip if `codex mcp add` already
signed you in):

```bash
codex mcp login oloom
```

**4. Start Codex** (`codex`) and run `/mcp`: **oloom** should be listed with its tools. Ask
"use oloom to list my agents" to check.

## Update

To get a new version, run this in your shell (not inside a Claude Code session):

```bash
claude plugin marketplace update oloom && claude plugin update oloom@oloom
```

An open session keeps running the old version until you run `/reload-plugins` in it, or start a
new session (`claude --continue` picks up your last conversation). Your `oloom` MCP
registration carries over, so you don't need to redo steps 2–4. If `/mcp` shows **oloom**
disconnected afterwards, run `/mcp` → **oloom** → **authenticate** again.

## Configuration

Two values go directly into the `claude mcp add` command (step 2 above) — no env vars to set:

- **client id** — always `oloom-TAO`. The part after `oloom-` is the Oloom app's name (`TAO`); it
  selects which app AOS signs you in to.
- **MCP URL** — `https://aos-oliver.trillo.ai/api/v2.0/mcp`. To use another Trillo AOS deployment (for example a dev host), put its
  host in place of `aos-oliver.trillo.ai`.

Tip: a Trillo Observability deployment can hand you a ready-to-paste command with both filled in —
the Agent Keys → setup wizard renders this step with the MCP URL already filled in.

## Status

v0.2.0: renamed Architect → Oloom: plugin, marketplace and MCP server `oloom`; repo
`trillo/oloom-plugin`; client id `oloom-TAO`; overview skill `oloom-overview`.


v0.1.17: Codex support — `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json` beside
the Claude Code manifests; skills carry a `name` and say how to sign in again in either agent.

v0.1.14: memory sync removed (Oloom no longer collects Claude Code memory; the plugin has no hooks or
settings). Comprehension tools reuse the existing Trillo Observability functions; guidance
runs on dynamic skills: system skills are the app's `skills/<name>.md` files (read-only, changed by a
deploy) plus each user's own (`listSkills` / `getSkill` / `saveSkill` / `deleteSkill` in the Sidecar app).
