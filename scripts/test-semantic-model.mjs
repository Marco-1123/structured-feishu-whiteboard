import assert from "node:assert/strict";
import { normalizeSemanticModel, validateSemanticModel } from "./lib/semantic-model.mjs";

const validModel = {
  schemaVersion: "1.0",
  modelId: "review-q2-001",
  inventoryId: "inventory-q2-001",
  scenario: { primary: "review-update", secondary: "project-plan" },
  audienceIntent: "quick-understanding",
  timeScope: { reviewPeriod: "Q2", currentStage: "阶段收口", planningPeriod: "Q3" },
  facts: [
    { id: "objective-1", type: "objective", text: "完成三条业务主线验证", importance: "critical", sourceRef: "fact-1", confidence: "supported" },
    { id: "result-1", type: "result", text: "两条主线达到目标", importance: "critical", sourceRef: "fact-2", confidence: "supported" },
    { id: "risk-1", type: "risk", text: "数据口径仍不一致", importance: "high", sourceRef: "fact-3", confidence: "supported" },
    { id: "action-1", type: "action", text: "Q3 统一指标字典", importance: "high", sourceRef: "fact-4", confidence: "draft" },
  ],
  relationships: [
    { id: "rel-1", type: "contrasts", from: "objective-1", to: "result-1" },
    { id: "rel-2", type: "mitigates", from: "action-1", to: "risk-1" },
  ],
  readingLayers: { first: ["result-1", "objective-1"], second: ["risk-1", "action-1"] },
  completenessLedger: {
    selected: ["objective-1", "result-1", "risk-1", "action-1"],
    merged: [],
    downgraded: [],
    omitted: [],
  },
};

assert.deepEqual(validateSemanticModel(validModel), []);
assert.deepEqual(normalizeSemanticModel(validModel), validModel);

const unknownRelation = structuredClone(validModel);
unknownRelation.relationships[0].to = "missing";
assert.match(validateSemanticModel(unknownRelation).join(" "), /unknown fact/i);

const missingSource = structuredClone(validModel);
delete missingSource.facts[0].sourceRef;
assert.match(validateSemanticModel(missingSource).join(" "), /sourceRef/i);

const unsupportedScenario = structuredClone(validModel);
unsupportedScenario.scenario.primary = "generic-dashboard";
assert.match(validateSemanticModel(unsupportedScenario).join(" "), /scenario/i);

const fabricated = structuredClone(validModel);
fabricated.facts[0].confidence = "fabricated";
assert.match(validateSemanticModel(fabricated).join(" "), /confidence/i);

const missingCriticalLayer = structuredClone(validModel);
missingCriticalLayer.readingLayers.first = ["result-1"];
missingCriticalLayer.readingLayers.second = ["risk-1", "action-1"];
assert.match(validateSemanticModel(missingCriticalLayer).join(" "), /critical fact objective-1/i);

const unaccounted = structuredClone(validModel);
unaccounted.completenessLedger.selected = ["objective-1", "result-1", "action-1"];
assert.match(validateSemanticModel(unaccounted).join(" "), /risk-1.*unaccounted/i);

console.log("ok: semantic model tests passed");
