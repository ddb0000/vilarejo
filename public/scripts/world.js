import { describePosition } from "./util.js";

const LAYOUT = [
  ["home", "field", "field", "cafe"],
  ["home", "field", "field", "cafe"],
  ["field", "field", "field", "cafe"],
  ["home", "field", "field", "cafe"]
];

export class World {
  constructor(layout) {
    this.grid = layout.map((row, y) =>
      row.map((tag, x) => ({ x, y, tag }))
    );
    this.height = this.grid.length;
    this.width = this.grid[0]?.length ?? 0;
  }

  getCell(x, y) {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
      return null;
    }
    return this.grid[y][x];
  }

  cellsByTag(tag) {
    const cells = [];
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.tag === tag) cells.push(cell);
      }
    }
    return cells;
  }

  closestCell(tag, start) {
    const cells = this.cellsByTag(tag);
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const cell of cells) {
      const distance = Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y);
      if (distance < bestDistance) {
        best = cell;
        bestDistance = distance;
      }
    }
    return best;
  }

  stepToward(current, target) {
    if (!target) return current;
    if (current.x === target.x && current.y === target.y) return current;
    const next = { ...current };
    if (current.x !== target.x) {
      next.x += current.x < target.x ? 1 : -1;
    } else if (current.y !== target.y) {
      next.y += current.y < target.y ? 1 : -1;
    }
    if (!this.getCell(next.x, next.y)) return current;
    return next;
  }

  describeCell(pos) {
    const cell = this.getCell(pos.x, pos.y);
    if (!cell) return `void ${describePosition(pos)}`;
    return `${cell.tag} ${describePosition(cell)}`;
  }
}

export function createDefaultWorld() {
  return new World(LAYOUT);
}
