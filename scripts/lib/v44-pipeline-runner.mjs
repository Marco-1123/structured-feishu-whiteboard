import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compileSemanticModel } from "./semantic-compiler.mjs";
import { planExpressions } from "./expression-planner.mjs";
import { compileV44Brief } from "./v44-brief-compiler.mjs";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
function run(command, args, cwd) { const result = spawnSync(command, args, { cwd, encoding: "utf8" }); if (result.status !== 0) throw new Error((result.stderr || result.stdout || "command failed").trim()); }

export async function runWhiteboardV44({ root, inventoryPath, outputDir, style = "linear-system", hints = {}, skipWhiteboardCli = false }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const inventory = readJson(inventoryPath);
  const manifest = { pipeline: "v4.4", status: "running", startedAt: new Date().toISOString(), inputs: { inventoryPath }, checks: [], outputs: {} };
  const manifestPath = path.join(outputDir, "run-manifest.json"); writeJson(manifestPath, manifest);
  try {
    run(process.execPath, [path.join(root, "scripts/validate-content-inventory.mjs"), inventoryPath], root);
    manifest.checks.push({ name: "inventory-validation", status: "passed" });
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
    manifest.coverage = { importantFacts: semanticModel.facts.filter((fact) => ["critical", "high"].includes(fact.importance)).length, missingImportantFacts: [] };
    manifest.decision = { scenario: semanticModel.scenario, confidence: decision.decision, selectedPlanId: decision.selectedPlanId };
    const briefPath = path.join(outputDir, "brief.json"); writeJson(briefPath, brief);
    run(process.execPath, [path.join(root, "scripts/validate-brief.mjs"), briefPath], root);
    const outputPath = path.join(outputDir, "whiteboard.svg");
    run(process.execPath, [path.join(root, "scripts/render-whiteboard-v4.mjs"), "--input", briefPath, "--output", outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-v4-layout.mjs"), outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-v43-visual-quality.mjs"), outputPath], root);
    manifest.checks.push({ name: "semantic-plan-render-layout", status: "passed" });
    manifest.outputs = { semanticModel: semanticPath, expressionPlans: plansPath, decision: decisionPath, brief: briefPath, whiteboard: outputPath };
    if (!skipWhiteboardCli) { const pngPath = path.join(outputDir, "whiteboard.png"); run("npx", ["-y", "@larksuite/whiteboard-cli@^0.2.12", "-i", outputPath, "-o", pngPath, "-f", "svg"], root); run("npx", ["-y", "@larksuite/whiteboard-cli@^0.2.12", "-i", outputPath, "-f", "svg", "--check"], root); run("python3", [path.join(root, "scripts/check-v44-preview.py"), pngPath], root); manifest.checks.push({ name: "preview-pixel-sanity", status: "passed" }); manifest.outputs.preview = pngPath; }
    manifest.status = "passed";
  } catch (error) { manifest.status = "failed"; manifest.error = { message: error.message }; }
  manifest.finishedAt = new Date().toISOString(); writeJson(manifestPath, manifest);
  if (manifest.status === "failed") throw new Error(manifest.error.message);
  return manifest;
}
