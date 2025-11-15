import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "scripts");

const { Agent } = await import(path.join(root, "agent.js"));
const { createDefaultWorld } = await import(path.join(root, "world.js"));
const { createMemory } = await import(path.join(root, "memory.js"));

const ticks = Number(process.argv[2] || 200);

function runSim() {
  const world = createDefaultWorld();
  const memory = createMemory(16);
  const agent = new Agent({ id: "reg", name: "Reg", start: { x: 0, y: 0 }, memory, archetype: "worker" });
  const agents = [agent];
  const actions = [];
  for (let i = 0; i < ticks; i += 1) {
    const result = agent.tick({ world, agents, now: Date.now(), emitEvent: () => {} });
    actions.push(result.action);
  }
  return actions.join(",");
}

const first = runSim();
const second = runSim();
assert.equal(first, second, "deterministic run mismatch");
console.log(`regression ok: ${ticks} ticks deterministic`);
