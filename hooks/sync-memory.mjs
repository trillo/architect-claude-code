#!/usr/bin/env node
/**
 * Claude Code hook: sync distilled MEMORY fragments to the TAO collector.
 *
 * Single-file Node port of the former sync-memory.sh + sync_memory.py — no
 * python3, no jq, no external deps (Node 18+ built-ins only). Claude Code runs
 * on Node, so it is always present, and this runs natively on Windows too.
 *
 * Reuses the SAME telemetry env vars (no separate URL / key):
 *   OTEL_EXPORTER_OTLP_ENDPOINT  -> collector base URL
 *   OTEL_EXPORTER_OTLP_HEADERS   -> "Authorization=Bearer <key>"  (key extracted)
 *
 * Reads the hook JSON on stdin, acts only on SessionStart / Stop / SessionEnd,
 * finds memory/ next to the transcript, and POSTs new / changed fragments
 * (incremental by manifest diff; first run sends all). Never blocks Claude Code:
 * always prints {"continue": true} and exits 0.
 *
 * ON by default. Opt out with TRILLO_MEMORY_SYNC=off (or 0 / false / no) in the
 * same place you set the telemetry env — telemetry keeps working, memory stops.
 *
 * Collector endpoints (authenticated with the SAME telemetry key):
 *   GET  {BASE}/v1/memory/manifest -> {"items": {"<slug>": "<hash>", ...}}
 *   POST {BASE}/v1/memory          <- {"records": [ {name, description, type,
 *                                     originSessionId, modified, links, body, hash}, ... ]}
 * The collector resolves key -> (tenantId, keyId) and stores each record as a
 * log row: body (searchable), contentKind='memory', the memory.* attributes, and
 * resourceKey = {tenantId}.{keyId}  (KEY-LEVEL, shared across the key's agents).
 */
import { createHash } from "node:crypto";
import {
  readFileSync, writeFileSync, readdirSync, statSync, existsSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

const LINK_RE = /\[\[([^\]]+)\]\]/g;
const KV_RE = /^\s*([A-Za-z0-9_]+):\s*(.*)$/;

/** Parse one memory fragment -> record dict with a stable content hash. */
function parseFragment(path) {
  const text = readFileSync(path, "utf8");
  const fm = {};
  let body = text;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      for (const line of text.slice(3, end).split("\n")) {
        const m = KV_RE.exec(line);
        if (!m) continue;
        const k = m[1];
        // trim whitespace, then strip surrounding double, then single quotes
        const v = m[2].trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
        // skip block-scalar / nested headers; top-level wins over metadata.* dupes
        if (v && v !== "|" && v !== ">" && !(k in fm)) fm[k] = v;
      }
      body = text.slice(end + 4).replace(/^\n+/, "");
    }
  }
  const name = fm.name || basename(path).replace(/\.md$/, "");
  const desc = fm.description || "";
  const hash = createHash("sha256").update(desc + "\n" + body, "utf8").digest("hex");
  const links = [...new Set([...body.matchAll(LINK_RE)].map((x) => x[1]))].sort();
  return {
    name,
    description: desc,
    type: fm.type || "",
    originSessionId: fm.originSessionId || "",
    modified: fm.modified || "",   // ISO-8601 when present, else ""
    links,
    body,
    hash,
  };
}

/** Cheap fingerprint of the dir (name+size+mtime) to skip no-op runs. */
function dirDigest(memdir, files) {
  const h = createHash("sha256");
  for (const fn of files) {
    try {
      const st = statSync(join(memdir, fn));
      h.update(`${fn}:${st.size}:${Math.floor(st.mtimeMs / 1000)}\n`);
    } catch { /* ignore */ }
  }
  return h.digest("hex");
}

async function getJson(url, key) {
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + key },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function postJson(url, key, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.status;
}

async function sync(memdir, base, key) {
  const files = readdirSync(memdir)
    .filter((f) => f.endsWith(".md") && f !== "MEMORY.md")
    .sort();
  if (files.length === 0) return;

  const statePath = join(memdir, ".sync_state");
  const curDigest = dirDigest(memdir, files);
  // Nothing changed since the last successful sync -> exit before any network call.
  try {
    if (readFileSync(statePath, "utf8").trim() === curDigest) return;
  } catch { /* no prior state */ }

  const local = {};
  for (const fn of files) {
    try {
      const frag = parseFragment(join(memdir, fn));
      local[frag.name] = frag;
    } catch { /* skip unparseable fragment */ }
  }
  if (Object.keys(local).length === 0) return;

  // What's already stored, as {slug: hash}: our LOCAL manifest (reliable record
  // of what this machine uploaded) unioned with the SERVER manifest. The server
  // one is empty today (collector is write-only); when it's wired to read
  // OliverDB it fixes fresh-machine / multi-device dedup for free.
  const manifestPath = join(memdir, ".sync_manifest.json");
  const have = {};
  try {
    Object.assign(have, JSON.parse(readFileSync(manifestPath, "utf8")) || {});
  } catch { /* no local manifest yet */ }
  try {
    const m = await getJson(base + "/v1/memory/manifest", key);
    Object.assign(have, (m && m.items) || {});
  } catch { /* server manifest optional; local manifest still drives the diff */ }

  const changed = Object.values(local).filter((f) => have[f.name] !== f.hash);
  if (changed.length > 0) {
    try {
      await postJson(base + "/v1/memory", key, { records: changed });
    } catch {
      return; // upload failed -> retry next run (manifest + digest NOT saved)
    }
    for (const f of changed) have[f.name] = f.hash;
    try {
      writeFileSync(manifestPath, JSON.stringify(have));
    } catch { /* best effort */ }
  }

  // Reconciled (uploaded, or already in sync) -> remember this dir state so the
  // next run short-circuits before any file parse / network call.
  try {
    writeFileSync(statePath, curDigest);
  } catch { /* best effort */ }
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const input = await readStdin();   // drain stdin first (match the shell wrapper)

  // Explicit opt-out: memory sync is on by default; this disables it without
  // touching telemetry or uninstalling the plugin.
  const flag = (process.env.TRILLO_MEMORY_SYNC || "").trim().toLowerCase();
  if (flag === "off" || flag === "0" || flag === "false" || flag === "no") return;

  const base = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "").replace(/\/+$/, "");
  // Key lives inside OTEL_EXPORTER_OTLP_HEADERS as "...Authorization=Bearer <key>...".
  const km = (process.env.OTEL_EXPORTER_OTLP_HEADERS || "").match(/[Bb]earer\s+([^,]*)/);
  const key = km ? km[1].trim() : "";
  if (!base || !key) return;   // nothing configured -> no-op

  let event, transcript;
  try {
    const j = JSON.parse(input);
    event = j.hook_event_name;
    transcript = j.transcript_path;
  } catch {
    return;
  }
  if (event !== "SessionStart" && event !== "Stop" && event !== "SessionEnd") return;
  if (!transcript) return;

  // Memory lives next to the transcript: <proj>/<session>.jsonl -> <proj>/memory
  const memdir = join(dirname(transcript), "memory");
  if (!existsSync(memdir)) return;
  await sync(memdir, base, key);
}

main()
  .catch(() => { /* never raise to Claude Code */ })
  .finally(() => {
    process.stdout.write('{"continue": true}\n', () => process.exit(0));
  });
