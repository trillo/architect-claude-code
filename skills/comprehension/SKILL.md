---
description: How to analyze past coding-agent work from Trillo Observability telemetry — find an agent, narrow to a topic, pull executions, and answer questions scoped to that agent or topic. Use when the user wants to understand prior work, asks "what has agent X been doing", "why did these runs fail", or wants to explore the knowledge base of past executions.
---

# Comprehension — analyze past work from telemetry

Reconstruct what coding agents have done, from the Trillo Observability knowledge base. Work
top-down: **agent → topic → executions → answer**. Keep the selected `agentId` / `topicId` as
conversation state and thread them into each call. Report **facts from tools** separately from your
own **inference**.

## The flow

1. **Pick the agent.** `getAgents` lists the coding agents. Confirm which one the user means (by
   name / resourceKey) before narrowing.
2. **Find the topic.**
   - Browse: `getAgentTopics({ agentId })` — the agent's topics (clusters of related work).
   - Search within the agent: `findTopics({ agentId, phrase })` — keyword match over
     label/description/tags.
3. **Pull executions.**
   - For a topic: `getTopicExecutions({ ... })`.
   - Full-text across executions (optionally scoped to a topic): `searchExecutions({ query, topicId? })`.
   - One run in detail: `getExecutionDetails({ executionId })`.
4. **Answer scoped questions.** `answerFromKnowledge({ question })`. To scope the answer to a
   topic's runs, pass that topic's execution ids as `executionIds`. Cite the executions the answer
   drew on.

## Notes

- Prefer narrowing (agent → topic) before a broad `searchExecutions` — it keeps answers grounded
  and cheap.
- This is read-only comprehension. For *how to do something* (a standard, an audit method), switch
  to the **capability-workflow** skill — don't answer architecture-method questions from telemetry.
- If a tool returns "unauthorized", re-authenticate: `/mcp` → **architect** → authenticate.
