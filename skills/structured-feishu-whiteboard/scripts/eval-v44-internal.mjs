import fs from "node:fs";
import path from "node:path";
import { evaluateInternalBenchmark } from "./lib/v44-internal-evaluator.mjs";

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const catalogPath = option("--catalog", "examples/evals/v44-internal/source-catalog.json");
const outputRoot = path.resolve(option("--output-root", "examples/evals/v44-internal"));
const reportPath = option("--report", path.join(outputRoot, "report.json"));
if (path.resolve(reportPath) === path.resolve(catalogPath)) {
  throw new Error("--report must not overwrite --catalog");
}
const report = evaluateInternalBenchmark({ catalog: JSON.parse(fs.readFileSync(catalogPath, "utf8")), outputRoot });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
if (!report.summary.passed) process.exit(1);
