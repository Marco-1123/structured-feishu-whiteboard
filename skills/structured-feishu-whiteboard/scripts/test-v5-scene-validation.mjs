import assert from "node:assert/strict";
import { planSceneV5 } from "./lib/v5-scene-planner.mjs";
import { validateScenePlanV5 } from "./lib/v5-scene-validation.mjs";
import { architectureModel } from "./test-v5-scene-planner.mjs";
import { decisionModel, evidenceModel } from "./test-v5-scene-planner.mjs";

const valid = planSceneV5(architectureModel, { title: "智能协作能力分层架构" }).selected;
assert.deepEqual(validateScenePlanV5(valid), []);

const invalid = {
  ...valid,
  title: "x".repeat(81),
  unknownField: true,
  confidence: undefined,
  sourceFactIds: [],
};
const issues = validateScenePlanV5(invalid);
assert.ok(issues.some((issue) => issue.includes("unknown scene plan field")));
assert.ok(issues.some((issue) => issue.includes("title exceeds")));
assert.ok(issues.some((issue) => issue.includes("confidence.level")));
assert.ok(issues.some((issue) => issue.includes("sourceFactIds")));

const missingBelongs = structuredClone(architectureModel);
missingBelongs.relationships = missingBelongs.relationships.filter((edge) => edge.type !== "belongs-to");
assert.equal(planSceneV5(missingBelongs).selected, null);

const fakeLoop = structuredClone(architectureModel);
fakeLoop.scenario.primary = "strategy-proposal";
fakeLoop.relationships = [
  { id: "l1", type: "supports", from: "a1", to: "a2" },
  { id: "l2", type: "supports", from: "a2", to: "b1" },
  { id: "l3", type: "supports", from: "b1", to: "b2" },
  { id: "l4", type: "supports", from: "b2", to: "a1" },
];
assert.equal(planSceneV5(fakeLoop).selected, null);

const oneSidedDecision = structuredClone(decisionModel);
oneSidedDecision.relationships = oneSidedDecision.relationships.filter((edge) => edge.to === "optionA");
assert.equal(planSceneV5(oneSidedDecision).selected, null, "comparison requires relationships for at least two options");

const indirectEvidence = structuredClone(evidenceModel);
indirectEvidence.relationships = [
  { id: "i1", type: "supports", from: "e1", to: "e2" },
  { id: "i2", type: "causes", from: "e2", to: "e3" },
  { id: "i3", type: "supports", from: "e3", to: "e4" },
];
assert.equal(planSceneV5(indirectEvidence).selected, null, "argument map must not invent evidence-to-thesis links");

console.log("ok: V5 scene validation and hard-qualification tests passed");
