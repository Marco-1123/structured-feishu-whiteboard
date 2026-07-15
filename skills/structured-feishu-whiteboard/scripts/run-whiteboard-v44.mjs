import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const mapped = args.map((arg) => arg === "--input" ? "--inventory" : arg);
const runner = path.join(path.dirname(fileURLToPath(import.meta.url)), "run-structured-whiteboard.mjs");
console.error("deprecated entry redirected to scripts/run-structured-whiteboard.mjs");
const result = spawnSync(process.execPath, [runner, ...mapped], { stdio: "inherit" });
process.exit(result.status ?? 1);
