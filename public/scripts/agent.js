import { clamp, recencyScore } from "./util.js";
import { add as addMemoryEntry, retrieve as retrieveMemories, createMemory } from "./memory.js";

const NEED_DRIFT = {
  hunger: 0.01,
  rest: 0.008,
  social: 0.009
};

const ACTION_IMPORTANCE = {
  move: 0.3,
  talk: 0.5,
  eat: 0.6,
  rest: 0.6,
  work: 0.35
};

const ROUTINE_PHASES = ["wake", "work", "socialize", "rest"];
const ROUTINE_DURATIONS = {
  wake: 20000,
  work: 120000,
  socialize: 60000,
  rest: 120000
};
const URGENT_THRESHOLDS = { hunger: 0.8, rest: 0.2, social: 0.4 };
const SOCIAL_RADIUS = 1;
const ROUTINE_BONUS = 0.1;
const LOG_THROTTLE_MS = 2000;

export class Agent {
  constructor({ id, name, start, role = "villager", memory }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.pos = { ...start };
    this.memory = memory ?? createMemory();
    this.needs = {
      hunger: 0.35,
      rest: 0.25,
      social: 0.5
    };
    this.lastAction = "spawn";
    this.lastActionTimes = {};
    this.lastLogActionTimes = {};
    this.decisionLog = [];
    this.lastDecisionDebug = null;
    this.routinePhase = "wake";
    this.routineTimer = ROUTINE_DURATIONS.wake;
    this.lastRoutineUpdate = 0;
    this.wants = {
      hangout: "cafe",
      workplace: "field",
      home: "home"
    };
  }

  tick(context) {
    const { now } = context;
    this.#driftNeeds();
    const plan = this.#plan(context);
    this.#recordDecision(plan, now);
    const result = this.#act(plan, context);
    this.lastAction = plan.type;
    this.lastActionTimes[plan.type] = now;
    return result;
  }

