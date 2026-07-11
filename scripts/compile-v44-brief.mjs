import fs from "node:fs";
import { compileV44Brief } from "./lib/v44-brief-compiler.mjs";

const args = process.argv.slice(2);
const semantic = args[args.indexOf("--semantic") + 1];
const plans = args[args.indexOf("--plans") + 1];
const output = args[args.indexOf("--output") + 1];
if (!semantic || !plans || !output) {
  console.error("usage: node scripts/compile-v44-brief.mjs --semantic semantic-model.json --plans expression-plans.json --output result.json");
  process.exit(1);
}
const result = compileV44Brief({ semanticModel: JSON.parse(fs.readFileSync(semantic, "utf8")), planningResult: JSON.parse(fs.readFileSync(plans, "utf8")) });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`ok: V4.4 brief decision written to ${output}`);
