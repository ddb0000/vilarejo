import { createDefaultWorld } from "./world.js";
import { Agent, setNeedDrift as setAgentNeedDrift, getNeedDrift } from "./agent.js";
import { createMemory, add as addMemoryEntry } from "./memory.js";
import { UI } from "./ui.js";
import { rngSeed } from "./util.js";
import { DayScheduler } from "./scheduler.js";
import { summarizeMemories, generateMood } from "./bridge.js";
import { QuestManager } from "./quest-manager.js";
import { SpatialIndex } from "./spatial-index.js";

const TICK_MS = 200; // 5Hz
const DEFAULT_SEED = "seed-default";
const ROUTINE_MEMORY_BASE_TS = 1731300000000;

const canvas = document.getElementById("world-canvas");
const logEl = document.getElementById("log");
const agentListEl = document.getElementById("agents");
const inspectorEl = document.getElementById("inspector");
const eventsEl = document.getElementById("events");
const miniMap = document.getElementById("minimap");
const chatLogEl = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const storyToggle = document.getElementById("story-toggle");
const overlay = document.getElementById("onboarding");
const overlayDismiss = document.getElementById("overlay-dismiss");
const pauseBtn = document.getElementById("pause-btn");
const stepBtn = document.getElementById("step-btn");
const seedInput = document.getElementById("seed-input");
const snapshotBtn = document.getElementById("snapshot-btn");
const tuneHunger = document.getElementById("tune-hunger");
const tuneRest = document.getElementById("tune-rest");
const tuneSocial = document.getElementById("tune-social");
const hungerLabel = document.getElementById("hunger-label");
const restLabel = document.getElementById("rest-label");
const socialLabel = document.getElementById("social-label");

const ui = new UI({ canvas, logEl, agentListEl, inspectorEl, eventsEl, miniMap, chatLogEl, storyToggle });
ui.bindAgentSelect((index) => {
  selectedAgentIndex = index;
  refreshSelectedAgent();
});

let world;
let agents;
let selectedAgentIndex = 0;
let baseSeed = DEFAULT_SEED;
const EVENT_LIMIT = 256;
const events = [];
const DEV_OBS_INTERVAL = 15000;
const DEV_OBS_COOLDOWN = 60000;
const devObsLastInject = new Map();
const scheduler = new DayScheduler();
const weatherCycle = ["sunny", "cloudy", "rainy"];
let weatherIndex = 0;
let weatherState = weatherCycle[weatherIndex];
const runbookState = new Set();
const moodCooldown = new Map();
const questManager = new QuestManager((event) => pushEvent(event));
const spatialIndex = new SpatialIndex();
const CAPTURE_INTERVAL = 50;
let captureCounter = 0;
const RUNBOOKS = [
  { id: "lunchGossip", slot: "lunch", text: "shares mid-day market chatter", importance: 0.5, tag: "cafe" },
  { id: "eveningPorch", slot: "evening", text: "evening porch gossip about town", importance: 0.6, tag: "home" }
];

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
    baseSeed = seed;
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

  function setNeedDrift(values) {
    setAgentNeedDrift(values);
  }

  return { resume, pause, stepOneTick, setSeed, isRunning, getSeed, serializeState, setNeedDrift };
})();

