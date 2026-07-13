import fs from "node:fs";
import path from "node:path";
import { evaluateInternalBenchmark } from "./lib/v44-internal-evaluator.mjs";

const args = process.argv.slice(2);
const catalogPath = args[args.indexOf("--catalog") + 1] || "examples/evals/v44-internal/source-catalog.json";
const outputRoot = path.resolve(args[args.indexOf("--output-root") + 1] || "examples/evals/v44-internal");
const reportPath = args[args.indexOf("--report") + 1] || path.join(outputRoot, "report.json");
const report = evaluateInternalBenchmark({ catalog: JSON.parse(fs.readFileSync(catalogPath, "utf8")), outputRoot });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
if (!report.summary.passed) process.exit(1);
