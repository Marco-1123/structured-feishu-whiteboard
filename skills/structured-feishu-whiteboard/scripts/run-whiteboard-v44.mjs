import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWhiteboardV44 } from "./lib/v44-pipeline-runner.mjs";
const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const input = option("--input"); const source = option("--source"); const outputDir = option("--output-dir");
if (!input || !outputDir) { console.error("usage: node scripts/run-whiteboard-v44.mjs --source raw-source.md --input inventory.json --output-dir run-dir [--skip-whiteboard-cli]"); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = await runWhiteboardV44({ root, inventoryPath: path.resolve(input), ...(source ? { sourcePath: path.resolve(source) } : {}), outputDir: path.resolve(outputDir), skipWhiteboardCli: args.includes("--skip-whiteboard-cli") });
console.log(`ok: ${manifest.pipeline} ${manifest.status} -> ${outputDir}`);
