import { clamp, formatPercent } from "./util.js";

const CELL_COLORS = {
  home: "#264653",
  field: "#2a9d8f",
  cafe: "#e9c46a"
};
const CELL_SIZE = 80;

export class UI {
  constructor({ canvas, logEl, agentListEl, inspectorEl }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.logEl = logEl;
    this.agentListEl = agentListEl;
    this.inspectorEl = inspectorEl;
    this.logs = [];
    this.maxLogs = 60;
    if (this.inspectorEl) {
      this.inspectorEl.innerHTML = '<div class=\"inspector-empty\">Hover an agent to inspect their last plan.</div>';
    }
  }

  render(world, agents) {
    this.canvas.width = world.width * CELL_SIZE;
    this.canvas.height = world.height * CELL_SIZE;
    this.#drawWorld(world);
    this.#drawAgents(agents);
  }

  updateAgentList(agents) {
    this.agentListEl.innerHTML = "";
    agents.forEach((agent) => {
      const card = document.createElement("div");
      card.className = "agent-card";
      card.innerHTML = `
        <strong>${agent.name}</strong>
        <div class="meta">${agent.role} · last: ${agent.lastAction}</div>
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
      card.addEventListener("mouseleave", () => this.clearInspector());
      this.agentListEl.appendChild(card);
    });
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
    const decision = agent.lastDecisionDebug;
    if (!decision) {
      this.inspectorEl.innerHTML = '<div class=\"inspector-empty\">No planner data yet.</div>';
      return;
    }
    const fmt = (value) => (value ?? 0).toFixed(2);
    const plan = decision.breakdown ?? { relevance: 0, recency: 0, importance: 0 };
    const planTotal = plan.relevance + plan.recency + plan.importance;
    const memories = (decision.memories || [])
      .map(
        (mem, idx) => `
          <div class=\"memory-item\">
            <div><strong>${idx + 1}.</strong> ${mem.text || "(empty)"}</div>
            <div class=\"memory-metrics\">
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
      <div class=\"inspector-header\">
        <span>${agent.name}</span>
        <span>${decision.action}</span>
      </div>
      <div class=\"inspector-breakdown\">
        plan · rel ${fmt(plan.relevance)} · rec ${fmt(plan.recency)} · imp ${fmt(plan.importance)} · total ${fmt(planTotal)}
      </div>
      <div>${memories || '<div class=\"inspector-empty\">No relevant memories.</div>'}</div>
    `;
  }

  clearInspector() {
    if (!this.inspectorEl) return;
    this.inspectorEl.innerHTML = '<div class=\"inspector-empty\">Hover an agent to inspect their last plan.</div>';
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
}
