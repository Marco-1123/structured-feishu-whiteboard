import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWhiteboard } from "./lib/pipeline-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "examples/evals/v43/dashboard");

async function runCase(name, mutateBrief) {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `v43-${name}-`));
  const brief = JSON.parse(fs.readFileSync(path.join(fixture, "brief.json"), "utf8"));
  if (mutateBrief) mutateBrief(brief);
  const briefPath = path.join(outputDir, "brief.json");
  fs.writeFileSync(briefPath, `${JSON.stringify(brief, null, 2)}\n`);
  return {
    outputDir,
    execute: () => runWhiteboard({
      root,
      inventoryPath: path.join(fixture, "inventory.json"),
      routePath: path.join(fixture, "route.json"),
      briefPath,
      outputDir,
      skipWhiteboardCli: true,
    }),
  };
}

const success = await runCase("success");
const result = await success.execute();
assert.equal(result.status, "passed");
assert.ok(fs.existsSync(path.join(success.outputDir, "whiteboard.svg")));
assert.ok(fs.existsSync(path.join(success.outputDir, "run-manifest.json")));
const manifest = JSON.parse(fs.readFileSync(path.join(success.outputDir, "run-manifest.json"), "utf8"));
assert.equal(manifest.status, "passed");
assert.equal(manifest.version, fs.readFileSync(path.join(root, "VERSION"), "utf8").trim());
assert.equal(manifest.coverage.criticalCoverage, 1);
assert.equal(manifest.coverage.highAccounting, 1);
assert.equal(manifest.route.decisionId, "route-v43-dashboard");
assert.equal(manifest.capability.capabilityId, "v4-svg");
assert.ok(manifest.hashes.output);

const missingCritical = await runCase("missing-critical", (brief) => {
  brief.planning.selectedFactIds = brief.planning.selectedFactIds.filter((id) => id !== "conclusion-1");
  brief.planning.omittedFacts.push({ id: "conclusion-1", reason: "duplicate" });
});
await assert.rejects(missingCritical.execute, /Critical fact/);
const failedCoverage = JSON.parse(fs.readFileSync(path.join(missingCritical.outputDir, "run-manifest.json"), "utf8"));
assert.equal(failedCoverage.status, "failed");

const unsupported = await runCase("unsupported-style", (brief) => {
  brief.style = "apple-studio";
});
await assert.rejects(unsupported.execute, /apple-studio/);
const failedCapability = JSON.parse(fs.readFileSync(path.join(unsupported.outputDir, "run-manifest.json"), "utf8"));
assert.equal(failedCapability.status, "failed");

console.log("ok: replayable V4.3 runner tests passed");
