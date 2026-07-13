import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyFailure, evaluateInternalBenchmark } from "./lib/v44-internal-evaluator.mjs";

assert.equal(classifyFailure("V4.4 critical coverage failed: m1"), "fact-selection");
assert.equal(classifyFailure("invalid brief: decision-matrix requires at least 2 items"), "expression-planning");
assert.equal(classifyFailure("text likely exceeds parent rect"), "layout-engine");
assert.equal(classifyFailure("whiteboard conversion failed"), "feishu-conversion");
assert.equal(classifyFailure("scenario mismatch"), "semantic-classification");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v44-evaluator-"));
const caseDir = path.join(outputRoot, "cases", "all-important-facts");
fs.mkdirSync(caseDir, { recursive: true });
fs.writeFileSync(path.join(caseDir, "semantic-model.json"), JSON.stringify({ scenario: { primary: "review-update" } }));
fs.writeFileSync(path.join(caseDir, "decision.json"), JSON.stringify({ selectedPlanId: "plan-1" }));
fs.writeFileSync(path.join(caseDir, "expression-plans.json"), JSON.stringify({ candidates: [{ planId: "plan-1", pageSkeleton: "overview-detail" }] }));
fs.writeFileSync(path.join(caseDir, "brief.json"), JSON.stringify({ planning: { selectedFactIds: ["c1", "m1"] }, expressionBlocks: [] }));
fs.writeFileSync(path.join(caseDir, "run-manifest.json"), JSON.stringify({ pipeline: "v4.4", status: "passed" }));
fs.writeFileSync(path.join(caseDir, "whiteboard.svg"), '<svg><text>核心判断完整可见</text></svg>');
const coverageAudit = evaluateInternalBenchmark({
  catalog: { cases: [{
    id: "all-important-facts",
    stress: true,
    expected: { scenario: "review-update", requiredFactIds: ["c1"] },
    facts: [
      { id: "c1", text: "核心判断完整可见", importance: "critical" },
      { id: "m1", text: "高重要度指标也必须完整可见", importance: "high" },
    ],
  }] },
  outputRoot,
});
assert.equal(coverageAudit.summary.visibleFactCoverage, 0.5, "all critical/high facts must count toward visible coverage");
fs.rmSync(outputRoot, { recursive: true, force: true });
console.log("ok: V4.4 internal evaluator tests passed");
