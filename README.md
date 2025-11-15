# VILAREJO · Agents With Routines, Quests, And Story Tools

```
┌──────── WORLD GRID (4×4) ────────┐
│ home | field | field | cafe      │
│ home | field | field | cafe      │
│ field| field | field | cafe      │
│ home | field | field | cafe      │
└──────────────────────────────────┘
```

Each villager is an archetype (worker / farmer / wanderer / vendor) with a daily template (`dawn → morning → lunch → evening → night`), chore chains (e.g., worker: `field → cafe → home`), and personality weights that bias the RRI planner:

```
score = (0.4*relevance + 0.3*recency + 0.3*importance) * personality[action]
relevance   → token overlap vs. query
recency     → exp(-Δt / 300000)
importance  → manual weight (urgency, quest step, rumor share)
```

## How To Drive
- **Global Controls**: `space` pause/resume · `.` single-step · `j/k` cycle pinned agent. Pause panel mirrors the buttons above the canvas.
- **Need Drift Panel**: drag hunger/rest/social sliders to retune the loop live (applies to every agent).
- **Snapshots**: `Snapshot` button or `window.vilarejo.snapshot()` saves `{ time, world, agents[] }` JSON; stash them under `./snapshots` for `npm run diff-snapshots`.
- **Minimap + Sprites**: lower canvas renders a miniature grid. Set `window.__SPRITES = true` for ASCII glyphs over the main board.
- **Inspector**: default shows planner RRI breakdown; click **Story Mode** to switch to quest/rumor view.
- **Dev Chat**: use `/agent Ana`, `/inject Bruno lunchtime stew`, or plain text to annotate the pinned villager. Commands bubble through the structured event bus.
- **Auto Capture**: every ~50 ticks the canvas is pushed to `window.__CAPTURES[]` and logged as a `capture` event for future GIF stitching.
- **Onboarding Overlay**: lists the quick controls; dismiss via the button or `window.__OVERLAY=false`.

## Routine + Quest Layer
- Routine fallback still cycles wake/work/socialize/rest but now respects day slots from the scheduler. Chore queues trigger multi-step moves unless urgent needs or high-scoring memories override.
- Quest graphs live in `public/scripts/quests.js`. Triggers fire on needs, location, or observation keywords. Each step logs a compressed memory and emits `quest` events; completion clears the agent’s queue.
- Shared-memory prompts kick off every ~80s: a source agent summarizes recent history (LLM bridge when enabled) and hands a high-importance rumor to a neighbor.
- Injectors run in the background: market chatter, weather ticks (`sunny/cloudy/rainy`), rumor beats, and the classic `window.__DEV_OBS` fire drill.

## AI Bridge (Feature-Flagged)
- Set `window.__LLM_INTENTIONS = true` and `window.__LLM_PROXY_URL = "https://your-gateway"` to forward summarization/mood requests to your BYOK proxy (Z.AI / Groq supported). Default is **off**.
- `summarizeMemories(agent, payload)` compresses quest progress, rumor shares, and dawn reflections; `generateMood(agent)` feeds the agent cards.

## Tooling & Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Wrangler Pages dev server (`http://localhost:8787`). |
| `npm run smoke [--ticks=20]` | DOM-shimmed sanity test (default 10 ticks). |
| `npm run regression` | Deterministic replay harness (200 ticks). |
| `npm run generate-seed` | Emits a random hex seed. |
| `npm run list-snapshots` | Lists JSON exports under `./snapshots`. |
| `npm run diff-snapshots -- a.json b.json` | Highlights position/needs drift between two states. |

## Acceptance Quickies
- Pause freezes tick; Step advances one frame; keyboard mirrors buttons.
- Equal seeds → identical first 200 ticks (verified via regression harness).
- Snapshot JSON, when reloaded manually, reproduces grid positions and needs within tolerance.
- Event bus logs `need`, `decide`, `act`, `move`, `inject`, `quest`, `weather`, and `capture` events; target highlight animates toward the chosen cell.
- Shared-memory prompts inflate importance and propagate across villagers.
- Auto-capture populates `window.__CAPTURES` for later GIF stitching.
- `npm run smoke` exits 0.
- Quest/story inspector surfaces the current arc; chat `/inject` shows up in the log.

## Season 2 API Surface
See `season2-api.md` for proxy expectations, dev flags, and structural guarantees.

## Milestones
- m0 Prototype Loop ✓
- m1 Village Behaviors ✓
- m2 Narrative Arcs ✓ (ongoing quest authoring)
- m3 Playable Slice (current) — onboarding overlay, dev chat, minimap, performance & docs polish.
