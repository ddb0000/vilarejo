# m0 · prototype loop tasks
## mark when done

1. [ ] Add pause/resume + single-step controls to the engine loop for debugging the 5 Hz cadence.
2. [x] Surface per-agent memory retrieval (top 3 RRI hits) inside the sidebar for quick inspection. (done 2025-11-15)
3. [ ] Serialize world + agent state to JSON so manual snapshots can be compared between ticks.
4. [ ] Expose a lightweight tuning panel to tweak need drift rates live.
5. [ ] Highlight target cells on the canvas when an agent selects a move action.
6. [ ] Emit structured events (action, needs delta, location) alongside the free-form log.
7. [ ] Add deterministic seed support so simulation start states can be exactly replayed.
8. [ ] Implement a chore/work timer that drains rest/hunger only while the agent stands on a field cell.
9. [x] Create a minimal inspector overlay that shows the planner RRI breakdown for the highlighted agent. (done 2025-11-15)
10. [ ] Wire a keyboard shortcut to cycle through agents and pin their stats in the sidebar.
11. [ ] Build a fake observation generator that injects scripted memories (e.g., "field fire drill") into the buffer.
12. [ ] Write a smoke-test script (node) that ensures engine.js loads without browser globals for CI sanity.
13. [ ] Add a DevTools console helper (`window.vilarejo`) that exposes agents/world for quick poking.
14. [ ] Track unmet needs over time and draw a small sparkline per agent.
15. [ ] Document the world layout + action mapping in README for fast onboarding.
