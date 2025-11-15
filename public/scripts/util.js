let seededRandom = null;

export function rng(min = 0, max = 1) {
  const rand = seededRandom ? seededRandom() : Math.random();
  return rand * (max - min) + min;
}

export function rngSeed(seedInput) {
  if (seedInput === undefined || seedInput === null || seedInput === "") {
    seededRandom = null;
    return;
  }
  const normalized = typeof seedInput === "number" && Number.isFinite(seedInput) ? seedInput : hashSeed(String(seedInput));
  seededRandom = mulberry32(normalized >>> 0);
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

export function clamp(value, min = 0, max = 1) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function recencyScore(lastTimestamp, now, halfLifeMs = 8000) {
  if (!lastTimestamp) return 1;
  const elapsed = Math.max(0, now - lastTimestamp);
  return Math.exp(-elapsed / halfLifeMs);
}

export function formatPercent(value) {
  return `${Math.round(clamp(value) * 100)}%`;
}

export function describePosition(pos) {
  return `(${pos.x},${pos.y})`;
}
