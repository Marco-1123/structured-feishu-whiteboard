import fs from "node:fs";
import { validateSemanticModel } from "./lib/semantic-model.mjs";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/validate-semantic-model.mjs <semantic-model.json>");
  process.exit(1);
}

try {
  const model = JSON.parse(fs.readFileSync(input, "utf8"));
  const issues = validateSemanticModel(model);
  if (issues.length) throw new Error(issues.join("\n"));
  console.log("ok: semantic model is valid");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
