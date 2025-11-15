import { clamp } from "./util.js";

const DEFAULT_LIMIT = 32;
const SCORE_WEIGHTS = { relevance: 0.4, recency: 0.3, importance: 0.3 };
const RECENCY_TIME_CONSTANT = 300000; // 5 minutes in ms
const TOKEN_REGEX = /\w+/g;

export function createMemory(limit = DEFAULT_LIMIT) {
  return {
    limit,
    entries: new Array(limit).fill(null),
    index: 0,
    count: 0
  };
}

export function add(memory, observation, importance = 0.3, timestamp = Date.now()) {
  if (!memory) throw new Error("memory state required");
  const normalizedImportance = clamp(Number.isFinite(importance) ? importance : 0, 0, 1);
  const entry = {
    id: `${timestamp}-${memory.index}`,
    observation: observation ?? "",
    importance: normalizedImportance,
    timestamp,
    tokens: tokenize(observation)
  };
  const entries = memory.entries.slice();
  entries[memory.index] = entry;
  const index = (memory.index + 1) % memory.limit;
  const count = Math.min(memory.count + 1, memory.limit);
  let updated = { ...memory, entries, index, count };
  if (updated.count === updated.limit) {
    updated = compact(updated);
  }
  return updated;
}

export function retrieve(memory, query = "", k = 5, now = Date.now()) {
  if (!memory || memory.count === 0) return [];
  const queryTokens = tokenize(query);
  const querySet = new Set(queryTokens);
  const samples = [];
  for (let i = 0; i < memory.count; i += 1) {
    const idx = (memory.index - i - 1 + memory.limit) % memory.limit;
    const entry = memory.entries[idx];
    if (!entry) continue;
    const relevance = computeRelevance(entry.tokens, querySet);
    const recency = computeRecency(now, entry.timestamp);
    const score =
      SCORE_WEIGHTS.relevance * relevance +
      SCORE_WEIGHTS.recency * recency +
      SCORE_WEIGHTS.importance * entry.importance;
    samples.push({ entry, score, components: { relevance, recency, importance: entry.importance } });
  }
  samples.sort((a, b) => b.score - a.score);
  return samples.slice(0, Math.max(0, k));
}

function computeRecency(now, timestamp) {
  if (!timestamp) return 1;
  const delta = Math.max(0, now - timestamp);
  return Math.exp(-delta / RECENCY_TIME_CONSTANT);
}

function computeRelevance(entryTokens, querySet) {
  if (!querySet.size) return 0;
  if (!entryTokens || entryTokens.length === 0) return 0;
  const entrySet = new Set(entryTokens);
  let overlap = 0;
  for (const token of entrySet) {
    if (querySet.has(token)) overlap += 1;
  }
  const unionSize = new Set([...entrySet, ...querySet]).size || 1;
  return overlap / unionSize;
}

function tokenize(text) {
  if (!text) return [];
  return (text.toLowerCase().match(TOKEN_REGEX) ?? []).filter(Boolean);
}

function compact(memory) {
  const candidates = memory.entries
    .map((entry, idx) => ({ entry, idx }))
    .filter((pair) => pair.entry)
    .sort((a, b) => (a.entry.importance || 0) - (b.entry.importance || 0))
    .slice(0, 2);
  if (candidates.length < 2) return memory;
  const [first, second] = candidates;
  const merged = {
    id: `${first.entry.id}-merge`,
    observation: `merged: ${first.entry.observation} | ${second.entry.observation}`,
    importance: clamp((first.entry.importance + second.entry.importance) / 2, 0, 1),
    timestamp: second.entry.timestamp,
    tokens: tokenize(`${first.entry.observation} ${second.entry.observation}`)
  };
  const entries = memory.entries.slice();
  entries[first.idx] = merged;
  entries[second.idx] = null;
  const count = Math.max(memory.count - 1, 0);
  return { ...memory, entries, count };
}

if (typeof window !== "undefined" && window.__DEV === true) {
  let testMemory = createMemory(8);
  const seedObservations = [
    "Ana tends the field rows",
    "Bruno shares bread at the cafe",
    "Ana meets Bruno at home",
    "Village council discusses harvest plan",
    "Cafe gossip mentions festival"
  ];
  seedObservations.forEach((text, idx) => {
    testMemory = add(testMemory, text, 0.4 + idx * 0.1, Date.now() - idx * 60000);
  });
  const preview = retrieve(testMemory, "Ana cafe", 3);
  console.log("[memory:self-test]", preview.map((r) => ({ text: r.entry.observation, score: r.score.toFixed(2) })));
}
