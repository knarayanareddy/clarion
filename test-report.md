# Clarion — Live Slack Sandbox Test Report (2026-07-12)

Environment: Clarion Hackathon sandbox (team `T0BHN1SGY6L`), app `A0BHN2LFDPA` running locally via Socket Mode (`npm start`), LLM = OpenRouter `openai/gpt-4o`. Test plan: `test-plan.md`.

## Summary

| # | Test | Result |
|---|---|---|
| T1 | Profile onboarding & persistence | ✅ PASS |
| T2 | Agent chat loop | ✅ PASS (after PR #3 fix) |
| T3 | Make Accessible shortcut + Send to my DMs | ✅ PASS (after inviting bot to #general) |
| T4 | Acronym expansion | ✅ PASS — general-knowledge fallback only; RTS grounding UNVERIFIED |
| T5 | Private image descriptions | ✅ PASS (after scope fix + reinstall) |
| T6 | MCP server (stdio) | ✅ PASS |

All six tests pass. One capability remains unverified: workspace-grounded RTS citations (T4/T3), because `assistant.search.context` returned `invalid_action_token` in this sandbox; the app gracefully falls back to general knowledge as designed.

---

## T1 — Profile onboarding (`/clarion profile`) — PASS

Modal opened with reading-preference select, acronym / image-description / nudge checkboxes, and digest select. Set "Bullet summaries" + acronyms on + image descriptions on, saved, reopened — values persisted.

![Profile modal](/home/ubuntu/screenshots/ss_589f45ce.png)
![Persisted values on reopen](/home/ubuntu/screenshots/ss_4fd25ae8.png)

## T2 — Agent chat loop — PASS

Clarion agent panel showed welcome + suggested prompts. "What can you do for me?" produced a grounded, formatted (non-JSON) reply and a thread title. Initial run returned raw JSON — fixed in PR #3 (removed global JSON-only system instruction) and retested.

![Agent reply after fix](/home/ubuntu/screenshots/ss_654d91ac.png)

## T3 — Make Accessible shortcut — PASS

On a jargon-heavy message, the "Make Accessible" message shortcut produced an ephemeral card ("only you can see this") with TL;DR, plain-language rewrite, action items, terms, and a permalink to the original. "Send to my DMs" delivered the same card to the Clarion DM. First attempt failed with `not_in_channel` — resolved by inviting @Clarion to #general (expected Slack behavior, no code change).

![Ephemeral accessible card (Actions/Terms sections, Send to my DMs, "only you can see this")](/home/ubuntu/screenshots/ss_60b81461.png)
![Card delivered to DM](/home/ubuntu/screenshots/ss_ee267969.png)

## T4 — Acronym expansion — PASS (fallback path)

Posted "Reminder: NRR = Net Revenue Retention, our north-star metric", then asked the agent "What does NRR mean here?". The agent returned a correct definition. However, RTS (`assistant.search.context`) returned `invalid_action_token`, so the answer came from the general-knowledge fallback, not a workspace citation. **Workspace-grounded RTS citations remain unverified in this sandbox.**

![NRR answer in agent thread](/home/ubuntu/screenshots/ss_1bd6ccf4.png)

## T5 — Private image descriptions — PASS (after fix)

First attempt failed: `conversations.members` returned `missing_scope` (needs `channels:read`/`groups:read`), so no DM was sent. Fix: added the two scopes to `manifest.yaml` and the app config, reinstalled the app (verified via API that `conversations.members` now succeeds), opted in a second user, and re-uploaded the test PNG.

Result: the opted-in user received a private DM with alt text + detailed description quoting the actual visible content — "Q3 REVENUE DASHBOARD", "Total Revenue: $42M" (image says $4.2M; minor OCR miss of the decimal), "NRR 118%", "Churn: 2.3%" — with poster attribution and permalink. No description was posted publicly in the channel (verified via channel history: only the uploader's messages).

![Test image uploaded to #general](/home/ubuntu/screenshots/ss_816b4f31.png)

DM payload evidence (app log, trimmed):

```
"text":"Image description: **Alt text:** A Q3 revenue dashboard with financial metrics."
"**Detailed description:** ... \"Q3 REVENUE DASHBOARD\" in blue. \"Total Revenue: $42M\" in black.
 \"NRR 118%\" in green. \"Churn: 2.3%\" in red."
→ chat.postMessage ok:true, channel D0BGQG7F753 (DM with opted-in user)
```

Cosmetic issue noted: duplicated "Alt text:" prefix and raw `**bold**` markdown in the DM.

## T6 — MCP server — PASS

Over stdio against `npm run mcp`:
- `tools/list` → `['simplify_text', 'describe_image', 'expand_acronym', 'accessibility_lint']`
- `tools/call simplify_text` → valid JSON containing `tldr` and `plainVersion` (plus `actions`, `jargon`).

```json
{
  "tldr": "The team needs to complete a data process today to meet a quarterly goal.",
  "plainVersion": "According to the request for comments, the Net Revenue Retention churn group needs the data process completed before the end of the day...",
  "actions": ["Complete the data process for the NRR churn cohort.", "Ensure completion before the end of the day."],
  "jargon": ["RFC", "NRR", "ETL", "EOD", "Q3", "OKR"]
}
```

---

## Fixes made during testing
1. PR #3 (merged): agent replies rendered raw JSON → removed global JSON-only prompt; enabled Messages tab.
2. Scope fix (branch `devin/1783887181-image-scopes`): added `channels:read` + `groups:read` to `manifest.yaml`; reinstalled app.

## Outstanding / known limitations
- RTS `assistant.search.context` → `invalid_action_token` in this sandbox; workspace-grounded citations unverified. App falls back gracefully.
- Image DM formatting cosmetics (duplicate "Alt text:", `**` markdown).
- Image rate limiter is process-local and not persisted.
