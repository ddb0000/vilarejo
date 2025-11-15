# todo · vilarejo

## m0 · prototype loop (done-core, cleanup left)

- [x] snapshot: world+agents -> json export (done 2025-11-15)
- [x] live tuning panel (need drift sliders) (done 2025-11-15)
- [x] structured events bus (action/needs/location) (done 2025-11-15)
- [x] chore/work timer (drain only on field) (done 2025-11-15)
- [x] devtools handle: window.vilarejo = {engine,world,agents,events} (done 2025-11-15)
- [x] unmet-needs sparkline per agent (done 2025-11-15)
- [x] readme: world layout + action map doc (done 2025-11-15)

## m1 · village behaviors

### archetypes
- [x] define archetypes: worker, farmer, wanderer, vendor (done 2025-11-15)
- [x] per-archetype routine templates (morning/lunch/evening) (done 2025-11-15)
- [x] archetype personality weights (importance multipliers) (done 2025-11-15)
- [x] chore chains: multi-step routines (e.g., worker → field → cafe → home) (done 2025-11-15)

### scheduler
- [x] global day scheduler: time-of-day ticks (done 2025-11-15)
- [x] routine override windows (e.g., lunch hour) (done 2025-11-15)
- [x] deterministic reseed at dawn for replay fidelity (done 2025-11-15)

### observations
- [x] market chatter injector (low-frequency) (done 2025-11-15)
- [x] weather tick (sun/cloud/rain flag) (done 2025-11-15)
- [x] “rumor” observation tags linked to places (done 2025-11-15)
- [x] configurable runbooks: scripted mini-beats (done 2025-11-15)

### ai bridge stub
- [x] add fetch gateway to z.ai/groq (byok, no secrets client-side) (done 2025-11-15)
- [x] feature-flag: llm-intentions off-by-default (done 2025-11-15)
- [x] bridge api: summarize 3–6 memories into 1 compressed memory (done 2025-11-15)
- [x] bridge api: generate 1-sentence “mood” for agent card (done 2025-11-15)

## m2 · narrative arcs

### quest chains
- [x] define quest graph format (json). (done 2025-11-15)
- [x] quest triggers from observations or needs thresholds. (done 2025-11-15)
- [x] quest progress memory entries (compressed). (done 2025-11-15)
- [x] quest resolution events → structured event bus. (done 2025-11-15)

### shared memory prompts
- [x] agent→agent rumor sharing (low bandwidth). (done 2025-11-15)
- [x] compress shared memories via ai-bridge. (done 2025-11-15)
- [x] add “importance inflation” for socially-shared memories. (done 2025-11-15)

### story tools
- [x] screenshot/gif auto-capture every N ticks. (done 2025-11-15)
- [x] cli: generate-seed, list-snapshots, diff-snapshots. (done 2025-11-15)
- [x] regression harness: replay seed, assert deterministic events. (done 2025-11-15)

## m3 · playable slice

### ui polish
- [x] onboarding overlay: brief controls + pinned walkthrough. (done 2025-11-15)
- [x] agent cards: mood line, sparkline, routine phase badge. (done 2025-11-15)
- [x] mini-map tile layer (optional). (done 2025-11-15)
- [x] inspector: story mode toggle. (done 2025-11-15)

### chat-driven inspector (optional)
- [x] chat panel for editing prompts (developer-only). (done 2025-11-15)
- [x] introspect agent: dump memories, last 20 events. (done 2025-11-15)
- [x] inject observation via chat command. (done 2025-11-15)

## long-tail polish

- [x] performance pass (agent count scaling). (done 2025-11-15)
- [x] memory buffer eviction policies (smart compression). (done 2025-11-15)
- [x] spatial indexing for neighbor queries. (done 2025-11-15)
- [x] sprite layer (optional ascii or low-res glyphs). (done 2025-11-15)
- [x] full readme rewrite with diagrams (ascii). (done 2025-11-15)
- [x] “season 2” api surface doc. (done 2025-11-15)

## deploy (later)

### hosting
- [ ] cloudflare pages deploy (free tier)
- [ ] pages functions: llm proxy (byok env)
- [ ] demo seed: static, replayable
- [ ] public toggle: safe mode on
