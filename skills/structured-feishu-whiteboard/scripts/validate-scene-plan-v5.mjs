import fs from "node:fs";
import { validateScenePlanV5 } from "./lib/v5-scene-validation.mjs";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/validate-scene-plan-v5.mjs <scene-plan.json>");
  process.exit(1);
}

try {
  const plan = JSON.parse(fs.readFileSync(input, "utf8"));
  if (plan.selected !== undefined) throw new Error("expected pure scene-plan.json; validate scene-decision.json separately");
  const issues = validateScenePlanV5(plan);
  if (issues.length) throw new Error(issues.join("\n"));
  console.log("ok: V5 scene plan is valid");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
