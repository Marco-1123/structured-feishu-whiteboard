import fs from "node:fs";
import { compileSemanticModel } from "./lib/semantic-compiler.mjs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
const output = args[args.indexOf("--output") + 1];
if (!input || !output) {
  console.error("usage: node scripts/compile-semantic-model.mjs --input inventory.json --output semantic-model.json");
  process.exit(1);
}

try {
  const inventory = JSON.parse(fs.readFileSync(input, "utf8"));
  fs.writeFileSync(output, `${JSON.stringify(compileSemanticModel({ inventory }), null, 2)}\n`);
  console.log(`ok: semantic model written to ${output}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
