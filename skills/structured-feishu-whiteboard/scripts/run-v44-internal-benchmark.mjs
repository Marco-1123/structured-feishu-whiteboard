import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBenchmarkCases } from "./lib/v44-benchmark-builder.mjs";
import { runWhiteboardV44 } from "./lib/v44-pipeline-runner.mjs";

const args = process.argv.slice(2);
function optionValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : fallback;
}
const catalogPath = optionValue("--catalog", "examples/evals/v44-internal/source-catalog.json");
const outputRoot = path.resolve(optionValue("--output", "examples/evals/v44-internal"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const cases = buildBenchmarkCases(catalog, outputRoot);
const results = [];
for (const testCase of cases) {
  try {
    const manifest = await runWhiteboardV44({ root, inventoryPath: path.join(testCase.caseDir, "inventory.json"), outputDir: testCase.caseDir, skipWhiteboardCli: args.includes("--skip-whiteboard-cli"), allowFixtureSource: true });
    results.push({ caseId: testCase.caseId, status: "passed", pipeline: manifest.pipeline });
    console.log(`ok: ${testCase.caseId}`);
  } catch (error) {
    results.push({ caseId: testCase.caseId, status: "failed", error: error.message });
    console.error(`failed: ${testCase.caseId}: ${error.message}`);
  }
}
fs.writeFileSync(path.join(outputRoot, "run-summary.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
if (results.some((result) => result.status === "failed")) process.exit(1);
console.log(`ok: ran ${results.length} V4.4 internal benchmark cases`);
