import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCapabilities } from "../lib/capabilities.mjs";
import { routeInventory } from "../lib/scenario-router.mjs";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = valueAfter("--input") || process.argv[2];
const output = valueAfter("--output");
if (!input) {
  console.error("legacy regression only: node scripts/legacy/route-whiteboard.mjs --input inventory.json [--output route.json]");
  process.exit(1);
}

try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const inventory = JSON.parse(fs.readFileSync(input, "utf8"));
  const decision = routeInventory(inventory, loadCapabilities(root));
  const json = `${JSON.stringify(decision, null, 2)}\n`;
  if (output) fs.writeFileSync(output, json);
  else process.stdout.write(json);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
