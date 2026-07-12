---
name: testing-clarion
description: Test Clarion accessibility workflows end-to-end in a live Slack Developer sandbox (profiles, Make Accessible, acronyms, image descriptions, MCP).
---

# Testing Clarion in a live Slack sandbox

## Devin Secrets Needed
- `SLACK_BOT_TOKEN` (xoxb-), `SLACK_APP_TOKEN` (xapp-, Socket Mode) — from the Clarion app config in the sandbox
- `OPENAI_API_KEY` — an OpenAI-compatible key; OpenRouter works with `OPENAI_BASE_URL=https://openrouter.ai/api/v1` and `OPENAI_MODEL=openai/gpt-4o`
- Slack sandbox login (email + password) for browser UI testing

## Setup
1. `npm install --no-audit --no-fund`
2. Populate `.env` from `.env.example` (app fails closed without required vars).
3. Start: `set -a && source .env && set +a && nohup npm start > /tmp/clarion.log 2>&1 &`
   - Expect `⚡️ Clarion Bolt app is running in Socket Mode!` in the log.
4. Log into the sandbox in the browser (`clarion-hackathon.enterprise.slack.com`; email verification code may be required).

## Sandbox reference (Clarion Hackathon)
- Team `T0BHN1SGY6L`, app `A0BHN2LFDPA`, bot user `U0BHN2AMC9E`, #general `C0BGVK0G86M`
- Users: `U0BGXD7GJNQ` (sd0bgtlsgvga_user, the browser login), `U0BGME9FYRH` (sd0bgtlsgvga_demouser)

## Test flows
- **Profiles**: `/clarion profile` in any channel → modal → save → reopen to confirm persistence (SQLite `clarion.db`, `profiles` table).
- **Agent chat**: open Clarion from Agents & apps; ask a question; expect mrkdwn (not JSON) reply + thread title.
- **Make Accessible**: message action on a jargon message → ephemeral card + "Send to my DMs". Bot MUST be invited to the channel first (`/invite @Clarion`) or you get `not_in_channel`.
- **Image descriptions**: recipient must be opted in AND a channel member AND not the poster (poster is excluded). Since the browser user is the poster, opt in the other user (insert row in `profiles` with `describe_images=1`) and verify the DM via app logs / `conversations.history` on the bot's IM. Requires bot scopes `channels:read` + `groups:read` (else `conversations.members` → `missing_scope`); reinstall the app after scope changes.
- **MCP**: pipe JSON-RPC (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`) into `npx tsx src/mcp/server.ts`; expect 4 tools and `simplify_text` output with `tldr`/`plainVersion`.

## Known limitations
- RTS `assistant.search.context` returns `invalid_action_token` in this sandbox; app falls back to general knowledge. Don't treat this as a code bug.
- Image rate limiter is process-local (20/hr) and resets on restart.
- Diagnose issues via `/tmp/clarion.log` (Bolt debug logging includes full API payloads — never paste tokens from it).
