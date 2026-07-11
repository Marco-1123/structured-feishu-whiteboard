import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWhiteboardV44 } from "./lib/v44-pipeline-runner.mjs";
const args = process.argv.slice(2); const input = args[args.indexOf("--input") + 1]; const outputDir = args[args.indexOf("--output-dir") + 1];
if (!input || !outputDir) { console.error("usage: node scripts/run-whiteboard-v44.mjs --input inventory.json --output-dir run-dir [--skip-whiteboard-cli]"); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = await runWhiteboardV44({ root, inventoryPath: path.resolve(input), outputDir: path.resolve(outputDir), skipWhiteboardCli: args.includes("--skip-whiteboard-cli") });
console.log(`ok: ${manifest.pipeline} ${manifest.status} -> ${outputDir}`);
