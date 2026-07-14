import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { planSceneV5 } from "./lib/v5-scene-planner.mjs";
import { validateSemanticModel } from "./lib/semantic-model.mjs";
import { compileSemanticModel } from "./lib/semantic-compiler.mjs";
import { auditSourceExtraction } from "./lib/source-audit.mjs";

const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const input = option("--input");
const inventoryPath = option("--inventory");
const sourcePath = option("--source");
const outputDir = option("--output-dir");
const title = option("--title");
const style = option("--style") || "linear-system";
const skipWhiteboardCli = args.includes("--skip-whiteboard-cli");
const allowSemanticFixture = args.includes("--allow-semantic-fixture");
if (!outputDir || (!input && !(inventoryPath && sourcePath))) {
  console.error("usage: node scripts/run-whiteboard-v5.mjs --source raw-source.md --inventory inventory.json --output-dir run-dir [--title title] [--style style]\n       test only: --input semantic-model.json --allow-semantic-fixture");
  process.exit(1);
}
if (input && !allowSemanticFixture) {
  console.error("direct semantic-model input is test-only; add --allow-semantic-fixture or provide --source and --inventory");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(outputDir);
fs.mkdirSync(out, { recursive: true });
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "command failed").trim());
};

const manifest = {
  schemaVersion: 1,
  pipeline: "v5-scene-alpha",
  version: "5.0.0-alpha.1",
  status: "running",
  startedAt: new Date().toISOString(),
  inputs: {
    ...(input ? { semanticModel: path.resolve(input) } : {}),
    ...(inventoryPath ? { inventory: path.resolve(inventoryPath) } : {}),
    ...(sourcePath ? { source: path.resolve(sourcePath) } : {}),
    style,
    ...(title ? { title } : {}),
  },
  checks: [],
  outputs: {},
};
const manifestPath = path.join(out, "run-manifest.json");
try {
  let model;
  let resolvedTitle = title;
  if (input) {
    model = readJson(input);
    manifest.checks.push({ name: "source-extraction-coverage", status: "fixture-skipped" });
  } else {
    run(process.execPath, [path.join(root, "scripts/validate-content-inventory.mjs"), path.resolve(inventoryPath)]);
    const inventory = readJson(inventoryPath);
    const sourceAudit = auditSourceExtraction({ sourceText: fs.readFileSync(sourcePath, "utf8"), inventory });
    const sourceAuditPath = path.join(out, "source-audit.json");
    writeJson(sourceAuditPath, sourceAudit);
    manifest.outputs.sourceAudit = sourceAuditPath;
    if (!sourceAudit.ok) throw new Error(`V5 source extraction coverage failed: ${sourceAudit.issues.join("; ")}`);
    manifest.checks.push({ name: "source-extraction-coverage", status: "passed" });
    model = compileSemanticModel({ inventory });
    resolvedTitle ||= inventory.title;
    const semanticPath = path.join(out, "semantic-model.json");
    writeJson(semanticPath, model);
    manifest.outputs.semanticModel = semanticPath;
  }
  const semanticIssues = validateSemanticModel(model);
  if (semanticIssues.length) throw new Error(`semantic model invalid: ${semanticIssues.join("; ")}`);
  manifest.checks.push({ name: "semantic-model", status: "passed" });

  const decision = planSceneV5(model, { style, title: resolvedTitle });
  const decisionPath = path.join(out, "scene-decision.json");
  writeJson(decisionPath, decision);
  manifest.outputs.sceneDecision = decisionPath;
  manifest.decision = { confidence: decision.confidence, candidates: decision.candidates, coverage: decision.coverage };
  if (!decision.selected) throw new Error(`V5 scene rejected; use V4.4 fallback: ${decision.confidence.reasons.join("; ")}`);
  manifest.checks.push({ name: "scene-confidence-and-coverage", status: "passed" });

  const planPath = path.join(out, "scene-plan.json");
  writeJson(planPath, decision.selected);
  run(process.execPath, [path.join(root, "scripts/validate-scene-plan-v5.mjs"), planPath]);
  manifest.checks.push({ name: "scene-plan", status: "passed" });

  const svgPath = path.join(out, "whiteboard.svg");
  run(process.execPath, [path.join(root, "scripts/render-whiteboard-v5.mjs"), "--input", planPath, "--output", svgPath]);
  run(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), svgPath]);
  manifest.checks.push({ name: "svg-layout", status: "passed" });
  manifest.outputs.scenePlan = planPath;
  manifest.outputs.whiteboard = svgPath;

  if (skipWhiteboardCli) {
    manifest.checks.push({ name: "feishu-svg-import", status: "skipped" });
    manifest.status = "rendered-unverified";
  } else {
    const pngPath = path.join(out, "whiteboard.png");
    run("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", svgPath, "-o", pngPath, "-f", "svg"]);
    run("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", svgPath, "-f", "svg", "--check"]);
    manifest.checks.push({ name: "feishu-svg-import", status: "passed" });
    manifest.outputs.preview = pngPath;
    manifest.status = "passed";
  }
} catch (error) {
  manifest.status = "failed";
  manifest.error = { message: error.message };
}
manifest.finishedAt = new Date().toISOString();
writeJson(manifestPath, manifest);
if (manifest.status === "failed") {
  console.error(manifest.error.message);
  process.exit(1);
}
console.log(`ok: ${manifest.pipeline} ${manifest.status} -> ${out}`);
