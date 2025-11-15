import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const ticksArg = args.find((arg) => arg.startsWith("--ticks="));
const tickCount = ticksArg ? Number(ticksArg.split("=")[1]) : 10;

const noop = () => {};
const canvasStub = () => ({
  getContext: () => ({
    fillRect: noop,
    strokeRect: noop,
    fillText: noop,
    clearRect: noop,
    beginPath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    moveTo: noop,
    lineTo: noop,
    save: noop,
    restore: noop,
    font: "12px"
  }),
  addEventListener: noop,
  toDataURL: () => "",
  width: 0,
  height: 0
});

const elementStub = () => ({
  innerHTML: "",
  appendChild: noop,
  removeChild: noop,
  prepend: noop,
  addEventListener: noop,
  setAttribute: noop,
  getContext: () => ({ fillRect: noop, clearRect: noop }),
  classList: { add: noop, remove: noop, toggle: noop },
  style: {}
});

global.window = global.window || { __DEV_OBS: false };
window.addEventListener = noop;
window.removeEventListener = noop;

global.document = {
  getElementById: (id) => (id === "world-canvas" ? canvasStub() : elementStub()),
  createElement: () => elementStub(),
  body: { appendChild: noop, removeChild: noop }
};

global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "scripts");

const worldModule = await import(path.join(root, "world.js"));
const agentModule = await import(path.join(root, "agent.js"));
const memoryModule = await import(path.join(root, "memory.js"));
await import(path.join(root, "engine.js"));

const { createDefaultWorld } = worldModule;
const { Agent } = agentModule;
const { createMemory } = memoryModule;

const world = createDefaultWorld();
const memory = createMemory(16);
const agent = new Agent({ id: "test", name: "Test", role: "tester", start: { x: 0, y: 0 }, memory, archetype: "worker" });
const agents = [agent];

for (let i = 0; i < tickCount; i += 1) {
  agent.tick({ world, agents, now: Date.now(), emitEvent: noop });
}

assert.ok(agent.decisionLog.length >= 1, "agent should have at least one decision recorded");
console.log(`smoke test passed: agent decisions ${agent.decisionLog.length}`);
process.exit(0);
