remember this: project = vilarejo, goal = smallville-like sim (agents + memory + simple world).
use the tools in ~/.codex/tools for memory ops. do not edit AGENTS.md directly. after key steps, run:
- tools --memory short --message "<one-liner>"

create a plan:
- milestones m0..m3
- deliverables per milestone
- risks + guardrails
- minimal tech: vanilla js. deploy: cloudflare pages + pages functions. free tier only. no kv/no d1. byok api keys. keep clientside. cheap/free.

then output todo.md with 10–15 atomic tasks for m0 (prototype loop).

scaffold repo at ~/code/vilarejo:
- /public/index.html (canvas + sidebar logs; inline tiny css ok; no separate css file)
- /public/scripts/{engine.js,world.js,agent.js,memory.js,ui.js,util.js}
- /functions/{healthcheck.js}
- package.json scripts: "dev": "wrangler pages dev public --ip=0.0.0.0 --port=8787", "build": "true"
- wrangler.toml minimal for pages + functions

minimal engine spec to implement in m0:
- tick loop @ 5hz
- world = grid; cells tagged {home, field, cafe}
- agent: {id, name, pos, needs:{social,hunger,rest}, memory:ring-buffer}
- planner: choose {move,talk,eat,rest,work} by score = relevance + recency + importance (rri)
- memory scoring: relevance (string match), recency (exp decay), importance (manual weight)
- agents have needs + wants; keep simple and deterministic

after plan + todo scaffolded, run:
tools --memory short --message "vilarejo: plan + todo + scaffold ready"
```

then drive it with these follow-ups (one at a time):

```
implement m0 step 1:
- memory.js: ring buffer api: add(observation, importance), retrieve(query, k=5), now(ts)=Date.now(), recency=exp(-Δt/τ) with τ ~ 5min, relevance=token overlap (very simple), score = α*relevance + β*recency + γ*importance (α=.4, β=.3, γ=.3). pure functions only.
- util.js: rng(seedless ok), clamp, lerp.
add tiny tests inside memory.js (self-invoked check) printing to console.
then: tools --activity "vilarejo: memory rri ready"
```

```
implement m0 step 2:
- world.js: grid {w,h}, tags per cell, helper: randomEmpty(), findNearby(pos, tag, radius).
- agent.js: update(dt): observe(world) -> decide(memory) -> act(world). keep actions tiny: move (random walk biased to goals), eat (at cafe), rest (at home), work (at field), talk (if agent nearby).
- engine.js: create world + seed 8 agents; 5hz loop; emit events to ui.js.
- ui.js: draw grid + dots; sidebar last 30 events; start/stop controls.
- index.html: wire scripts in correct order, onload boot.
then: tools --activity "vilarejo: loop + ui online"
```

```
smallville pass:
read the linked docs quickly; add routine fallback:
- each agent has daily template [wake, work, socialize, rest]; deviations when a retrieved memory score ≥ 0.8 or an observation tag is urgent.
implement in agent.js as ~80–100 loc max; add 2 canned memories to seed behavior.
then: tools --memory short --message "vilarejo: routine fallback added"
```

acceptance checks:

* ui opens with canvas + sidebar; 5hz ticks; agents move; needs bars change.
* when hunger spikes near cafe, agent chooses eat; when rest spikes near home, chooses rest.
* memory.retrieve() returns recent/important observations first; console shows a simple score breakdown.
* sidebar logs show decisions; at least one tools memory entry exists for plan/scaffold and one for routine.

when that passes:

```
run dev:
- start: npm run dev (wrangler pages dev public --ip=0.0.0.0 --port=8787)
- print the local url and confirm canvas animates
- final step: summarize in one line and run tools --memory short --message "<summary>"
```

keep us honest:

* always prefer small diffs
* after each “step done”, shell out the matching `tools` command
* no new deps; pure vanilla js only for m0

next slice after m0: tiny pages function `/note` stub (no db) that just 200s and prints; later we can wire zai/groq behind a feature flag.
