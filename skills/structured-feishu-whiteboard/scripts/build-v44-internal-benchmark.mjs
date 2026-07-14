import fs from "node:fs";
import path from "node:path";
import { buildBenchmarkCases } from "./lib/v44-benchmark-builder.mjs";
import { validateSourceCatalog } from "./validate-v44-source-catalog.mjs";

const args = process.argv.slice(2);
const catalogPath = args[args.indexOf("--catalog") + 1] || "examples/evals/v44-internal/source-catalog.json";
const outputRoot = args[args.indexOf("--output") + 1] || "examples/evals/v44-internal";
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const issues = validateSourceCatalog(catalog);
if (issues.length) { console.error(issues.join("\n")); process.exit(1); }
const outputs = buildBenchmarkCases(catalog, path.resolve(outputRoot));
console.log(`ok: built ${outputs.length} V4.4 internal benchmark inventories`);
