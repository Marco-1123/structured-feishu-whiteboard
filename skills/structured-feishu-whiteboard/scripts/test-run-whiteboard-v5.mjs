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
assert.match(failed.stderr, /production would fall back to V4\.4/);
const failedManifest = JSON.parse(fs.readFileSync(path.join(lowOutput, "run-manifest.json"), "utf8"));
assert.equal(failedManifest.status, "failed");
assert.match(failedManifest.error.message, /V5 fixture scene rejected/);

const fallbackSource = path.join(temp, "fallback-source.md");
const fallbackInventory = path.join(temp, "fallback-inventory.json");
const fallbackOutput = path.join(temp, "fallback-output");
fs.writeFileSync(fallbackSource, "建议从高价值场景切入。重点客户更关注效率和稳定性。资源投入与回报周期存在不确定性。下一阶段先完成小范围试点。预算和人力必须控制在现有范围。\n");
fs.writeFileSync(fallbackInventory, JSON.stringify({
  inventoryId: "v5-fallback",
  title: "业务增长策略建议",
  sourceType: "report",
  sourceRef: "inline:test-v5-fallback",
  facts: [
    { id: "c1", type: "conclusion", importance: "critical", text: "建议从高价值场景切入", sourceQuote: "建议从高价值场景切入" },
    { id: "e1", type: "evidence", importance: "high", text: "重点客户更关注效率和稳定性", sourceQuote: "重点客户更关注效率和稳定性" },
    { id: "r1", type: "risk", importance: "high", text: "资源投入与回报周期存在不确定性", sourceQuote: "资源投入与回报周期存在不确定性" },
    { id: "a1", type: "action", importance: "high", text: "下一阶段先完成小范围试点", sourceQuote: "下一阶段先完成小范围试点" },
    { id: "x1", type: "constraint", importance: "medium", text: "预算和人力必须控制在现有范围", sourceQuote: "预算和人力必须控制在现有范围" },
  ],
}, null, 2));
execFileSync(process.execPath, [runner, "--source", fallbackSource, "--inventory", fallbackInventory, "--output-dir", fallbackOutput, "--skip-whiteboard-cli"]);
const fallbackManifest = JSON.parse(fs.readFileSync(path.join(fallbackOutput, "run-manifest.json"), "utf8"));
assert.equal(fallbackManifest.status, "fallback-rendered-unverified");
assert.equal(fallbackManifest.fallback.pipeline, "v4.4");
assert.ok(fs.existsSync(path.join(fallbackOutput, "v44-fallback", "run-manifest.json")));
assert.ok(fs.existsSync(fallbackManifest.outputs.whiteboard));

console.log("ok: V5 runner tests passed");