function initSimulation(seedValue = DEFAULT_SEED) {
  const nextSeed = seedValue || DEFAULT_SEED;
  rngSeed(nextSeed);
  baseSeed = nextSeed;
  scheduler.reset();
  weatherIndex = 0;
  weatherState = weatherCycle[weatherIndex];
  runbookState.clear();
  moodCooldown.clear();
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
  const list = [
    new Agent({ id: "ana", name: "Ana", role: "grower", archetype: "farmer", start: { x: 0, y: 0 }, memory: buildRoutineMemory() }),
    new Agent({ id: "bruno", name: "Bruno", role: "baker", archetype: "vendor", start: { x: 3, y: 2 }, memory: buildRoutineMemory() }),
    new Agent({ id: "clara", name: "Clara", role: "scout", archetype: "wanderer", start: { x: 1, y: 3 }, memory: buildRoutineMemory() })
  ];
  list.forEach((agent) => questManager.registerAgent(agent));
  return list;
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
  if (event.agentId) {
    questManager.handleEvent(event);
  }
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
  const slot = scheduler.currentSlot();
  const slotId = slot?.id || "morning";
  spatialIndex.sync(agents);
  agents.forEach((agent) => {
    const result = agent.tick({
      world,
      agents,
      now,
      emitEvent: emitEventFactory(now),
      daySlotId: slotId,
      neighbors: (subject, radius = 1) => spatialIndex.neighbors(subject, radius)
    });
    if (result.logMessage) {
      log(`${agent.name} ${result.logMessage}`);
    }
    maybeUpdateMood(agent);
    questManager.handleNeeds(agent);
  });
  ui.render(world, agents);
  refreshSelectedAgent();
  ui.updateEvents(getRecentEvents());
  runRunbooks(slotId);
  const wrapped = scheduler.tick(TICK_MS);
  if (wrapped) {
    handleDawn();
  }
  captureCounter += 1;
  if (captureCounter % CAPTURE_INTERVAL === 0) {
    autoCapture();
  }
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

function initTuningPanel() {
  const current = getNeedDrift();
  if (tuneHunger && current.hunger !== undefined) tuneHunger.value = current.hunger;
  if (tuneRest && current.rest !== undefined) tuneRest.value = current.rest;
  if (tuneSocial && current.social !== undefined) tuneSocial.value = current.social;
  const updateLabels = () => {
    if (hungerLabel && tuneHunger) hungerLabel.textContent = Number(tuneHunger.value).toFixed(3);
    if (restLabel && tuneRest) restLabel.textContent = Number(tuneRest.value).toFixed(3);
    if (socialLabel && tuneSocial) socialLabel.textContent = Number(tuneSocial.value).toFixed(3);
  };
  const apply = () => {
    engine.setNeedDrift({
      hunger: Number(tuneHunger?.value ?? current.hunger),
      rest: Number(tuneRest?.value ?? current.rest),
      social: Number(tuneSocial?.value ?? current.social)
    });
    updateLabels();
  };
  [tuneHunger, tuneRest, tuneSocial].forEach((input) => input?.addEventListener("input", apply));
  updateLabels();
}

function initChatPanel() {
  if (!chatForm) return;
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = chatInput?.value?.trim();
    if (!value) return;
    handleChatCommand(value);
    chatInput.value = "";
  });
}

function handleChatCommand(message) {
  ui.appendChat("you", message);
  if (message.startsWith("/agent")) {
    const name = message.split(" ")[1];
    describeAgent(name);
    return;
  }
  if (message.startsWith("/inject")) {
    const [, targetName, ...rest] = message.split(" ");
    injectObservationCommand(targetName, rest.join(" "));
    return;
  }
  if (message.startsWith("/help")) {
    ui.appendChat("system", "Commands: /agent Name, /inject Name text");
    return;
  }
  const agent = agents[selectedAgentIndex];
  if (agent) {
    agent.memory = addMemoryEntry(agent.memory, message, 0.5, Date.now());
    pushEvent({ ts: Date.now(), agentId: agent.id, type: "chat", data: { text: message } });
    ui.appendChat("system", `noted for ${agent.name}`);
  }
}

function describeAgent(name) {
  const agent = findAgentByName(name);
  if (!agent) {
    ui.appendChat("system", `agent ${name} not found`);
    return;
  }
  const memories = agent.memory?.entries?.filter(Boolean).slice(0, 3).map((entry) => entry.observation).join(" | ") || "(none)";
  const log = (window.vilarejo?.events || []).filter((event) => event.agentId === agent.id).slice(0, 5).map((event) => event.type).join(", ") || "(no events)";
  ui.appendChat("system", `${agent.name} moods:${agent.mood || "steady"} · quest:${agent.lastQuest?.questId || "none"}`);
  ui.appendChat("system", `memories: ${memories}`);
  ui.appendChat("system", `events: ${log}`);
}

function injectObservationCommand(name, text) {
  const agent = findAgentByName(name);
  if (!agent || !text) {
    ui.appendChat("system", "usage: /inject Name observation text");
    return;
  }
  const now = Date.now();
  agent.memory = addMemoryEntry(agent.memory, text, 0.6, now);
  pushEvent({ ts: now, agentId: agent.id, type: "inject", data: { text: "chat-inject" } });
  ui.appendChat("system", `injected observation for ${agent.name}`);
}

