import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve("snapshots");
try {
  const files = await readdir(dir);
  if (!files.length) {
    console.log("no snapshots yet");
    process.exit(0);
  }
  for (const file of files) {
    const info = await stat(path.join(dir, file));
    console.log(`${file}\t${(info.size / 1024).toFixed(1)}kb`);
  }
} catch (error) {
  console.error("snapshots directory missing", error.message);
  process.exit(1);
}