  #plan({ world, agents, now }) {
    this.#advanceRoutine(now);
    const currentCell = world.getCell(this.pos.x, this.pos.y);
    const others = agents.filter((agent) => agent.id !== this.id);
    const options = [
      this.#evaluateMove(world, currentCell, now),
      this.#evaluateTalk(currentCell, others, now),
      this.#evaluateEat(currentCell, now),
      this.#evaluateRest(currentCell, now),
      this.#evaluateWork(currentCell, now)
    ].filter(Boolean);
    if (!options.length) {
      return {
        type: "rest",
        score: 0,
        detail: {},
        breakdown: { relevance: 0, recency: 0, importance: 0 },
        memoryInsights: [],
        cause: "routine"
      };
    }
    options.sort((a, b) => b.score - a.score);
    const directive = this.#directivePlan(options, { world, agents, now });
    if (directive) return directive;
    const routineHint = this.#routineAction(world, agents);
    const routinePlan = this.#planForAction(options, routineHint.action, routineHint.detail, "routine");
    if (routinePlan) {
      routinePlan.score += ROUTINE_BONUS;
      return routinePlan;
    }
    return { ...options[0], cause: "routine" };
  }

  #evaluateMove(world, currentCell, now) {
    const desiredTag = this.#desiredTag();
    const aligned = currentCell?.tag === desiredTag;
    const baseRelevance = aligned ? 0.05 : 0.6 + this.#highestNeedValue();
    return this.#scoreAction("move", baseRelevance, ACTION_IMPORTANCE.move, now, {
      desiredTag,
      target: world.closestCell(desiredTag, this.pos)
    });
  }

  #evaluateTalk(currentCell, others, now) {
    if (this.needs.social >= 0.6) return null;
    const nearby = this.#closeAgent(others);
    if (!nearby) return null;
    const baseRelevance = 0.5 + (0.6 - this.needs.social);
    return this.#scoreAction("talk", baseRelevance, ACTION_IMPORTANCE.talk, now, {
      partner: nearby.name
    });
  }

  #evaluateEat(currentCell, now) {
    const baseRelevance = currentCell?.tag === "cafe" ? this.needs.hunger + 0.3 : this.needs.hunger * 0.1;
    return this.#scoreAction("eat", baseRelevance, ACTION_IMPORTANCE.eat, now, {});
  }

  #evaluateRest(currentCell, now) {
    const baseRelevance = currentCell?.tag === "home" ? this.needs.rest + 0.35 : this.needs.rest * 0.15;
    return this.#scoreAction("rest", baseRelevance, ACTION_IMPORTANCE.rest, now, {});
  }

  #evaluateWork(currentCell, now) {
    const baseRelevance = currentCell?.tag === "field" ? 0.4 : 0.2;
    return this.#scoreAction("work", baseRelevance, ACTION_IMPORTANCE.work, now, {});
  }

  #scoreAction(type, baseRelevance, baseImportance, now, detail) {
    const memoryHits = retrieveMemories(this.memory, type, 3, now);
    const memoryHit = memoryHits[0];
    const relevance = clamp(baseRelevance + (memoryHit?.components.relevance ?? 0), 0, 2);
    const importance = clamp(baseImportance + (memoryHit?.entry.importance ?? 0) * 0.3, 0, 2);
    const recency = recencyScore(this.lastActionTimes[type], now, 5000);
    const score = relevance + recency + importance;
    return {
      type,
      score,
      detail,
      breakdown: { relevance, recency, importance },
      memoryInsights: this.#formatMemoryInsights(memoryHits)
    };
  }

  #act(plan, { world, agents, now }) {
    let logMessage = "";
    switch (plan.type) {
      case "move":
        logMessage = this.#move(world, plan.detail);
        break;
      case "talk":
        logMessage = this.#talk(agents, plan.detail);
        break;
      case "eat":
        logMessage = this.#eat();
        break;
      case "rest":
        logMessage = this.#rest();
        break;
      case "work":
      default:
        logMessage = this.#work();
        break;
    }

    if (logMessage) {
      const lastLog = this.lastLogActionTimes[plan.type] || 0;
      if (now - lastLog >= LOG_THROTTLE_MS) {
        this.lastLogActionTimes[plan.type] = now;
        this.memory = addMemoryEntry(
          this.memory,
          `${this.name} ${logMessage}`,
          plan.breakdown.importance * 0.5,
          now
        );
      } else {
        logMessage = "";
      }
    }

    return { action: plan.type, logMessage };
  }

  #move(world, detail) {
    const nextPos = world.stepToward(this.pos, detail.target || this.pos);
    const before = { ...this.pos };
    this.pos = nextPos;
    return `walks from (${before.x},${before.y}) toward ${detail.desiredTag}`;
  }

  #talk(agents, detail) {
    const partner = agents.find((agent) => agent.name === detail.partner);
    if (!partner) {
      return "looks for someone to talk but finds no one";
    }
    this.needs.social = clamp(this.needs.social - 0.35);
    partner.needs.social = clamp(partner.needs.social - 0.2);
    return `talks with ${partner.name} about the morning chores`;
  }

  #eat() {
    this.needs.hunger = clamp(this.needs.hunger - 0.65);
    this.needs.social = clamp(this.needs.social - 0.03);
    this.needs.rest = clamp(this.needs.rest - 0.02);
    return "eats fresh stew at the cafe";
  }

  #rest() {
    this.needs.rest = clamp(this.needs.rest - 0.65);
    this.needs.hunger = clamp(this.needs.hunger + 0.01);
    return "takes a short rest at home";
  }

  #work() {
    this.needs.hunger = clamp(this.needs.hunger + 0.05, 0, 1);
    this.needs.rest = clamp(this.needs.rest + 0.03, 0, 1);
    return "tends to the field rows";
  }

  #desiredTag() {
    if (this.needs.hunger > 0.65) return "cafe";
    if (this.needs.rest > 0.6) return "home";
    if (this.needs.social > 0.55) return this.wants.hangout;
    return this.wants.workplace;
  }

  #highestNeedValue() {
    return Math.max(this.needs.hunger, this.needs.rest, this.needs.social);
  }

  #directivePlan(options, context) {
    const urgent = this.#urgentAction(context);
    if (urgent) return this.#planForAction(options, urgent.action, urgent.detail, "urgent");
    const memory = this.#memoryAction(context.now);
    if (memory) return this.#planForAction(options, memory.action, memory.detail, "memory");
    return null;
  }

  #planForAction(options, action, detail, cause) {
    if (!action) return null;
    const match = options.find((option) => option.type === action);
    if (!match) return null;
    return {
      ...match,
      cause,
      detail: detail ? { ...(match.detail || {}), ...detail } : match.detail
    };
  }

  #advanceRoutine(now) {
    if (!this.lastRoutineUpdate) {
      this.lastRoutineUpdate = now;
      return;
    }
    this.routineTimer -= now - this.lastRoutineUpdate;
    this.lastRoutineUpdate = now;
    if (this.routineTimer <= 0) {
      const idx = (ROUTINE_PHASES.indexOf(this.routinePhase) + 1) % ROUTINE_PHASES.length;
      this.routinePhase = ROUTINE_PHASES[idx];
      this.routineTimer = ROUTINE_DURATIONS[this.routinePhase];
    }
  }

  #routineAction(world, agents) {
    const cell = world.getCell(this.pos.x, this.pos.y);
    const home = world.closestCell(this.wants.home, this.pos);
    const field = world.closestCell(this.wants.workplace, this.pos);
    const cafe = world.closestCell(this.wants.hangout, this.pos);
    const neighbor = this.#closeAgent(agents);
    switch (this.routinePhase) {
      case "wake":
        return cell?.tag === "home" ? { action: "rest" } : { action: "move", detail: { desiredTag: "home", target: home } };
      case "work":
        return cell?.tag === "field" ? { action: "work" } : { action: "move", detail: { desiredTag: "field", target: field } };
      case "socialize":
        if (neighbor) return { action: "talk", detail: { partner: neighbor.name } };
        return { action: "move", detail: { desiredTag: "cafe", target: cafe } };
      case "rest":
      default:
        return cell?.tag === "home" ? { action: "rest" } : { action: "move", detail: { desiredTag: "home", target: home } };
    }
  }

  #urgentAction({ world, agents }) {
    if (this.needs.hunger >= URGENT_THRESHOLDS.hunger && this.#nearTag(world, "cafe")) {
      return { action: "eat" };
    }
    if (this.needs.rest <= URGENT_THRESHOLDS.rest && this.#nearTag(world, "home")) {
      return { action: "rest" };
    }
    if (this.needs.social <= URGENT_THRESHOLDS.social) {
      const neighbor = this.#closeAgent(agents);
      if (neighbor) return { action: "talk", detail: { partner: neighbor.name } };
    }
    return null;
  }

  #memoryAction(now) {
    const habit = retrieveMemories(this.memory, "habit", 3, now)[0];
    const named = retrieveMemories(this.memory, this.name, 3, now)[0];
    const best = [habit, named].filter(Boolean).sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 0.8) return null;
    const action = this.#actionFromMemory(best.entry.observation);
    if (!action) return null;
    return { action };
  }

  #actionFromMemory(text) {
    const lowered = (text || "").toLowerCase();
    if (lowered.includes("cafe")) return "eat";
    if (lowered.includes("field")) return "work";
    if (lowered.includes("home")) return "rest";
    if (lowered.includes("talk")) return "talk";
    return null;
  }

  #nearTag(world, tag) {
    const cell = world.closestCell(tag, this.pos);
    if (!cell) return false;
    return this.#distance(cell, this.pos) <= 1;
  }

  #closeAgent(agents) {
    return agents.find((agent) => agent.id !== this.id && this.#distance(agent.pos, this.pos) <= SOCIAL_RADIUS);
  }

  #distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  #recordDecision(plan, timestamp) {
    const snapshot = {
      timestamp,
      action: plan.type,
      breakdown: plan.breakdown,
      memories: plan.memoryInsights ?? [],
      cause: plan.cause || "routine"
    };
    this.decisionLog.unshift(snapshot);
    if (this.decisionLog.length > 6) {
      this.decisionLog.pop();
    }
    this.lastDecisionDebug = snapshot;
  }

  #formatMemoryInsights(hits) {
    return hits.map((hit) => ({
      id: hit.entry.id,
      text: hit.entry.observation,
      relevance: hit.components.relevance,
      recency: hit.components.recency,
      importance: hit.components.importance,
      total: hit.score
    }));
  }

  #driftNeeds() {
    for (const key of Object.keys(this.needs)) {
      this.needs[key] = clamp(this.needs[key] + NEED_DRIFT[key]);
    }
  }
}
