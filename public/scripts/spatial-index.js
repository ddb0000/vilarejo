export class SpatialIndex {
  constructor() {
    this.map = new Map();
  }

  sync(agents = []) {
    this.map.clear();
    agents.forEach((agent) => {
      const key = this.#key(agent.pos);
      if (!this.map.has(key)) this.map.set(key, []);
      this.map.get(key).push(agent);
    });
  }

  neighbors(agent, radius = 1) {
    const results = [];
    if (!agent?.pos) return results;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (dx === 0 && dy === 0) continue;
        const key = this.#key({ x: agent.pos.x + dx, y: agent.pos.y + dy });
        const list = this.map.get(key);
        if (list) {
          list.forEach((candidate) => {
            if (candidate.id !== agent.id) results.push(candidate);
          });
        }
      }
    }
    return results;
  }

  #key(pos) {
    return `${pos.x},${pos.y}`;
  }
}
