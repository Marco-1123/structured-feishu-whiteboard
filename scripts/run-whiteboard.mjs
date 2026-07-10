import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWhiteboard } from "./lib/pipeline-runner.mjs";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inventoryPath = valueAfter("--inventory");
const routePath = valueAfter("--route");
const briefPath = valueAfter("--brief");
const outputDir = valueAfter("--output-dir");
const skipWhiteboardCli = process.argv.includes("--skip-whiteboard-cli");
if (!inventoryPath || !routePath || !briefPath || !outputDir) {
  console.error("usage: node scripts/run-whiteboard.mjs --inventory inventory.json --route route.json --brief brief.json --output-dir output [--skip-whiteboard-cli]");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const manifest = await runWhiteboard({ root, inventoryPath, routePath, briefPath, outputDir, skipWhiteboardCli });
  console.log(`ok: V4.3 run ${manifest.status}; manifest ${path.join(outputDir, "run-manifest.json")}`);
} catch (error) {
  console.error(`${error.message}\nmanifest: ${error.manifestPath || path.join(outputDir, "run-manifest.json")}`);
  process.exit(1);
}
