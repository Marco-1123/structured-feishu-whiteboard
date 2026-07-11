import fs from "node:fs";
import { planExpressions } from "./lib/expression-planner.mjs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
const output = args[args.indexOf("--output") + 1];
if (!input || !output) {
  console.error("usage: node scripts/plan-expression.mjs --input semantic-model.json --output expression-plans.json");
  process.exit(1);
}
const model = JSON.parse(fs.readFileSync(input, "utf8"));
fs.writeFileSync(output, `${JSON.stringify(planExpressions(model), null, 2)}\n`);
console.log(`ok: expression candidates written to ${output}`);
