import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateV43 } from "./lib/v43-evaluator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = await evaluateV43(root);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "passed") process.exit(1);
