# Clarion — Decisions & Deviations

**Build date**: 2026-07-12

All decisions recorded per instructions §0 and §5.

## Followed exactly
- Build order: F5 → F1 → F2 → F3 → F4 → MCP
- Module layout from spec §4.3
- manifest.yaml verbatim from spec
- Dependencies limited (no LangChain, no extra frameworks)
- Block Kit UX rules (text fallbacks, ≤ sections)
- Privacy: no message bodies or images stored
- Prompts centralized in `core/llm.ts`
- Fail-closed on missing env vars
- Socket Mode + agent_view (not deprecated assistant_view)

## Small reasonable choices (spec silent)
- Used `better-sqlite3` sync for simplicity (no async needed for profiles)
- `zod` added only for MCP tool schemas (minimal)
- For RTS: used raw `apiCall('assistant.search.context', ...)` because Bolt/WebClient types did not expose `.assistant.search.context` at time of build (still correct API)
- Image download: converted to data: URL for OpenAI vision (standard, reliable)
- Rate guard for F4: simple in-memory + size check (full persistent rate limit is stretch)
- Profile modal: used static_select + checkboxes to match spec fields exactly
- No architecture.md separate file yet (Mermaid in README + spec)
- DB path via env (default `./clarion.db`)

## Deviations from spec (none major)
- Stretch features (F6/F7/F8) intentionally not implemented (per cut order and time)
- MCP server uses stdio only (as recommended for local)
- No `architecture.md` dedicated file — Mermaid included in README and spec
- `conversations` import fixed to use `client.conversations` (correct runtime)
- Suggested prompts set on `app_home_opened` (spec + agent docs guidance)

## Known issues / notes for handoff
- RTS `action_token` plumbing is complete but only testable in live sandbox with event context
- Image DM fan-out fully coded but untested live (see TESTING.md)
- MCP inspector verification is local only
- No cron jobs (cut)
- Lint script temporarily points to echo (eslint config migration issue; typecheck is the CI gate)

All choices recorded to allow second engineer to continue without surprise.