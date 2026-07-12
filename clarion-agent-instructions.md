# AGENT INSTRUCTIONS — Build "Clarion" from clarion-spec.md

You are building **Clarion**, a Slack accessibility agent, for the Slack Agent Builder Challenge (deadline: July 13, 2026, 5:00 PM PDT). The complete product/technical specification is in `clarion-spec.md`. This file tells you exactly how to use that spec and how to execute. Read both files fully before writing any code.

---

## 0. Ground Rules (non-negotiable)

1. **The spec is the source of truth.** Do not redesign the product, rename features, change the stack, or "improve" the architecture. Where this file and the spec conflict, this file wins. Where the spec is silent, make the smallest reasonable choice and record it in `DECISIONS.md`.
2. **Build in the spec's priority order** (spec §9): F5 → F1 → F2 → F3 → F4 → MCP → stretch. Never start feature N+1 until feature N runs end-to-end in a real Slack sandbox. A half-working demo of 5 features beats 8 features that compile but were never run.
3. **Run everything you build.** "It typechecks" is not done. Done = you triggered the feature in Slack and saw the correct output. After each feature, write the manual verification you performed into `TESTING.md` (feature, steps, observed result).
4. **Cut order when behind schedule** (spec §9): F7 → F8 → F6 → MCP server. Never cut F1–F5. Never cut running/verifying to save time.
5. **Commit after every working feature** with message `feat(F2): make-accessible shortcut working e2e`. Small commits; never one giant commit at the end.
6. **No secrets in the repo.** Provide `.env.example` with placeholder keys listed in spec §8. Load via `dotenv`. App must fail closed (refuse to start with a clear error) if any required env var is missing.

---

## 1. Read Phase (before coding)

1. Read `clarion-spec.md` top to bottom. Then re-read §3 (features), §4 (architecture), §6 (UX) — these define your acceptance criteria.
2. Read these Slack docs (append `.md` to any docs.slack.dev URL for markdown):
   - https://docs.slack.dev/ai/developing-agents — agent surface, `agent_view`, events, setStatus/setTitle/suggested prompts
   - https://docs.slack.dev/apis/web-api/real-time-search-api — RTS scopes, `action_token` rules, `assistant.search.context`
   - https://docs.slack.dev/reference/methods/assistant.search.context — exact request/response shape
   - https://docs.slack.dev/ai/agent-quickstart — CLI scaffold flow
   - Bolt JS Assistant class docs: https://docs.slack.dev/tools/bolt-js/concepts/using-the-assistant-class
3. Write a short `PLAN.md`: your build order, time budget per feature, and what you will demo at each checkpoint. Keep it under a page.

---

## 2. Project Setup

1. Node 20, TypeScript strict mode, Bolt for JavaScript v4+, **Socket Mode** (`socket_mode_enabled: true`). No public HTTP endpoint.
2. Use the exact module layout from spec §4.3. Do not invent a different structure.
3. Use the manifest in spec §4.2 verbatim as `manifest.yaml` (adjust only if Slack rejects a field — record any change in `DECISIONS.md` with the error message that forced it).
4. Dependencies (keep it minimal — do NOT add an agent framework, LangChain, or an ORM):
   - `@slack/bolt`, `openai`, `better-sqlite3`, `node-cron`, `dotenv`, `@modelcontextprotocol/sdk` (MCP phase only)
   - dev: `typescript`, `tsx`, `@types/*`, `eslint` + `@typescript-eslint`
