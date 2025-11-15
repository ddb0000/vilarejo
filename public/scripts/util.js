export function rng(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
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
