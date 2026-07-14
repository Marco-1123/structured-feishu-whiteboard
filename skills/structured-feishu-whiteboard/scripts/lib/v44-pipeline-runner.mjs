import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compileSemanticModel } from "./semantic-compiler.mjs";
import { planExpressions } from "./expression-planner.mjs";
import { compileV44Brief } from "./v44-brief-compiler.mjs";
import { currentCommit, hashFile } from "./run-manifest.mjs";
import { auditSourceExtraction } from "./source-audit.mjs";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
function run(command, args, cwd) { const result = spawnSync(command, args, { cwd, encoding: "utf8" }); if (result.status !== 0) throw new Error((result.stderr || result.stdout || "command failed").trim()); return (result.stdout || "").trim(); }

export async function runWhiteboardV44({ root, inventoryPath, sourcePath, outputDir, style = "linear-system", hints = {}, skipWhiteboardCli = false, allowFixtureSource = false, versionOverride }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const inventory = readJson(inventoryPath);
  if (!String(inventory.sourceRef || "").trim()) {
    throw new Error("V4.4 production inventory requires sourceRef so cross-Agent output remains auditable");
  }
  const version = versionOverride || fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
  if (!sourcePath && !allowFixtureSource) {
    throw new Error("V4.4 production run requires --source <raw-source.md>; inventory coverage alone cannot prove source extraction completeness");
  }
  if (allowFixtureSource && !String(inventory.sourceRef || "").startsWith("fixture:")) {
    throw new Error("allowFixtureSource is test-only and requires a registered fixture: sourceRef");
  }
  if (sourcePath && !fs.existsSync(sourcePath)) throw new Error(`source snapshot not found: ${sourcePath}`);
  const rendererPath = path.join(root, "scripts/render-whiteboard-v4.mjs");
  const manifest = {
    schemaVersion: 2,
    pipeline: "v4.4",
    version,
    gitCommit: currentCommit(root),
    status: "running",
    startedAt: new Date().toISOString(),
    runtime: { node: process.version, whiteboardCli: "0.2.12" },
    inputs: { inventoryPath: path.resolve(inventoryPath), ...(sourcePath ? { sourcePath: path.resolve(sourcePath) } : {}), style, hints },
    hashes: { inventory: hashFile(inventoryPath), ...(sourcePath ? { source: hashFile(sourcePath) } : {}), renderer: hashFile(rendererPath) },
    checks: [],
    outputs: {},
  };
  const manifestPath = path.join(outputDir, "run-manifest.json"); writeJson(manifestPath, manifest);
  try {
    run(process.execPath, [path.join(root, "scripts/validate-content-inventory.mjs"), inventoryPath], root);
    manifest.checks.push({ name: "inventory-validation", status: "passed" });
    if (sourcePath) {
      const sourceAudit = auditSourceExtraction({ sourceText: fs.readFileSync(sourcePath, "utf8"), inventory });
      const sourceAuditPath = path.join(outputDir, "source-audit.json");
      writeJson(sourceAuditPath, sourceAudit);
      manifest.outputs.sourceAudit = sourceAuditPath;
      manifest.sourceCoverage = sourceAudit;
      if (!sourceAudit.ok) throw new Error(`V4.4 source extraction coverage failed: ${sourceAudit.issues.join("; ")}`);
      manifest.checks.push({ name: "source-extraction-coverage", status: "passed" });
      manifest.hashes.sourceAudit = hashFile(sourceAuditPath);
    } else if (allowFixtureSource) {
      manifest.checks.push({ name: "source-extraction-coverage", status: "fixture-skipped" });
    } else {
      throw new Error("source extraction coverage cannot be skipped in production");
    }
    const semanticModel = compileSemanticModel({ inventory, hints });
    const semanticPath = path.join(outputDir, "semantic-model.json"); writeJson(semanticPath, semanticModel);
    run(process.execPath, [path.join(root, "scripts/validate-semantic-model.mjs"), semanticPath], root);
    const plans = planExpressions(semanticModel);
    const plansPath = path.join(outputDir, "expression-plans.json"); writeJson(plansPath, plans);
    const decision = compileV44Brief({ semanticModel, planningResult: plans, style, title: inventory.title });
    const decisionPath = path.join(outputDir, "decision.json"); writeJson(decisionPath, decision);
    const brief = decision.brief;
    if (!brief) {
      throw new Error(`V4.4 semantic routing failed: ${decision.reason || "no high-confidence production plan"}`);
    }
    const selected = new Set(brief.planning.selectedFactIds || []);
    const missingImportant = semanticModel.facts.filter((fact) => ["critical", "high"].includes(fact.importance) && !selected.has(fact.id));
    if (missingImportant.length) throw new Error(`V4.4 critical coverage failed: ${missingImportant.map((fact) => fact.id).join(", ")}`);
    const silentlyDeferred = semanticModel.facts.filter((fact) => fact.importance === "medium" && !selected.has(fact.id));
    if (silentlyDeferred.length) throw new Error(`V4.4 semantic completeness failed: medium facts were silently deferred: ${silentlyDeferred.map((fact) => fact.id).join(", ")}`);
    const itemCarrierIssues = [];
    for (const block of brief.expressionBlocks || []) {
      if (!block.items?.length) continue;
      const itemFactIds = new Set(block.items.map((entry) => entry.sourceFactId).filter(Boolean));
      for (const factId of block.sourceFactIds || []) {
        if (!itemFactIds.has(factId)) itemCarrierIssues.push(`${block.type}:${factId}`);
      }
    }
    if (itemCarrierIssues.length) throw new Error(`V4.4 visible carrier check failed: ${itemCarrierIssues.join(", ")}`);
    manifest.coverage = {
      importantFacts: semanticModel.facts.filter((fact) => ["critical", "high"].includes(fact.importance)).length,
      mediumFacts: semanticModel.facts.filter((fact) => fact.importance === "medium").length,
      selectedFacts: selected.size,
      missingImportantFacts: [],
      silentlyDeferredFacts: [],
      visibleCarrierIssues: [],
    };
    manifest.decision = { scenario: semanticModel.scenario, confidence: decision.decision, selectedPlanId: decision.selectedPlanId };
    const briefPath = path.join(outputDir, "brief.json"); writeJson(briefPath, brief);
    run(process.execPath, [path.join(root, "scripts/validate-brief.mjs"), briefPath], root);
    const outputPath = path.join(outputDir, "whiteboard.svg");
    run(process.execPath, [rendererPath, "--input", briefPath, "--output", outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-v4-layout.mjs"), outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-v43-visual-quality.mjs"), outputPath], root);
    manifest.checks.push({ name: "semantic-plan-render-layout", status: "passed" });
    manifest.outputs = { semanticModel: semanticPath, expressionPlans: plansPath, decision: decisionPath, brief: briefPath, whiteboard: outputPath };
    manifest.hashes.brief = hashFile(briefPath);
    manifest.hashes.whiteboard = hashFile(outputPath);
    if (!skipWhiteboardCli) {
      const pngPath = path.join(outputDir, "whiteboard.png");
      run("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", outputPath, "-o", pngPath, "-f", "svg"], root);
      run("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", outputPath, "-f", "svg", "--check"], root);
      run("python3", [path.join(root, "scripts/check-v44-preview.py"), pngPath], root);
      manifest.checks.push({ name: "preview-pixel-sanity", status: "passed" });
      manifest.outputs.preview = pngPath;
      manifest.hashes.preview = hashFile(pngPath);
      manifest.status = "passed";
    } else {
      manifest.checks.push({ name: "preview-pixel-sanity", status: "skipped" });
      manifest.status = "rendered-unverified";
    }
  } catch (error) { manifest.status = "failed"; manifest.error = { message: error.message }; }
  manifest.finishedAt = new Date().toISOString(); writeJson(manifestPath, manifest);
  if (manifest.status === "failed") throw new Error(manifest.error.message);
  return manifest;
}
