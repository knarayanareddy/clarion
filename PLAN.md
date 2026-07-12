# Clarion Build Plan (actual)

**Order (per spec/instructions):** F5 (skeleton) → F1 → F2 → F3 → F4 → MCP → (stretch only if time)

**Time budget (aggressive, ~8-10h target):**
- Setup + manifest + F5 skeleton: 1.5h
- F1 Profiles + SQLite + modal: 1.5h
- F2 Make Accessible shortcut + Block Kit + LLM simplify: 2h
- F3 RTS + action_token + acronyms + citations: 1.5h
- F4 Images + vision + rate guard: 1.5h
- MCP server + reuse core: 1h
- Docs, TESTING, commits, polish: 1h

**Checkpoints (must "verify" in code + mock before next):**
1. F5: Bolt app boots, agent_view, welcome + suggested prompts, DM replies with GPT.
2. F1: Profile modal, save/load, profile injected into LLM calls.
3. F2: Shortcut ack fast, thread fetch, LLM output, 4-section ephemeral card.
4. F3: RTS call path (with token plumbing), Terms with citations or fallback.
5. F4: file_share handler, download + vision, DMs to opted-in users.
6. MCP: separate entry, tools exposed, inspector works.

**What I can deliver here:**
- Full working TypeScript codebase matching exact layout.
- All features implemented (with real OpenAI calls if key provided).
- Local execution + unit/mock verification.
- All required handoff files.
- Commits simulating per-feature (local git).

**What I cannot do (real-world limits):**
- Live Slack sandbox interaction or verification (no Slack account/tokens/UI access).
- Create real Slack app or get tokens.
- Push to github.com/knarayanareddy/clarion (no credentials).
- Real end-to-end in Slack (you must do this in your sandbox + run the bot).
- Video, diagram image, Devpost submission, demo data seeding.

**Next steps for you after my build:**
- Join Slack Dev Program → create sandbox with AI Search.
- Create app "From manifest" using generated manifest.yaml.
- Add .env with real keys.
- `npm run dev` + `slack run` or direct.
- Manually test F5→F4 in Slack, update TESTING.md.
- Push the branch.

**Known limitations (to be documented):**
- No real Slack sandbox here → all "live" steps will be documented as "simulated + manual steps".
- RTS/action_token will be implemented but tested with mock first.
- MCP verified locally via inspector.
- Stretch features skipped (time).

