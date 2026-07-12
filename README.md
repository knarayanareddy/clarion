# Clarion

**Clarion** is a Slack-native accessibility agent that makes fast, jargon-heavy workspaces usable for deaf/HoH, low-vision, dyslexic, ESL, and neurodivergent workers — plain-language rewrites, image descriptions, workspace-aware acronym expansion, and cognitive-load-tuned digests.

Built for the **Slack Agent Builder Challenge** (Slack Agent for Good track).

## Features (MVP — F5 → F1 → F2 → F3 → F4)

- **F5: Agent chat loop** (first): Agent panel, welcome + suggested prompts, DM responses with thinking status + titles, context-aware via `app_context_changed`.
- **F1: Profiles**: Opt-in profile modal (reading style, acronyms, images, digest, nudges). Stored in SQLite. `/clarion profile`. Profile tunes all LLM output.
- **F2: Make Accessible** (demo centerpiece): Message shortcut on any thread. Fetches full thread (incl. deep replies), LLM simplify + Block Kit card with TL;DR / Plain / Actions / Terms. "Send to my DMs".
- **F3: Workspace RTS acronym expansion**: Terms in F2 + standalone DMs use `assistant.search.context` (with proper `action_token` plumbing) for workspace-specific definitions + permalinks. Graceful general fallback.
- **F4: Image descriptions**: On file_share in channels where agent invited + users have "describe images: on", DMs alt-text + detailed vision description (GPT-4o) within ~30s. Rate-limited + size guard.
- **MCP server**: Standalone `npm run mcp` exposing 4 tools (`simplify_text`, `describe_image`, `expand_acronym`, `accessibility_lint`) reusing core logic.

**Stretch** (not yet built in this MVP): Daily digests (F6), nudges (F7), `/clarion check` lint (F8).

## Tech

- **Bolt for JavaScript v4** + **Socket Mode** (no public URL)
- **OpenAI GPT-4o** (text + vision)
- **SQLite** (better-sqlite3) — only profiles + minimal cache
- **TypeScript** (strict)
- **MCP** via `@modelcontextprotocol/sdk`

No message bodies or images stored (privacy).

## Quick Start (for handoff engineer)

1. Join [Slack Developer Program](https://api.slack.com/developer-program) and provision a sandbox (request **Slack AI Search** enabled).
2. Create app **from manifest**:
   - Go to https://api.slack.com/apps → Create New App → From an app manifest
   - Paste contents of `manifest.yaml`
3. Install to your sandbox workspace.
4. Copy tokens:
   - Bot User OAuth Token → `SLACK_BOT_TOKEN`
   - App-Level Token (connections:write) → `SLACK_APP_TOKEN`
   - (Optional) User token for RTS/digests → `SLACK_USER_TOKEN`
5. Get OpenAI key → `OPENAI_API_KEY`
6. Copy `.env.example` → `.env` and fill.
7. `npm install`
8. `npm run dev` (or `npm start` after build)
9. In Slack: Open agent from top bar or DM the bot.

**Manual verification steps** are in `TESTING.md`.

## Scripts

- `npm run dev` — watch mode (tsx)
- `npm run build`
- `npm start`
- `npm run typecheck`
- `npm run mcp` — start MCP server (for inspector or clients)

## Deliverables

See `TESTING.md`, `DECISIONS.md`, `PLAN.md`.

## Known Limitations (honest)

- Requires a Slack sandbox with AI Search for best RTS results (falls back to keyword/general).
- Image descriptions require bot invited to channel.
- `action_token` plumbing is complex — tested in code paths.
- No live cron digests/nudges in this build (stretch cut).
- No real-time rate limiting DB for images (in-memory stub).
- MCP verified via inspector (not yet connected to Slackbot MCP Client).
- **All verification in this repo was local + simulated.** Live Slack sandbox verification must be performed by the next engineer.

## Architecture

See `architecture.md` (Mermaid) + diagram to be rendered.

## Privacy & Compliance

- Opt-in only
- Dignity by default (ephemeral + DM only)
- No persistent storage of message content or images
- OpenAI calls: no training

---

Handoff from agent build: full MVP code + per-feature commits + docs ready for sandbox integration + video.