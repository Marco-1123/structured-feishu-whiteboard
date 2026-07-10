import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCapabilities } from "./lib/capabilities.mjs";
import { routeInventory } from "./lib/scenario-router.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = loadCapabilities(root);
const cases = JSON.parse(fs.readFileSync(path.join(root, "examples/evals/v43/router-cases.json"), "utf8"));
let topTwoHits = 0;

for (const testCase of cases) {
  const decision = routeInventory(testCase.inventory, registry);
  assert.ok(decision.decisionId.startsWith("route-"));
  assert.ok(decision.candidates.length >= 2, `${testCase.id}: expected multiple candidates`);
  assert.ok(["high", "medium", "low"].includes(decision.confidence));
  assert.ok(decision.fallback?.layout);
  for (const candidate of decision.candidates) {
    assert.ok(candidate.reasons.length > 0, `${testCase.id}: candidate needs reasons`);
    assert.ok(candidate.score >= 0 && candidate.score <= 1);
  }
  const topTwo = decision.candidates.slice(0, 2).map((candidate) => (
    `${candidate.layout}${candidate.mode ? `:${candidate.mode}` : ""}`
  ));
  if (testCase.expectedTopTwo.some((expected) => topTwo.includes(expected))) topTwoHits += 1;
  else assert.fail(`${testCase.id}: expected one of ${testCase.expectedTopTwo.join(", ")} in ${topTwo.join(", ")}`);
}

const accuracy = topTwoHits / cases.length;
assert.ok(accuracy >= 0.9, `top-two route accuracy ${accuracy} is below 0.9`);

console.log(`ok: scenario router tests passed (${topTwoHits}/${cases.length} top-two)`);
