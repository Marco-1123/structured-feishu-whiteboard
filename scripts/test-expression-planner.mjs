import assert from "node:assert/strict";
import { planExpressions } from "./lib/expression-planner.mjs";

function model(primary, factTypes, relationships = []) {
  const facts = factTypes.map((type, index) => ({ id: `${type}-${index + 1}`, type, text: `${type} ${index + 1}`, importance: index === 0 ? "critical" : "high", sourceRef: `source-${index + 1}`, confidence: "supported" }));
  return { schemaVersion: "1.0", modelId: `model-${primary}`, inventoryId: `inventory-${primary}`, scenario: { primary }, audienceIntent: "quick-understanding", facts, relationships, readingLayers: { first: [facts[0].id], second: facts.slice(1).map((fact) => fact.id) }, completenessLedger: { selected: facts.map((fact) => fact.id), merged: [], downgraded: [], omitted: [] } };
}

const dataReview = planExpressions(model("review-update", ["conclusion", "metric", "metric", "trend", "variance", "cause", "risk", "action"]));
assert.equal(dataReview.candidates.length, 3);
assert.equal(dataReview.candidates[0].narrativeType, "result-driven");
assert.ok(dataReview.candidates[0].componentMix.includes("trend-sparkline"));

const textReview = planExpressions(model("review-update", ["conclusion", "result", "evidence", "cause", "risk", "action"]));
assert.notEqual(textReview.candidates[0].pageSkeleton, dataReview.candidates[0].pageSkeleton);
assert.ok(textReview.candidates[0].componentMix.includes("evidence-list"));

const futureReview = planExpressions(model("review-update", ["conclusion", "result", "stage", "stage", "action", "risk"]));
assert.equal(futureReview.candidates[0].pageSkeleton, "past-future-split");

const research = planExpressions(model("research-decision", ["unresolved", "evidence", "evidence", "option", "option", "conclusion"]));
assert.equal(research.candidates[0].narrativeType, "comparison-driven");
assert.ok(research.candidates[0].componentMix.includes("decision-matrix"));

const product = planExpressions(model("product-capability", ["conclusion", "capability", "capability", "evidence", "stage"]));
assert.equal(product.candidates[0].narrativeType, "hierarchical");
assert.ok(product.candidates[0].componentMix.includes("status-board"));

const flow = planExpressions(model("process-collaboration", ["input", "actor", "action", "constraint", "output"], [{ id: "rel-1", type: "precedes", from: "input-1", to: "action-3" }]));
assert.equal(flow.candidates[0].narrativeType, "flow-driven");
assert.equal(flow.candidates[0].layout, "flow-canvas");

for (const result of [dataReview, textReview, futureReview, research, product, flow]) {
  assert.ok(result.candidates.every((candidate) => candidate.scoreBreakdown.total >= 0));
  assert.ok(result.confidenceEvidence.scoreMargin >= 0);
}

console.log("ok: expression planner tests passed");
