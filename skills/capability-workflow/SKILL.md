---
description: The standard procedure for architectural guidance on new work — review, design, audit, planning, or establishing a pattern. Explains how to find the right capability, apply it to the local codebase, produce a local deliverable the user keeps, and (confirm-gated) draft a new capability. Use whenever the user is starting new work and wants guidance, or asks to review / design / audit / plan / "what's our standard for X".
---

# Capability workflow — architectural guidance on new work

Architect carries a catalog of **capabilities**: reusable playbooks for architectural work. Each
is free-form guidance (how to build an RBAC matrix, audit DB connections, optimize a multi-step
UI, …). You retrieve the relevant one, apply it to the user's actual code, and produce a
deliverable **they keep as a local file**. Capabilities live in the `software` domain unless the
user says otherwise.

## The sequence

1. **Find.** Call `findCapabilities({ intent: "<what the user is doing>", domain: "software" })`.
   It LLM-selects the best matches from the catalog and returns names + summaries. (For a plain
   browse, `listCapabilities({ domain: "software" })` returns the whole catalog.)
2. **Fetch.** Call `getCapability({ name: "<chosen>", domain: "software" })` to read the full
   guidance body. Don't guess bodies — always fetch.
3. **Apply.** Follow the guidance against the user's **local code** (read files, grep, git). The
   body tells you what to gather, how to reason, and how to validate.
4. **Deliver.** Produce the output as a **local file** — JSON, or markdown with embedded JSON —
   in the shape the capability suggests and the user prefers. **Never force a fixed schema**; the
   right shape depends on the task (a matrix, a nav doc, a diagram, a wizard proposal…). Capture
   the substance (findings, evidence pointers to file+line, remediations), not a template.

If no capability fits, say so and proceed with your own judgment — guidance is optional, not a gate.

## Adding or editing a capability (confirm-gated)

When the user establishes a new standard, or you notice a reusable pattern worth saving:
1. **Ask first.** Confirm with the user before writing anything to the catalog.
2. Call `upsertCapability({ name, domain: "software", displayName, shortDescription, tags, body,
   source: "agent" })`. It lands as a **draft** for human review — non-admins and agents cannot
   publish; only an admin can. Never try to publish on the user's behalf.
3. Keep the `body` free-form markdown, the same style as existing capabilities.

## Browsing / managing capabilities (humans)

If the user wants to see the whole catalog or manage capabilities in a UI rather than through
tools, point them to the capabilities portal: **https://placeholder.trillo.ai** *(placeholder —
the builder sets the real per-environment URL)*. For a quick in-session list, use
`listCapabilities({ domain: "software" })`.
