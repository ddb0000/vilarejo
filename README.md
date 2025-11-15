# VILAREJO
Smallville-inspired sandbox where a handful of deterministic villagers walk a 4×4 grid, maintain RRI-scored memories, and follow routine fallbacks unless observations nudge them off script.

![prototype screenshot placeholder](public/screenshot.png)

## World Layout
| y\x | 0   | 1     | 2     | 3    |
| --- | --- | ----- | ----- | ---- |
| 0   | home| field | field | cafe |
| 1   | home| field | field | cafe |
| 2   | field| field| field| cafe |
| 3   | home| field | field | cafe |

- Each cell exposes a `tag` so actions can query “closest cafe/home/field”.
- Agents move in Manhattan steps; the canvas renders their positions plus a glowing outline + tether for any active target cell.

## Agent Loop
### Needs & Actions
- Needs drift every tick (`hunger`, `rest`, `social`). Eat/rest replenish big chunks so those actions rarely fire back-to-back.
- Planner scores the five actions (`move`, `talk`, `eat`, `rest`, `work`) via the **RRI** formula: `score = 0.4*relevance + 0.3*recency + 0.3*importance`, where relevance is token-overlap vs the query, recency is `exp(-Δt/300000)`, and importance is a manual weight.
- Each decision logs a structured `decide` event plus a friendly string in the sidebar log; `move` events highlight the destination cell.

### Routine fallback
- Every agent cycles `wake → work → socialize → rest` with timers (`20s / 120s / 60s / 120s`).
- Routine picks targets (home, field, cafe) and adds a bias (+0.1) to whichever planner action matches the current phase.
- Deviations override routine when (a) an urgent need fires (hungry at cafe, tired at home, lonely with neighbor) or (b) the top memory score ≥ 0.8 (habit text suggests eat/work/rest/talk).

### Memory stream & Injector
- Memories live in a 32-slot ring buffer per agent. `window.__DEV_OBS = true` toggles a scripted injector that drops “field fire drill” memories into random agents near a field (~15 s cadence, ≤1/min/agent) and emits `inject` events.

## Controls & Debug
- **Pause/Step** buttons freeze the 5 Hz loop or advance exactly one frame; keyboard mirrors this: `space` toggles, `.` single-steps, `j/k` cycle the pinned agent card.
- **Seed** input + `rngSeed` guarantee identical first 200 ticks for equal seeds; snapshots (`Snapshot` button or `window.vilarejo.snapshot()`) dump `{ time, world, agents[] }` JSON so you can diff or reload a state manually.
- **Events** panel streams the last 20 structured events (`need`, `decide`, `act`, `move`, `inject`).
- **DevTools handle**: `window.vilarejo` exposes `{ engine, world, agents, events, snapshot }` for quick poking.

## Dev Scripts
| Command        | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| `npm run dev`  | Wrangler Pages dev server on `http://localhost:8787` with hotloop. |
| `npm run smoke`| Node harness that shims the DOM, runs 10 ticks, asserts decisions. |

## Acceptance Quickies (m0)
- Pause freezes tick; Step advances one frame.  
- Two runs with the same seed produce identical first 200 ticks.  
- Snapshot JSON, when re-applied manually, reproduces positions/needs closely.  
- Event bus always includes `decide`/`act` payloads; target highlight animates toward the chosen cell.  
- Keyboard shortcuts: `space`, `.`, `j`, `k` behave as documented.  
- Injector occasionally flips behavior via a high-score “field fire drill” memory.  
- `npm run smoke` exits 0.

## Milestones
See [milestones.md](milestones.md) for the current roadmap (m0 shipped, m1 “Village Behaviors” next).
