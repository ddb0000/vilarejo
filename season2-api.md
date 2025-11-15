# Season 2 API Surface

All APIs remain **experimental**; surface documented here for future integrations.

## Dev Flags
- `window.__DEV_OBS` — scripted observation injector (default `false`).
- `window.__LLM_INTENTIONS` — enables AI bridge fetches (default `false`).
- `window.__LLM_PROXY_URL` — BYOK HTTPS endpoint that forwards to Z.AI/Groq.
- `window.__SPRITES` — overlays ASCII sprites on the canvas/minimap.

## Bridge Payloads
```
POST { "task": "summarize", "prompt": "string", "provider": "groq|zai" }
POST { "task": "mood", "prompt": "string", "provider": "groq|zai" }
```
Gateway must respond `{ "result": "string" }` or `{ "summary": "..." }`.

## Quest Hooks
- Structured events emit `{ type: "quest", data: { questId, step } }`.
- Use `window.vilarejo.events` to stream for analytics; entries capped at 256.

## Shared Memory
- `summarizeMemories(agent, payload)` returns string summary for rumor sharing.
- `generateMood(agent)` returns one-word mood for agent cards.

## CLI Reference
- `npm run generate-seed` — random hex seed.
- `npm run list-snapshots`, `npm run diff-snapshots -- a b` — snapshot utilities.
- `npm run regression` — deterministic replay harness.
