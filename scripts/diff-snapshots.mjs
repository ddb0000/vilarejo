import { readFile } from "node:fs/promises";
import path from "node:path";

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error("usage: node scripts/diff-snapshots.mjs <a.json> <b.json>");
  process.exit(1);
}
const load = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [snapA, snapB] = await Promise.all([load(fileA), load(fileB)]);
const diffs = [];
const len = Math.max(snapA.agents?.length || 0, snapB.agents?.length || 0);
for (let i = 0; i < len; i += 1) {
  const a = snapA.agents?.[i];
  const b = snapB.agents?.[i];
  if (!a || !b) continue;
  if (a.pos.x !== b.pos.x || a.pos.y !== b.pos.y) {
    diffs.push(`${a.name} position ${a.pos.x},${a.pos.y} -> ${b.pos.x},${b.pos.y}`);
  }
  const needDiffs = Object.keys(a.needs || {}).filter((key) => Math.abs((a.needs[key] || 0) - (b.needs?.[key] || 0)) > 0.05);
  if (needDiffs.length) {
    diffs.push(`${a.name} needs changed: ${needDiffs.join(", ")}`);
  }
}
if (!diffs.length) {
  console.log("snapshots roughly match");
} else {
  diffs.forEach((line) => console.log(line));
}
