import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateV43 } from "./lib/v43-evaluator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = await evaluateV43(root);

assert.ok(report.router.caseCount >= 10);
assert.ok(report.router.topTwoAccuracy >= 0.9);
assert.ok(report.pipeline.caseCount >= 3);
assert.equal(report.pipeline.passed, report.pipeline.caseCount);
assert.equal(report.pipeline.criticalCoverage, 1);
assert.equal(report.pipeline.highAccounting, 1);
assert.equal(report.status, "passed");

console.log("ok: V4.3 evaluator tests passed");
