import { createDefaultWorld } from "./world.js";
import { Agent } from "./agent.js";
import { createMemory, add as addMemoryEntry } from "./memory.js";
import { UI } from "./ui.js";

const TICK_MS = 200; // 5Hz

const canvas = document.getElementById("world-canvas");
const logEl = document.getElementById("log");
const agentListEl = document.getElementById("agents");
const inspectorEl = document.getElementById("inspector");

const ui = new UI({ canvas, logEl, agentListEl, inspectorEl });
const world = createDefaultWorld();

function buildRoutineMemory() {
  let memory = createMemory(32);
  const now = Date.now();
  memory = addMemoryEntry(memory, "habit: morning coffee at cafe", 0.6, now - 3600000);
  memory = addMemoryEntry(memory, "habit: field work after wake", 0.7, now - 7200000);
  return memory;
}

const agents = [
  new Agent({ id: "ana", name: "Ana", role: "grower", start: { x: 0, y: 0 }, memory: buildRoutineMemory() }),
  new Agent({ id: "bruno", name: "Bruno", role: "baker", start: { x: 3, y: 2 }, memory: buildRoutineMemory() })
];

let ticking = false;

function log(message) {
  ui.appendLog(message);
}

function tick() {
  const now = Date.now();
  agents.forEach((agent) => {
    const result = agent.tick({ world, agents, now });
    if (result.logMessage) {
      log(`${agent.name} ${result.logMessage}`);
    }
  });
  ui.render(world, agents);
  ui.updateAgentList(agents);
}

function start() {
  if (ticking) return;
  ticking = true;
  tick();
  setInterval(tick, TICK_MS);
}

start();
