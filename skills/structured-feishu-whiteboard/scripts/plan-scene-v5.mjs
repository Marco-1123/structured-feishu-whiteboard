import fs from "node:fs";
import { planSceneV5 } from "./lib/v5-scene-planner.mjs";

const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const input = value("--input");
const decisionOutput = value("--decision-output");
const planOutput = value("--plan-output");
const title = value("--title");
const style = value("--style") || "linear-system";

if (!input || !decisionOutput) {
  console.error("usage: node scripts/plan-scene-v5.mjs --input semantic-model.json --decision-output scene-decision.json [--plan-output scene-plan.json] [--title title] [--style linear-system]");
  process.exit(1);
}

const result = planSceneV5(JSON.parse(fs.readFileSync(input, "utf8")), { style, title });
fs.writeFileSync(decisionOutput, `${JSON.stringify(result, null, 2)}\n`);
if (planOutput && result.selected) fs.writeFileSync(planOutput, `${JSON.stringify(result.selected, null, 2)}\n`);
if (!result.selected) process.exitCode = 2;
