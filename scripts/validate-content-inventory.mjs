import fs from "node:fs";
import { validateInventory } from "./lib/content-coverage.mjs";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/validate-content-inventory.mjs <inventory.json>");
  process.exit(1);
}

try {
  const inventory = JSON.parse(fs.readFileSync(input, "utf8"));
  const issues = validateInventory(inventory);
  if (issues.length) throw new Error(issues.join("\n"));
  console.log("ok: content inventory is valid");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
