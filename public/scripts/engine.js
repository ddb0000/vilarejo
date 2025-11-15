import { createDefaultWorld } from "./world.js";
import { Agent } from "./agent.js";
import { createMemory, add as addMemoryEntry } from "./memory.js";
import { UI } from "./ui.js";
import { rngSeed } from "./util.js";

const TICK_MS = 200; // 5Hz
const DEFAULT_SEED = "seed-default";
const ROUTINE_MEMORY_BASE_TS = 1731300000000;

const canvas = document.getElementById("world-canvas");
const logEl = document.getElementById("log");
const agentListEl = document.getElementById("agents");
const inspectorEl = document.getElementById("inspector");
const eventsEl = document.getElementById("events");
const pauseBtn = document.getElementById("pause-btn");
const stepBtn = document.getElementById("step-btn");
const seedInput = document.getElementById("seed-input");
const snapshotBtn = document.getElementById("snapshot-btn");

const ui = new UI({ canvas, logEl, agentListEl, inspectorEl, eventsEl });
ui.bindAgentSelect((index) => {
  selectedAgentIndex = index;
  refreshSelectedAgent();
});

let world;
let agents;
let selectedAgentIndex = 0;
const EVENT_LIMIT = 256;
const events = [];
const DEV_OBS_INTERVAL = 15000;
const DEV_OBS_COOLDOWN = 60000;
const devObsLastInject = new Map();

const engine = (() => {
  let running = false;
  let intervalId = null;
  let seed = DEFAULT_SEED;

  function resume() {
    if (running) return;
    running = true;
    tick();
    intervalId = setInterval(tick, TICK_MS);
  }

  function pause() {
    if (!running) return;
    running = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function stepOneTick() {
    if (running) return;
    tick();
  }

  function setSeed(nextSeed) {
    const previous = running;
    pause();
    seed = sanitizeSeed(nextSeed);
    initSimulation(seed);
    if (previous) resume();
  }

  function sanitizeSeed(value) {
    const trimmed = (value || "").toString().trim();
    return trimmed.length ? trimmed : DEFAULT_SEED;
  }

  function getSeed() {
    return seed;
  }

  function isRunning() {
    return running;
  }

  function serializeState() {
    const now = Date.now();
    return {
      time: now,
      world: serializeWorld(world),
      agents: (agents || []).map((agent) => ({
        id: agent.id,
        name: agent.name,
        pos: { ...agent.pos },
        needs: { ...agent.needs },
        lastAction: agent.lastAction,
        routinePhase: agent.routinePhase
      }))
    };
  }

  return { resume, pause, stepOneTick, setSeed, isRunning, getSeed, serializeState };
})();

function initSimulation(seedValue = DEFAULT_SEED) {
  const nextSeed = seedValue || DEFAULT_SEED;
  rngSeed(nextSeed);
  world = createDefaultWorld();
  agents = createAgents();
  selectedAgentIndex = 0;
  if (seedInput) seedInput.value = nextSeed;
  clearEvents();
  resetLogs();
  ui.render(world, agents);
  refreshSelectedAgent();
  ui.updateEvents([]);
  log(`seed → ${nextSeed}`);
  exposeDevtools();
}

function createAgents() {
  return [
    new Agent({ id: "ana", name: "Ana", role: "grower", start: { x: 0, y: 0 }, memory: buildRoutineMemory() }),
    new Agent({ id: "bruno", name: "Bruno", role: "baker", start: { x: 3, y: 2 }, memory: buildRoutineMemory() })
  ];
}

function buildRoutineMemory() {
  let memory = createMemory(32);
  memory = addMemoryEntry(memory, "habit: morning coffee at cafe", 0.6, ROUTINE_MEMORY_BASE_TS - 3600000);
  memory = addMemoryEntry(memory, "habit: field work after wake", 0.7, ROUTINE_MEMORY_BASE_TS - 7200000);
  return memory;
}

function serializeWorld(currentWorld) {
  if (!currentWorld) return null;
  return {
    width: currentWorld.width,
    height: currentWorld.height,
    grid: currentWorld.grid
  };
}

function log(message) {
  if (!ui || !message) return;
  ui.appendLog(message);
}

function resetLogs() {
  if (logEl) logEl.innerHTML = "";
  if (ui) ui.logs = [];
}

function pushEvent(event) {
  if (!event) return;
  events.unshift(event);
  if (events.length > EVENT_LIMIT) events.pop();
}

function getRecentEvents(limit = 20) {
  return events.slice(0, limit);
}

function clearEvents() {
  events.length = 0;
}

function refreshSelectedAgent() {
  if (!ui) return;
  if (!agents || agents.length === 0) {
    selectedAgentIndex = 0;
    ui.updateAgentList([], 0);
    ui.clearInspector();
    return;
  }
  selectedAgentIndex = Math.min(Math.max(selectedAgentIndex, 0), agents.length - 1);
  ui.updateAgentList(agents, selectedAgentIndex);
  ui.showInspector(agents[selectedAgentIndex]);
}

function tick() {
  if (!world || !agents) return;
  const now = Date.now();
  agents.forEach((agent) => {
    const result = agent.tick({ world, agents, now, emitEvent: emitEventFactory(now) });
    if (result.logMessage) {
      log(`${agent.name} ${result.logMessage}`);
    }
  });
  ui.render(world, agents);
  refreshSelectedAgent();
  ui.updateEvents(getRecentEvents());
}

function emitEventFactory(timestamp) {
  return (partial) => {
    if (!partial) return;
    pushEvent({ ts: partial.ts ?? timestamp, ...partial });
  };
}

function updatePauseLabel() {
  if (!pauseBtn) return;
  pauseBtn.textContent = engine.isRunning() ? "Pause" : "Resume";
}

function attachControls() {
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (engine.isRunning()) {
        engine.pause();
      } else {
        engine.resume();
      }
      updatePauseLabel();
    });
  }
  if (stepBtn) {
    stepBtn.addEventListener("click", () => {
      engine.stepOneTick();
      updatePauseLabel();
    });
  }
  if (seedInput) {
    const applySeed = () => {
      engine.setSeed(seedInput.value);
      updatePauseLabel();
    };
    seedInput.addEventListener("change", applySeed);
    seedInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applySeed();
      }
    });
  }
  if (snapshotBtn) {
    snapshotBtn.addEventListener("click", () => {
      const data = engine.serializeState();
      if (!data) return;
      console.log("[snapshot]", data);
      downloadJSON(data, `vilarejo-snapshot-${data.time}.json`);
    });
  }
  window.addEventListener("keydown", handleKeydown);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleKeydown(event) {
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (engine.isRunning()) {
      engine.pause();
    } else {
      engine.resume();
    }
    updatePauseLabel();
    return;
  }
  if (event.key === ".") {
    event.preventDefault();
    engine.pause();
    engine.stepOneTick();
    updatePauseLabel();
    return;
  }
  if (event.key === "j" || event.key === "k") {
    event.preventDefault();
    cycleAgent(event.key === "j" ? 1 : -1);
  }
}

