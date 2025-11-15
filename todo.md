# todo · vilarejo

## authoring tools
- [ ] world editor: click-to-tag tiles (home/field/cafe/etc), save to world.json, load at boot
- [ ] archetype editor: personality sliders, need decay multipliers, routine phases, import/export archetypes.json
- [ ] quest graph editor: visual nodes/edges, autosave, export quests.json

## simulation stability
- [ ] memory corpse collector: decay old entries, purge stale quest logs, retain story-relevant nodes
- [ ] world entropy control: periodic normalization, loop dampers, cascade stop rules
- [ ] stress tests: 50/200 agent runs, 20k ticks, JS heap snapshots, automated harness

## player thread
- [ ] player verbs: bless/curse agent, influence rumor, trigger weather, spawn observation, tag location
- [ ] diegetic storyboard: timeline scrubber, event filter, follow-camera, replay export
- [ ] story browser: story cards listing quests/moods/rumors, jump-to-tick highlight

## persistence contract
- [ ] snapshot load (hot swap), diff UI with controls, timeline bookmarks
- [ ] define snapshot format v1 + compatibility plan
- [ ] seed persistence (save/load seeds per run)

## map & biomes
- [ ] multi-cell biomes (forest, river, market) + affinity weights
- [ ] pathfinding weights + weather-biome interactions
- [ ] festival days / village-wide events

## LLM story mode v1
- [ ] archetype prompt templates + mood → prose mapping
- [ ] conversation pacing + multi-agent rules
- [ ] deterministic fallback when bridge disabled

## authoring docs
- [ ] architecture for authors guide
- [ ] tutorials: add agent / write quest / design biome
- [ ] LLM proxy safety + story debugging walkthrough

we’re basically at **endgame**.
from a systems-hacker POV the whole project is already *post-feature*.
the skeleton, flesh, and nerves are all in place.

what’s missing is not *features* — it’s **the three things every sim eventually needs to not rot**:

---

# 1) **authoring tools**

right now? villagers, quests, routines, runbooks… all hardcoded or JSON-handcrafted.

you need a *world authoring interface* so the sim can grow without editing code every time.

missing pieces:

### world editor

* click to mark tiles as home/field/cafe/market/etc
* save to `world.json`
* load at boot
* obvious cheat: a little sidebar grid editor + color chips

### archetype editor

* sliders: personality weights, need decay multipliers, routine phases
* export/import to `archetypes.json`

### quest graph editor (visual)

* nodes (quest steps)
* edges (conditions)
* autosave
* export to `quests.json`

this is the diff between a simulation and a **toy engine**.

---

# 2) **simulation stability & anti-entropy**

vilarejo is already complex. long runs (10k+ ticks) will expose drift.

missing pieces:

### memory corpse-collector

you already do compression, but you need:

* decay old memories beyond compression
* purge stale quest_step logs
* revive only story-relevant nodes
* long-run anti-noise decay

### world entropy control

weather+routines+rng can create loops or dead villages.
needs:

* periodic normalization (e.g., needs drift reset windows)
* emergent behavior dampers
* runaway-cascade stops (like “all villagers decide to stay at cafe forever”)

### stress tests

* 50 agents
* 200 agents (sprite mode off)
* 20k ticks
* mem profiler (js heap snapshots)

codex can run these manually but you need the **harness**.

---

# 3) **the “player thread”**

the slice is “playable”, yes — but no *player role* exists.

right now you observe, but cannot intervene **in a first-class way**.

missing pieces:

### player verbs

* bless agent (boost need or mood +1)
* curse agent (need penalty)
* influence rumor strength
* trigger weather
* spawn an observation
* tag a location with “festival”, “fire”, “market day”

### diegetic ui

like old sim games:

* timeline scrubber
* event filter
* “follow agent” camera lock
* replay export

### story browser

you already have events + auto-captures.
now build:

* left panel = story cards (quests, moods, rumors)
* click = zoom to tick + highlight agent

this is the **presentation layer**, and the only thing holding it back from “this is a full emergent-story sandbox”.

---

# 4) **save/load + persistence contract**

snapshot exists. regression exists.

but:

### missing

* **load snapshot** into running sim
* **snapshot diff** with playable controls
* **timeline bookmarks**
* **persistence format v1.0** (to freeze forever)

the moment you define the format as stable, you can build tooling around it.

right now it’s malleable.

---

# 5) **map expansion / biomes (optional but killer)**

current grid = tiny.

the world dies without *neighborhood identity*.

missing:

* multi-cell biomes (forest, river, market)
* pathfinding weighting
* agent “affinity” (farmer loves field, wanderer loves forest, etc.)
* weather affecting biomes (rain boosts field, lowers cafe turnout)
* festival days / village-wide events (fire night, harvest)

biomes turn your sim from “petri dish” to “place”.

---

# 6) **LLM story mode v1 (controlled)**

code is ready. bridge exists. feature flag exists.

what’s missing is the *design*:

### you need:

* prompt templates per archetype
* mood → prose mapping
* multi-agent conversation rules
* pacing regulator (so LLM doesn’t spam)
* deterministic fallback when LLM is disabled

codex can generate those templates automatically every time you run the proxy, but they need to be **persistent artifacts**.

---

# 7) **documentation for humans**

README is good, diagrams exist, but missing:

* “architecture for authors” guide
* “adding new agents” tutorial
* “writing a quest” short doc
* “designing a biome”
* “using the LLM proxy safely”
* “story debugging 101” (how to read event logs)

without these, nobody but you can extend vilarejo.

# TL;DR

vilarejo is **feature-complete**.
what’s left is **the meta-layer**:

### the toolchain

(world editor, quest editor, biome editor)

### the stability layer

(memory decay, drift control, stress tests)

### the player layer

(intervention verbs, replay tools, story browser)

### the persistence contract

(snapshot load, bookmarks, versioned world format)

### the authoring docs

(how to build new content without touching code)
