import { clamp, formatPercent } from "./util.js";

const CELL_COLORS = {
  home: "#264653",
  field: "#2a9d8f",
  cafe: "#e9c46a"
};
const CELL_SIZE = 80;
const TARGET_COLOR = "rgba(138, 180, 255, 0.8)";

export class UI {
  constructor({ canvas, logEl, agentListEl, inspectorEl, eventsEl }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.logEl = logEl;
    this.agentListEl = agentListEl;
    this.inspectorEl = inspectorEl;
    this.eventsEl = eventsEl;
    this.logs = [];
    this.maxLogs = 60;
    this.agents = [];
    this.selectedIndex = 0;
    this.agentSelectHandler = null;
    this.clearInspector();
  }

  bindAgentSelect(handler) {
    this.agentSelectHandler = handler;
  }

  render(world, agents) {
    this.canvas.width = world.width * CELL_SIZE;
    this.canvas.height = world.height * CELL_SIZE;
    this.#drawWorld(world);
    this.#drawTargets(agents);
    this.#drawAgents(agents);
  }

  updateAgentList(agents, selectedIndex = this.selectedIndex) {
    this.agents = agents;
    this.selectedIndex = Math.min(Math.max(selectedIndex, 0), Math.max(agents.length - 1, 0));
    this.agentListEl.innerHTML = "";
    agents.forEach((agent, index) => {
      const card = document.createElement("div");
      card.className = "agent-card";
      if (index === this.selectedIndex) card.classList.add("selected");
      card.innerHTML = `
        <strong>${agent.name}</strong>
        <div class="meta">${agent.role} · last: ${agent.lastAction}</div>
        <div class="meta">routine: ${agent.routinePhase} · ${Math.ceil((agent.routineTimer || 0) / 1000)}s</div>
      `;
      const needs = document.createElement("div");
      needs.className = "needs";
      Object.entries(agent.needs).forEach(([key, value]) => {
        const row = document.createElement("div");
        row.innerHTML = `
          <div>${key} · ${formatPercent(value)}</div>
          <div class="need-bar"><span style="width:${clamp(value) * 100}%"></span></div>
        `;
        needs.appendChild(row);
      });
      card.appendChild(needs);
      card.addEventListener("mouseenter", () => this.showInspector(agent));
      card.addEventListener("mouseleave", () => this.showSelectedInspector());
      card.addEventListener("click", () => this.#selectAgent(index));
      this.agentListEl.appendChild(card);
    });
    this.showSelectedInspector();
  }

  appendLog(message) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = `[${time}] ${message}`;
    this.logEl.prepend(entry);
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      const old = this.logs.pop();
      old.remove();
    }
  }

  showInspector(agent) {
    if (!this.inspectorEl) return;
    if (!agent) {
      this.clearInspector();
      return;
    }
    const decision = agent.lastDecisionDebug;
    if (!decision) {
      this.inspectorEl.innerHTML = '<div class="inspector-empty">No planner data yet.</div>';
      return;
    }
    const fmt = (value) => (value ?? 0).toFixed(2);
    const plan = decision.breakdown ?? { relevance: 0, recency: 0, importance: 0 };
    const planTotal = plan.relevance + plan.recency + plan.importance;
    const cause = decision.cause || "routine";
    const memories = (decision.memories || [])
      .map(
        (mem, idx) => `
          <div class="memory-item">
            <div><strong>${idx + 1}.</strong> ${mem.text || "(empty)"}</div>
            <div class="memory-metrics">
              <span>rel ${fmt(mem.relevance)}</span>
              <span>rec ${fmt(mem.recency)}</span>
              <span>imp ${fmt(mem.importance)}</span>
              <span>total ${fmt(mem.total)}</span>
            </div>
          </div>
        `
      )
      .join("");
    this.inspectorEl.innerHTML = `
      <div class="inspector-header">
        <span>${agent.name}</span>
        <span>${decision.action}</span>
      </div>
      <div class="inspector-breakdown">
        cause ${cause} · rel ${fmt(plan.relevance)} · rec ${fmt(plan.recency)} · imp ${fmt(plan.importance)} · total ${fmt(planTotal)}
      </div>
      <div>${memories || '<div class="inspector-empty">No relevant memories.</div>'}</div>
    `;
  }

  showSelectedInspector() {
    if (!this.agents.length) {
      this.clearInspector();
      return;
    }
    this.showInspector(this.agents[this.selectedIndex]);
  }

  clearInspector() {
    if (!this.inspectorEl) return;
    this.inspectorEl.innerHTML = '<div class="inspector-empty">Hover or select an agent to inspect.</div>';
  }

  updateEvents(events) {
    if (!this.eventsEl) return;
    if (!events || events.length === 0) {
      this.eventsEl.innerHTML = '<div class="inspector-empty">No events yet.</div>';
      return;
    }
    this.eventsEl.innerHTML = events
      .slice(0, 20)
      .map((event) => {
        const time = new Date(event.ts).toLocaleTimeString();
        const meta = `${event.type} · ${event.agentId}`;
        const data = typeof event.data === "object" ? JSON.stringify(event.data) : event.data;
        return `
          <div class="event-row">
            <div class="event-meta">${time} · ${meta}</div>
            <div>${data}</div>
          </div>
        `;
      })
      .join("");
  }

  #selectAgent(index) {
    this.selectedIndex = index;
    this.showSelectedInspector();
    this.#highlightSelection();
    if (typeof this.agentSelectHandler === "function") {
      this.agentSelectHandler(index);
    }
  }

  #highlightSelection() {
    Array.from(this.agentListEl.children).forEach((card, idx) => {
      card.classList.toggle("selected", idx === this.selectedIndex);
    });
  }

  #drawWorld(world) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const cell = world.getCell(x, y);
        ctx.fillStyle = CELL_COLORS[cell.tag] || "#444";
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = "#0d1117";
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.font = "12px Inter";
        ctx.fillText(cell.tag, x * CELL_SIZE + 8, y * CELL_SIZE + 16);
      }
    }
  }

  #drawAgents(agents) {
    const { ctx } = this;
    agents.forEach((agent) => {
      ctx.fillStyle = "#f4a261";
      ctx.beginPath();
      ctx.arc(
        agent.pos.x * CELL_SIZE + CELL_SIZE / 2,
        agent.pos.y * CELL_SIZE + CELL_SIZE / 2,
        12,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = "#0b0f14";
      ctx.font = "12px Inter";
      ctx.fillText(agent.name.charAt(0), agent.pos.x * CELL_SIZE + CELL_SIZE / 2 - 4, agent.pos.y * CELL_SIZE + CELL_SIZE / 2 + 4);
    });
  }

  #drawTargets(agents) {
    const { ctx } = this;
    agents.forEach((agent) => {
      const target = agent.activeTarget;
      if (!target) return;
      const cellX = target.x * CELL_SIZE;
      const cellY = target.y * CELL_SIZE;
      ctx.save();
      ctx.strokeStyle = TARGET_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(cellX + 2, cellY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.beginPath();
      ctx.moveTo(agent.pos.x * CELL_SIZE + CELL_SIZE / 2, agent.pos.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(target.x * CELL_SIZE + CELL_SIZE / 2, target.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.stroke();
      ctx.restore();
    });
  }
}
