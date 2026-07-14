import assert from "node:assert/strict";
import { validateInventory, verifyCoverage } from "./lib/content-coverage.mjs";

const inventory = {
  inventoryId: "audit-001",
  title: "项目复盘",
  sourceType: "report",
  sourceRef: "inline:test-content-coverage",
  facts: [
    { id: "conclusion-1", type: "conclusion", importance: "critical", text: "主线有效，但风险闭环不足。" },
    { id: "metric-1", type: "metric", importance: "high", text: "目标完成率为 82%。" },
    { id: "risk-1", type: "risk", importance: "high", text: "数据口径尚未统一。" },
    { id: "context-1", type: "context", importance: "low", text: "项目在二季度启动。" },
  ],
};

assert.deepEqual(validateInventory(inventory), []);
assert.ok(validateInventory({ ...inventory, sourceRef: "" }).some((issue) => /sourceRef/.test(issue)));

const valid = verifyCoverage(inventory, {
  inventoryId: "audit-001",
  selectedFactIds: ["conclusion-1", "metric-1"],
  omittedFacts: [{ id: "risk-1", reason: "deferred-to-detail" }],
  routeDecisionId: "route-001",
});
assert.equal(valid.ok, true);
assert.equal(valid.criticalCoverage, 1);
assert.equal(valid.highAccounting, 1);

const missingCritical = verifyCoverage(inventory, {
  inventoryId: "audit-001",
  selectedFactIds: ["metric-1", "risk-1"],
  omittedFacts: [{ id: "conclusion-1", reason: "duplicate" }],
  routeDecisionId: "route-002",
});
assert.equal(missingCritical.ok, false);
assert.match(missingCritical.issues.join(" "), /critical/i);

const missingHigh = verifyCoverage(inventory, {
  inventoryId: "audit-001",
  selectedFactIds: ["conclusion-1"],
  omittedFacts: [],
  routeDecisionId: "route-003",
});
assert.equal(missingHigh.ok, false);
assert.match(missingHigh.issues.join(" "), /metric-1/);
assert.match(missingHigh.issues.join(" "), /risk-1/);

const unknown = verifyCoverage(inventory, {
  inventoryId: "audit-001",
  selectedFactIds: ["conclusion-1", "missing-1"],
  omittedFacts: [{ id: "metric-1", reason: "deferred-to-detail" }, { id: "risk-1", reason: "duplicate" }],
  routeDecisionId: "route-004",
});
assert.equal(unknown.ok, false);
assert.match(unknown.issues.join(" "), /missing-1/);

const duplicateIds = validateInventory({
  ...inventory,
  facts: [...inventory.facts, { ...inventory.facts[0] }],
});
assert.ok(duplicateIds.some((issue) => /Duplicate fact id/.test(issue)));

const invalidRelation = validateInventory({
  ...inventory,
  facts: [{ ...inventory.facts[0], relatedFactIds: ["unknown"] }, ...inventory.facts.slice(1)],
});
assert.ok(invalidRelation.some((issue) => /unknown related fact/.test(issue)));

console.log("ok: content inventory and coverage tests passed");
