import { createDefaultWorld } from "./world.js";
import { Agent } from "./agent.js";
import { createMemory } from "./memory.js";
import { UI } from "./ui.js";

const TICK_MS = 200; // 5Hz

const canvas = document.getElementById("world-canvas");
const logEl = document.getElementById("log");
const agentListEl = document.getElementById("agents");

const ui = new UI({ canvas, logEl, agentListEl });
const world = createDefaultWorld();

const agents = [
  new Agent({ id: "ana", name: "Ana", role: "grower", start: { x: 0, y: 0 }, memory: createMemory(32) }),
  new Agent({ id: "bruno", name: "Bruno", role: "baker", start: { x: 3, y: 2 }, memory: createMemory(32) })
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
