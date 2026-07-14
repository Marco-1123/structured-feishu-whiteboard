import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { architectureModel } from "./test-v5-scene-planner.mjs";

const runner = new URL("./run-whiteboard-v5.mjs", import.meta.url).pathname;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v5-runner-"));
const validInput = path.join(temp, "architecture.json");
const validOutput = path.join(temp, "valid-output");
fs.writeFileSync(validInput, JSON.stringify(architectureModel));
execFileSync(process.execPath, [runner, "--input", validInput, "--allow-semantic-fixture", "--title", "智能协作能力分层架构", "--output-dir", validOutput, "--skip-whiteboard-cli"]);
const validManifest = JSON.parse(fs.readFileSync(path.join(validOutput, "run-manifest.json"), "utf8"));
assert.equal(validManifest.pipeline, "v5-scene-alpha");
assert.equal(validManifest.status, "rendered-unverified");
assert.equal(JSON.parse(fs.readFileSync(path.join(validOutput, "scene-plan.json"), "utf8")).scene, "layered-architecture");

const lowModel = structuredClone(architectureModel);
lowModel.modelId = "low-confidence";
lowModel.inventoryId = "low-confidence-inventory";
lowModel.scenario.primary = "research-decision";
lowModel.facts = [
  lowModel.facts[0],
  ...lowModel.facts.filter((fact) => fact.id.startsWith("a")).slice(0, 3),
];
lowModel.relationships = [];
lowModel.readingLayers = { first: ["conclusion"], second: lowModel.facts.slice(1).map((fact) => fact.id) };
lowModel.completenessLedger = { selected: lowModel.facts.map((fact) => fact.id), merged: [], downgraded: [], omitted: [] };
const lowInput = path.join(temp, "low.json");
const lowOutput = path.join(temp, "low-output");
fs.writeFileSync(lowInput, JSON.stringify(lowModel));
const failed = spawnSync(process.execPath, [runner, "--input", lowInput, "--allow-semantic-fixture", "--output-dir", lowOutput, "--skip-whiteboard-cli"], { encoding: "utf8" });
assert.notEqual(failed.status, 0);
assert.match(failed.stderr, /use V4\.4 fallback/);
const failedManifest = JSON.parse(fs.readFileSync(path.join(lowOutput, "run-manifest.json"), "utf8"));
assert.equal(failedManifest.status, "failed");
assert.match(failedManifest.error.message, /V5 scene rejected/);

console.log("ok: V5 runner tests passed");
