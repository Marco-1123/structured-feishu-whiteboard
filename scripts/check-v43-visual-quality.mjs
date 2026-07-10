import fs from "node:fs";
import { inspectV43VisualQuality } from "./lib/v43-visual-quality.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-v43-visual-quality.mjs diagram.svg");
  process.exit(1);
}

const result = inspectV43VisualQuality(fs.readFileSync(file, "utf8"));
if (!result.ok) {
  console.error(result.issues.join("\n"));
  process.exit(1);
}
console.log(`ok: V4.3 visual quality passed (${JSON.stringify(result.metrics)})`);
