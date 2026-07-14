import assert from "node:assert/strict";
import { planExpressions } from "./lib/expression-planner.mjs";

function model(primary, factTypes, relationships = []) {
  const facts = factTypes.map((type, index) => ({ id: `${type}-${index + 1}`, type, text: `${type} ${index + 1}`, importance: index === 0 ? "critical" : "high", sourceRef: `source-${index + 1}`, confidence: "supported" }));
  return { schemaVersion: "1.0", modelId: `model-${primary}`, inventoryId: `inventory-${primary}`, scenario: { primary }, audienceIntent: "quick-understanding", facts, relationships, readingLayers: { first: [facts[0].id], second: facts.slice(1).map((fact) => fact.id) }, completenessLedger: { selected: facts.map((fact) => fact.id), merged: [], downgraded: [], omitted: [] } };
}

const dataReview = planExpressions(model("review-update", ["conclusion", "metric", "metric", "trend", "variance", "cause", "risk", "action"]));
assert.equal(dataReview.candidates.length, 3);
assert.equal(dataReview.candidates[0].narrativeType, "result-driven");
assert.deepEqual(dataReview.candidates[0].componentMix, [...new Set(dataReview.candidates[0].regions.map((region) => region.preferredComponent))], "componentMix must describe components that are actually planned");
assert.ok(dataReview.candidates[0].componentMix.includes("metric-card"));

const textReview = planExpressions(model("review-update", ["conclusion", "result", "evidence", "cause", "risk", "action"]));
assert.notEqual(textReview.candidates[0].pageSkeleton, dataReview.candidates[0].pageSkeleton);
assert.ok(!["evidence-list", "risk-list", "action-list"].every((type) => textReview.candidates[0].componentMix.includes(type)), "singleton evidence, risk and action facts must not automatically become a fixed three-block template");
assert.ok(textReview.candidates[0].regions.some((region) => region.embeddedPurposes?.length), "compatible singleton support facts should be embedded into the narrative structure");

const futureReview = planExpressions(model("review-update", ["conclusion", "result", "stage", "stage", "action", "risk"]));
assert.equal(futureReview.candidates[0].pageSkeleton, "past-future-split");
assert.ok(!futureReview.candidates[0].componentMix.includes("action-list"), "a single next action should be embedded into an existing roadmap instead of repeated as a standalone section");

const research = planExpressions(model("research-decision", ["unresolved", "evidence", "evidence", "option", "option", "conclusion"]));
assert.equal(research.candidates[0].narrativeType, "comparison-driven");
assert.ok(research.candidates[0].componentMix.includes("decision-matrix"));

const sparseComparison = planExpressions(model("research-decision", ["unresolved", "evidence", "option", "risk", "conclusion"]));
assert.ok(!sparseComparison.candidates[0].regions.some((region) => region.preferredComponent === "decision-matrix" && region.factIds.length < 2), "a one-option comparison must not render as a matrix");

const product = planExpressions(model("product-capability", ["conclusion", "capability", "capability", "evidence", "stage"]));
assert.equal(product.candidates[0].narrativeType, "hierarchical");
assert.ok(product.candidates[0].componentMix.includes("status-board"));
assert.ok(!product.candidates[0].componentMix.includes("evidence-list"), "a single supporting fact should be embedded into a compatible capability structure");

const substantiveRisks = planExpressions(model("strategy-proposal", ["conclusion", "evidence", "risk", "risk", "action"]));
assert.ok(substantiveRisks.candidates[0].componentMix.includes("risk-list"), "multiple material risks retain an independent risk region");

const measuredProductModel = model("product-capability", ["conclusion", "capability", "evidence", "evidence", "stage"]);
measuredProductModel.facts[1].visualType = "metric";
measuredProductModel.facts[1].value = "5";
measuredProductModel.facts[2].visualType = "metric";
measuredProductModel.facts[2].value = "3-4h";
const measuredProduct = planExpressions(measuredProductModel);
assert.ok(measuredProduct.candidates[0].regions.some((region) => region.preferredComponent === "metric-card" && region.factIds.length === 2), "product capability metrics must produce a dedicated metric region");

const comparativeProduct = planExpressions(model("product-capability", ["conclusion", "option", "option", "capability", "evidence", "risk"]));
assert.equal(comparativeProduct.candidates[0].narrativeType, "comparison-driven");
assert.equal(comparativeProduct.candidates[0].pageSkeleton, "multi-line-comparison");

const collaborativePlanModel = model("project-plan", ["objective", "stage", "stage", "stage", "risk", "action"]);
collaborativePlanModel.facts[1].actor = "业务团队";
collaborativePlanModel.facts[2].actor = "平台团队";
collaborativePlanModel.facts[3].actor = "业务团队";
collaborativePlanModel.facts[5].actor = "平台团队";
const collaborativePlan = planExpressions(collaborativePlanModel);
assert.equal(collaborativePlan.candidates.find((candidate) => candidate.narrativeType === "flow-driven")?.pageSkeleton, "swimlane");

const decorativeActorsModel = model("project-plan", ["objective", "stage", "stage", "stage", "risk", "action"]);
decorativeActorsModel.facts[1].actor = "业务团队";
decorativeActorsModel.facts[2].actor = "平台团队";
decorativeActorsModel.facts[3].actor = "治理团队";
const decorativeActorsPlan = planExpressions(decorativeActorsModel);
assert.equal(decorativeActorsPlan.candidates.find((candidate) => candidate.narrativeType === "flow-driven")?.pageSkeleton, "timeline", "actor labels alone do not justify tall swimlanes without repeated handoffs");

const flow = planExpressions(model("process-collaboration", ["input", "actor", "action", "constraint", "output"], [{ id: "rel-1", type: "precedes", from: "input-1", to: "action-3" }]));
assert.equal(flow.candidates[0].narrativeType, "flow-driven");
assert.equal(flow.candidates[0].layout, "flow-canvas");

for (const result of [dataReview, textReview, futureReview, research, product, comparativeProduct, collaborativePlan, flow]) {
  assert.ok(result.candidates.every((candidate) => candidate.scoreBreakdown.total >= 0));
  assert.ok(result.confidenceEvidence.scoreMargin >= 0);
  const important = new Set(result === flow ? ["input-1", "actor-2", "action-3", "constraint-4", "output-5"] : []);
  if (important.size) assert.ok(result.candidates.every((candidate) => [...important].every((id) => candidate.regions.some((region) => region.factIds.includes(id)))), "every candidate must account for important facts");
}

console.log("ok: expression planner tests passed");