function findAgentByName(name) {
  if (!name) return null;
  return agents.find((agent) => agent.name.toLowerCase() === name.toLowerCase()) || null;
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

function handleDawn() {
  runbookState.clear();
  const daySeed = `${baseSeed}-day-${scheduler.day}`;
  rngSeed(daySeed);
  pushEvent({ ts: Date.now(), agentId: "system", type: "dawn", data: { day: scheduler.day, seed: daySeed } });
  if (typeof window !== "undefined" && window.__LLM_INTENTIONS && window.__LLM_PROXY_URL) {
    agents.forEach((agent) => {
      summarizeMemories(agent)
        .then((summary) => {
          agent.memory = addMemoryEntry(agent.memory, summary, 0.4, Date.now());
        })
        .catch(() => {});
    });
  }
}

function runRunbooks(slotId) {
  RUNBOOKS.forEach((book) => {
    if (book.slot !== slotId) return;
    const key = `${book.id}-day-${scheduler.day}`;
    if (runbookState.has(key)) return;
    const agent = pickAgentNearTag(book.tag);
    if (!agent) return;
    const now = Date.now();
    agent.memory = addMemoryEntry(agent.memory, book.text, book.importance, now);
    pushEvent({ ts: now, agentId: agent.id, type: "inject", data: { text: book.text, tag: book.tag, runbook: book.id } });
    runbookState.add(key);
  });
}

function pickAgentNearTag(tag) {
  if (!agents || !world) return null;
  const matches = agents.filter((agent) => world.getCell(agent.pos.x, agent.pos.y)?.tag === tag);
  if (!matches.length) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

function startMarketChatter() {
  setInterval(() => {
    const agent = pickAgentNearTag("cafe");
    if (!agent) return;
    const now = Date.now();
    agent.memory = addMemoryEntry(agent.memory, "overhears lively market chatter", 0.45, now);
    pushEvent({ ts: now, agentId: agent.id, type: "inject", data: { text: "market chatter" } });
  }, 45000);
}

function startWeatherTicker() {
  setInterval(() => {
    weatherIndex = (weatherIndex + 1) % weatherCycle.length;
    weatherState = weatherCycle[weatherIndex];
    const now = Date.now();
    pushEvent({ ts: now, agentId: "weather", type: "weather", data: { state: weatherState } });
  }, 60000);
}

function startRumorBeats() {
  setInterval(() => {
    const tag = Math.random() > 0.5 ? "field" : "home";
    const agent = pickAgentNearTag(tag);
    if (!agent) return;
    const now = Date.now();
    agent.memory = addMemoryEntry(agent.memory, `hears a rumor near the ${tag}`, 0.5, now);
    pushEvent({ ts: now, agentId: agent.id, type: "inject", data: { text: "rumor", tag } });
  }, 70000);
}

function autoCapture() {
  if (typeof window === "undefined" || !canvas?.toDataURL) return;
  const data = canvas.toDataURL("image/png");
  window.__CAPTURES = window.__CAPTURES || [];
  window.__CAPTURES.unshift({ ts: Date.now(), data });
  if (window.__CAPTURES.length > 10) window.__CAPTURES.pop();
  pushEvent({ ts: Date.now(), agentId: "system", type: "capture", data: { index: window.__CAPTURES.length } });
}

function startSharedRumors() {
  setInterval(() => {
    if (!agents || agents.length < 2) return;
    const source = agents[Math.floor(Math.random() * agents.length)];
    const target = agents.filter((a) => a.id !== source.id)[Math.floor(Math.random() * Math.max(agents.length - 1, 1))];
    if (!source || !target) return;
    const payload = source.decisionLog.slice(0, 4);
    if (!payload.length) return;
    const now = Date.now();
    const fallback = `shares a short rumor from ${source.name}`;
    const applySummary = (text) => {
      target.memory = addMemoryEntry(target.memory, text || fallback, 0.7, now);
      pushEvent({ ts: now, agentId: target.id, type: "inject", data: { text: "shared-memory", from: source.id } });
    };
    if (typeof window !== "undefined" && window.__LLM_INTENTIONS && window.__LLM_PROXY_URL) {
      summarizeMemories(source, payload)
        .then(applySummary)
        .catch(() => applySummary(fallback));
    } else {
      applySummary(fallback);
    }
  }, 80000);
}

function maybeUpdateMood(agent) {
  if (!(typeof window !== "undefined" && window.__LLM_INTENTIONS && window.__LLM_PROXY_URL)) return;
  const now = Date.now();
  if (now - (moodCooldown.get(agent.id) || 0) < 60000) return;
  moodCooldown.set(agent.id, now);
  generateMood(agent)
    .then((mood) => {
      agent.mood = mood || agent.mood;
    })
    .catch(() => {});
}

function initOnboarding() {
  overlayDismiss?.addEventListener("click", () => overlay?.classList.remove("open"));
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
initTuningPanel();
initChatPanel();
initOnboarding();
setupDevObservations();
startMarketChatter();
startWeatherTicker();
startRumorBeats();
startSharedRumors();
initSimulation(DEFAULT_SEED);
engine.resume();
updatePauseLabel();

function setupDevObservations() {
  if (typeof window === "undefined") return;
  if (window.__DEV_OBS === undefined) {
    window.__DEV_OBS = false;
  }
  if (window.__LLM_INTENTIONS === undefined) {
    window.__LLM_INTENTIONS = false;
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