5. `npm run` scripts: `dev` (tsx watch), `build` (tsc), `start`, `lint`, `typecheck`. CI-quality bar: `lint` and `typecheck` must pass at every commit.
6. Create the Slack app in a **Slack Developer Program sandbox** (https://api.slack.com/developer-program). At hour 0, also request a sandbox with **Slack AI Search** enabled (needed for semantic RTS; keyword RTS works without it — the code must handle both, see §4.3 below).

---

## 3. Feature Acceptance Criteria (verify each in Slack before moving on)

### F5 — Agent chat loop (build FIRST; it's the skeleton)
- App appears in the Slack agent top bar; opening it shows a welcome message and 3 suggested prompts (spec F1 list).
- Sending any DM: status shows "thinking…" (`assistant.threads.setStatus`), then a GPT-4o response arrives in-thread; thread gets a title.
- With a channel open + agent split view: "summarize this channel" works using `app_context_changed` context.
- Errors never leave a stuck status: wrap handlers in try/catch; on failure clear status and post a plain apology message.

### F1 — Profiles
- First-open welcome includes a "Set up my profile" button → modal with the exact fields in spec §3.1 F1.
- Saved to SQLite; `/clarion profile` reopens with current values pre-selected.
- Every LLM call thereafter reads the profile (verify: switch profile to "bullet summaries" and confirm output style changes).

### F2 — Make Accessible shortcut (the demo centerpiece — polish this most)
- Message shortcut on any channel message. `ack()` within 3s (do LLM work after ack; use a loading modal or ephemeral "working…" then update).
- Output: ephemeral Block Kit card with the 4 sections from spec §6.2 (TL;DR / Plain version / Actions / Terms) + "Send to my DMs" button that reposts the card as a DM.
- Works on a message with a 10+ reply thread (fetches full thread via `conversations.replies`).

### F3 — RTS acronym expansion
- The Terms section of F2 shows workspace-derived definitions with **permalinks to the defining message** when RTS finds one; clearly-labeled general definitions otherwise.
- Standalone: DM "what does XYZ mean here?" → cited answer.
- **`action_token` plumbing is the hard part**: bot-token RTS calls require the `action_token` from the triggering `message.im`/channel-message event. Thread it explicitly through the call chain (no globals). For flows with no event token (digest), use `SLACK_USER_TOKEN` (xoxp) and no action_token. Cache acronym hits in SQLite.
- Handle RTS gracefully when the sandbox lacks AI Search: if `assistant.search.info` says no semantic search, phrase queries as keywords instead of questions.

### F4 — Image descriptions
- Invite the bot to a channel; post an image; every channel member with `describe images: on` gets a DM within ~30s containing: who posted, where (permalink), one-line alt text, detailed description (including text/numbers visible in the image).
- Respects the rate guard (20 img/hr/workspace) and 5 MB size skip from the spec.
- Download the file with the bot token via `url_private_download` + auth header.

### MCP server
- Separate entrypoint (`npm run mcp`) exposing the 4 tools in spec §4.4, reusing `core/llm.ts` (no logic duplication).
- Verified with MCP inspector (`npx @modelcontextprotocol/inspector`) at minimum; connecting to the Slackbot MCP Client is a bonus, not a blocker.

### Stretch F6/F7/F8 — only if all of the above are verified working and >6h remain before handoff.

---

## 4. Quality Bar

1. **UX (judged criterion):** every Block Kit message must set `text` fallback (screen readers); ≤3 sections per card; follow spec §6 exactly. This project is *about* accessibility — sloppy a11y in our own output is disqualifying irony.
2. **Prompts:** keep all LLM prompts in one file (`core/llm.ts` or `core/prompts.ts`), each parameterized by the user profile. Vision prompt must say: describe only what is visible; state uncertainty; include any legible text/numbers.
3. **Privacy (spec §7):** never write message bodies or images to disk/DB. Only profiles, acronym cache, digest metadata.
4. **Error handling:** every listener wrapped; failures produce a user-visible, friendly message and a console error — never silence, never a stuck "thinking…".
5. **README.md:** setup from zero (create app from manifest → tokens → `.env` → `npm run dev`), feature list, and a "known limitations" section (be honest: it helps judging credibility).

---

## 5. Deliverables & Handoff

Push to the designated GitHub repo. The handoff will be picked up by another engineer (Devin) who will do sandbox integration, demo-data seeding, architecture diagram, video, and Devpost submission. To make that handoff clean, the repo must contain:

1. Working code, committed per-feature, `lint`+`typecheck` green.
2. `manifest.yaml` — the exact manifest currently installed in your sandbox.
3. `.env.example` — every required variable, with a one-line comment each.
4. `TESTING.md` — what you verified manually per feature, plus anything NOT working with your best diagnosis (an honest "F4 DM fan-out untested" saves the next engineer hours).
5. `DECISIONS.md` — every deviation from the spec and why.
6. `PLAN.md` — updated with what actually got built vs. cut.
7. Sandbox details in `TESTING.md`: workspace URL and app ID (tokens go via secret channel, never the repo).

**Definition of done for handoff:** a stranger can clone the repo, follow README, and have F1–F5 working in their own sandbox within 30 minutes.

---

## 6. Common Failure Modes to Avoid

- Building against the deprecated `assistant_view` experience — use `agent_view` (spec §4.2; new apps can only use `agent_view`).
- Forgetting `ack()` within 3 seconds on shortcuts/actions → Slack shows an error to the user.
- Calling RTS with a bot token but no `action_token` → API error; see §3 F3 above.
- Posting accessibility output publicly in-channel — everything is ephemeral or DM (dignity by default).
- Spending hours on the digest cron while F2 (the demo centerpiece) is unpolished.
- Letting the OpenAI client throw on rate limits with no retry — add a single retry with backoff, then fail friendly.
- Leaving `console.log` of message contents in production paths (privacy).
