import fs from "node:fs";
import { evaluateV44 } from "./lib/v44-evaluator.mjs";
const args = process.argv.slice(2); const input = args[args.indexOf("--input") + 1] || "examples/evals/v44/cases.json"; const output = args[args.indexOf("--output") + 1] || "examples/evals/v44/report.json";
const suite = JSON.parse(fs.readFileSync(input, "utf8")); const report = evaluateV44(suite.cases); fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify(report.summary, null, 2)); if (!report.summary.passed) process.exit(1);
