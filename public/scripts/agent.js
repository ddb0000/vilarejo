import { clamp, recencyScore } from "./util.js";
import { add as addMemoryEntry, retrieve as retrieveMemories, createMemory } from "./memory.js";

const NEED_DRIFT = {
  hunger: 0.015,
  rest: 0.012,
  social: 0.013
};

const ACTION_IMPORTANCE = {
  move: 0.3,
  talk: 0.5,
  eat: 0.6,
  rest: 0.6,
  work: 0.35
};

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
    this.decisionLog = [];
    this.lastDecisionDebug = null;
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
    const currentCell = world.getCell(this.pos.x, this.pos.y);
    const others = agents.filter((agent) => agent.id !== this.id);

    const options = [
      this.#evaluateMove(world, currentCell, now),
      this.#evaluateTalk(currentCell, others, now),
      this.#evaluateEat(currentCell, now),
      this.#evaluateRest(currentCell, now),
      this.#evaluateWork(currentCell, now)
    ].filter(Boolean);

    options.sort((a, b) => b.score - a.score);
    return options[0];
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
    const atSameCell = others.find((agent) => agent.pos.x === this.pos.x && agent.pos.y === this.pos.y);
    const baseRelevance = atSameCell ? 0.5 + this.needs.social : this.needs.social * 0.2;
    return this.#scoreAction("talk", baseRelevance, ACTION_IMPORTANCE.talk, now, {
      partner: atSameCell?.name || null
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
      this.memory = addMemoryEntry(
        this.memory,
        `${this.name} ${logMessage}`,
        plan.breakdown.importance * 0.5,
        now
      );
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
    this.needs.hunger = clamp(this.needs.hunger - 0.45);
    this.needs.social = clamp(this.needs.social - 0.05);
    return "eats fresh stew at the cafe";
  }

  #rest() {
    this.needs.rest = clamp(this.needs.rest - 0.5);
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

  #recordDecision(plan, timestamp) {
    const snapshot = {
      timestamp,
      action: plan.type,
      breakdown: plan.breakdown,
      memories: plan.memoryInsights ?? []
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
