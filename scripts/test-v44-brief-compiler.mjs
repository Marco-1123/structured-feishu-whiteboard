import assert from "node:assert/strict";
import { compileV44Brief, decideConfidence } from "./lib/v44-brief-compiler.mjs";

const semanticModel = {
  schemaVersion: "1.0", modelId: "semantic-review", inventoryId: "review-1",
  scenario: { primary: "review-update" }, audienceIntent: "quick-understanding",
  facts: [
    { id: "conclusion-1", type: "conclusion", text: "Q2 主线整体达到预期", importance: "critical", sourceRef: "conclusion-1", confidence: "supported" },
    { id: "metric-1", type: "metric", text: "目标完成率 82%", value: "82%", importance: "high", sourceRef: "metric-1", confidence: "supported" },
    { id: "risk-1", type: "risk", text: "数据口径仍需统一", importance: "high", sourceRef: "risk-1", confidence: "supported" },
    { id: "action-1", type: "action", text: "Q3 统一指标字典", importance: "high", sourceRef: "action-1", confidence: "draft" },
  ], relationships: [], readingLayers: { first: ["conclusion-1", "metric-1"], second: ["risk-1", "action-1"] }, completenessLedger: { selected: ["conclusion-1", "metric-1", "risk-1", "action-1"], merged: [], downgraded: [], omitted: [] },
};

function candidate(id, total, narrativeType = "result-driven") {
  return { planId: id, scenario: "review-update", narrativeType, pageSkeleton: "overview-detail", layout: "expression-canvas", regions: [
    { id: "r1", purpose: "conclusion", factIds: ["conclusion-1"], preferredComponent: "statement", visualPriority: "primary", widthIntent: "full" },
    { id: "r2", purpose: "metric", factIds: ["metric-1"], preferredComponent: "metric-card", visualPriority: "secondary", widthIntent: "adaptive" },
    { id: "r3", purpose: "risk", factIds: ["risk-1"], preferredComponent: "risk-list", visualPriority: "secondary", widthIntent: "adaptive" },
    { id: "r4", purpose: "action", factIds: ["action-1"], preferredComponent: "action-list", visualPriority: "secondary", widthIntent: "adaptive" },
  ], componentMix: ["statement", "metric-card", "risk-list", "action-list"], fallbackLayout: "large-canvas", scoreBreakdown: { total, criticalCoverage: 1, highCoverage: 1, semanticMatch: 1, coherence: 1, rendererCompatibility: 1 } };
}

assert.equal(decideConfidence({ candidates: [candidate("a", 92), candidate("b", 76)], confidenceEvidence: { scoreMargin: 16, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }).level, "high");
assert.equal(decideConfidence({ candidates: [candidate("a", 76), candidate("b", 70)], confidenceEvidence: { scoreMargin: 6, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }).level, "medium");
assert.equal(decideConfidence({ candidates: [candidate("a", 54), candidate("b", 52)], confidenceEvidence: { scoreMargin: 2, missingRequiredSignals: ["action"], unsupportedInferenceCount: 1 } }).level, "low");

const compiled = compileV44Brief({ semanticModel, planningResult: { candidates: [candidate("a", 92), candidate("b", 76)], confidenceEvidence: { scoreMargin: 16, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }, style: "linear-system", title: "Q2 阶段复盘" });
assert.equal(compiled.brief.pipelineVersion, "4.4");
assert.equal(compiled.brief.layout, "expression-canvas");
assert.equal(compiled.brief.engine, "v4");
assert.equal(compiled.decision.level, "high");
assert.deepEqual(compiled.brief.planning.selectedFactIds.sort(), semanticModel.facts.map((fact) => fact.id).sort());
assert.ok(compiled.brief.expressionBlocks.some((block) => block.type === "metric-card"));

const low = compileV44Brief({ semanticModel, planningResult: { candidates: [candidate("a", 54), candidate("b", 52)], confidenceEvidence: { scoreMargin: 2, missingRequiredSignals: ["action"], unsupportedInferenceCount: 1 } }, style: "linear-system", title: "混合材料" });
assert.equal(low.decision.level, "low");
assert.equal(low.requiresUserChoice, true);
assert.equal(low.fallback.version, "4.3");

console.log("ok: V4.4 brief compiler tests passed");
