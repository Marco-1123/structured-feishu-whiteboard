import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { planSceneV5 } from "./lib/v5-scene-planner.mjs";
import { architectureModel, swimlaneModel, flywheelModel } from "./test-v5-scene-planner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const renderer = path.join(root, "scripts/render-whiteboard-v5.mjs");
const outputRoot = path.join(root, "examples/v5-scenes");
const skipPreview = process.argv.includes("--skip-preview");
const cases = [
  ["layered-architecture", "智能协作能力分层架构", architectureModel],
  ["swimlane-process", "分析需求跨角色协作流程", swimlaneModel],
  ["flywheel-loop", "能力沉淀与规模复用闭环", flywheelModel]
];

for (const [id, title, model] of cases) {
  const dir = path.join(outputRoot, id);
  fs.mkdirSync(dir, { recursive: true });
  const result = planSceneV5(model, { title });
  fs.writeFileSync(path.join(dir, "semantic-model.json"), `${JSON.stringify(model, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "scene-decision.json"), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "scene-plan.json"), `${JSON.stringify(result.selected, null, 2)}\n`);
  const svgPath = path.join(dir, "whiteboard.svg");
  const pngPath = path.join(dir, "whiteboard.png");
  execFileSync(process.execPath, [renderer, "--input", path.join(dir, "scene-plan.json"), "--output", svgPath]);
  if (!skipPreview) {
    fs.rmSync(pngPath, { force: true });
    execFileSync("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", svgPath, "-o", pngPath, "-f", "svg"]);
    execFileSync("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", svgPath, "-f", "svg", "--check"]);
  }
}

console.log(`generated ${cases.length} V5 scene fixtures in ${outputRoot}`);
