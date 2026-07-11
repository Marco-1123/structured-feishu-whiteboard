import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compileSemanticModel } from "./semantic-compiler.mjs";
import { planExpressions } from "./expression-planner.mjs";
import { compileV44Brief } from "./v44-brief-compiler.mjs";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
function run(command, args, cwd) { const result = spawnSync(command, args, { cwd, encoding: "utf8" }); if (result.status !== 0) throw new Error((result.stderr || result.stdout || "command failed").trim()); }
function clip(value, max) { const text = String(value || "").trim(); return text.length <= max ? text : `${text.slice(0, max - 1)}…`; }
function fallbackBrief(inventory) {
  const facts = inventory.facts || [];
  const conclusion = facts.find((fact) => fact.type === "conclusion") || facts[0];
  const moduleFacts = facts.filter((fact) => fact !== conclusion && fact.importance !== "low").slice(0, 6);
  const chunks = [moduleFacts.slice(0, 2), moduleFacts.slice(2, 4), moduleFacts.slice(4, 6)].filter((chunk) => chunk.length);
  while (chunks.length < 3) chunks.push([{ text: "材料信息不足，需补充关键事实" }]);
  return { layout: "conclusion-first", style: "professional-blue", title: clip(inventory.title || "材料总览", 32), subtitle: "V4.4 置信度不足，使用 V4.3 稳定总览兜底。", summaryLabel: "核心判断", summary: clip(conclusion?.text || "材料暂未形成明确结论", 90), modules: chunks.map((chunk, index) => ({ title: ["关键信息", "风险与约束", "行动与待确认"][index], body: chunk.map((fact) => clip(fact.text, 28)), tag: ["稳定兜底", "需要核验", "继续补充"][index] })), footer: "该输出明确标记为 V4.3 fallback，不代表 V4.4 已高置信度完成语义选择。" };
}

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
    let brief = decision.brief; let renderer = "scripts/render-whiteboard-v4.mjs";
    if (!brief) { manifest.pipeline = "v4.3-fallback"; manifest.fallback = decision.fallback; brief = fallbackBrief(inventory); renderer = "scripts/render-whiteboard.mjs"; }
    const briefPath = path.join(outputDir, "brief.json"); writeJson(briefPath, brief);
    run(process.execPath, [path.join(root, "scripts/validate-brief.mjs"), briefPath], root);
    const outputPath = path.join(outputDir, "whiteboard.svg");
    run(process.execPath, [path.join(root, renderer), "--input", briefPath, "--output", outputPath], root);
    run(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), outputPath], root);
    if (manifest.pipeline === "v4.4") run(process.execPath, [path.join(root, "scripts/check-v4-layout.mjs"), outputPath], root);
    manifest.checks.push({ name: "semantic-plan-render-layout", status: "passed" });
    manifest.outputs = { semanticModel: semanticPath, expressionPlans: plansPath, decision: decisionPath, brief: briefPath, whiteboard: outputPath };
    if (!skipWhiteboardCli) { const pngPath = path.join(outputDir, "whiteboard.png"); run("npx", ["-y", "@larksuite/whiteboard-cli@^0.2.12", "-i", outputPath, "-o", pngPath, "-f", "svg"], root); run("npx", ["-y", "@larksuite/whiteboard-cli@^0.2.12", "-i", outputPath, "-f", "svg", "--check"], root); manifest.outputs.preview = pngPath; }
    manifest.status = "passed";
  } catch (error) { manifest.status = "failed"; manifest.error = { message: error.message }; }
  manifest.finishedAt = new Date().toISOString(); writeJson(manifestPath, manifest);
  if (manifest.status === "failed") throw new Error(manifest.error.message);
  return manifest;
}
