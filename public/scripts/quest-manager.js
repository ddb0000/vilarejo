import { QUESTS } from "./quests.js";
import { add as addMemoryEntry } from "./memory.js";

export class QuestManager {
  constructor(pushEvent) {
    this.pushEvent = pushEvent;
    this.agentState = new Map();
  }

  registerAgent(agent) {
    if (this.agentState.has(agent.id)) return;
    const quest = this.#pickQuest(agent);
    if (!quest) return;
    this.agentState.set(agent.id, {
      quest,
      stepIndex: 0,
      agent
    });
  }

  #pickQuest(agent) {
    const candidates = QUESTS.filter((quest) =>
      quest.archetypes?.includes(agent.archetypeId)
    );
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  handleNeeds(agent) {
    const state = this.agentState.get(agent.id);
    if (!state) return;
    const step = state.quest.steps[state.stepIndex];
    if (!step) return;
    const trigger = step.trigger;
    if (trigger?.need && this.#checkNeed(agent, trigger.need, trigger.gt)) {
      this.#advance(agent, state, step.memory, step.complete);
    }
  }

  handleEvent(event) {
    if (!event?.agentId) return;
    const agentState = this.agentState.get(event.agentId);
    if (!agentState) return;
    const step = agentState.quest.steps[agentState.stepIndex];
    if (!step) return;
    const trigger = step.trigger;
    if (trigger?.eventText && this.#matchText(event, trigger.eventText)) {
      this.#advance(event.agentId, agentState, step.memory, step.complete);
    }
    if (trigger?.location && event.type === "move" && event.data?.desiredTag === trigger.location) {
      this.#advance(event.agentId, agentState, step.memory, step.complete);
    }
  }

  #checkNeed(agent, needKey, gt) {
    return agent.needs?.[needKey] >= (gt ?? 0.5);
  }

  #matchText(event, text) {
    const payload = `${event.data?.text || ""}`.toLowerCase();
    return payload.includes(text.toLowerCase());
  }

  #advance(agentOrId, state, memoryText, complete) {
    const agent = typeof agentOrId === "object" ? agentOrId : state.agent;
    state.agent = state.agent || agent;
    const agentId = agent?.id || agentOrId;
    if (agent) agent.lastQuest = { questId: state.quest.id, step: state.quest.steps[state.stepIndex].id };
    const now = Date.now();
    const actor = agent || state.agent || null;
    if (actor) {
      actor.memory = addMemoryEntry(actor.memory, memoryText, 0.6, now);
    }
    this.pushEvent({ ts: now, agentId, type: "quest", data: { questId: state.quest.id, step: state.quest.steps[state.stepIndex].id } });
    if (complete) {
      this.agentState.delete(agentId);
    } else {
      state.stepIndex += 1;
    }
  }
}
