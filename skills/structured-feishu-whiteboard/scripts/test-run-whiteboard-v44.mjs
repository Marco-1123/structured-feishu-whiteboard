import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWhiteboardV44 } from "./lib/v44-pipeline-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v44-pipeline-"));
const inventoryPath = path.join(temp, "inventory.json");
fs.writeFileSync(inventoryPath, JSON.stringify({ inventoryId: "pipeline-review", title: "Q2 阶段复盘与 Q3 规划", sourceType: "report", sourceRef: "inline:test-run-whiteboard-v44", facts: [
  { id: "c1", type: "conclusion", importance: "critical", text: "Q2 核心目标整体达成" },
  { id: "m1", type: "metric", importance: "high", text: "目标完成率 86%", value: "86%" },
  { id: "m2", type: "metric", importance: "high", text: "效率提升 18%", value: "+18%" },
  { id: "r1", type: "risk", importance: "high", text: "数据口径仍需统一" },
  { id: "a1", type: "action", importance: "high", text: "Q3 建立统一指标字典" },
  { id: "e1", type: "evidence", importance: "medium", text: "连续五周保持改善" }
] }, null, 2));
const manifest = await runWhiteboardV44({ root, inventoryPath, outputDir: path.join(temp, "run"), skipWhiteboardCli: true });
assert.equal(manifest.status, "rendered-unverified");
for (const file of ["semantic-model.json", "expression-plans.json", "decision.json", "whiteboard.svg"]) assert.ok(fs.existsSync(path.join(temp, "run", file)));
assert.equal(manifest.pipeline, "v4.4");
console.log("ok: V4.4 pipeline runner tests passed");