function cycleAgent(delta) {
  if (!agents?.length) return;
  selectedAgentIndex = (selectedAgentIndex + delta + agents.length) % agents.length;
  refreshSelectedAgent();
}

function exposeDevtools() {
  if (typeof window === "undefined") return;
  window.vilarejo = {
    engine,
    get world() {
      return world;
    },
    get agents() {
      return agents;
    },
    get events() {
      return events;
    },
    snapshot: () => engine.serializeState()
  };
}

attachControls();
setupDevObservations();
initSimulation(DEFAULT_SEED);
engine.resume();
updatePauseLabel();

function setupDevObservations() {
  if (typeof window === "undefined") return;
  if (window.__DEV_OBS === undefined) {
    window.__DEV_OBS = false;
  }
  setInterval(() => {
    if (!window.__DEV_OBS) return;
    injectObservation();
  }, DEV_OBS_INTERVAL);
}

function injectObservation() {
  if (!agents?.length || !world) return;
  const now = Date.now();
  const candidates = agents.filter((agent) => {
    if (now - (devObsLastInject.get(agent.id) || 0) < DEV_OBS_COOLDOWN) return false;
    const cell = world.getCell(agent.pos.x, agent.pos.y);
    return cell?.tag === "field";
  });
  if (!candidates.length) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  pick.memory = addMemoryEntry(pick.memory, "field fire drill", 0.9, now);
  devObsLastInject.set(pick.id, now);
  pushEvent({ ts: now, agentId: pick.id, type: "inject", data: { text: "field fire drill" } });
}
