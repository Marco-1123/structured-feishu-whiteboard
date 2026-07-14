import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { planSceneV5 } from "./lib/v5-scene-planner.mjs";
import { architectureModel, swimlaneModel, flywheelModel } from "./test-v5-scene-planner.mjs";

const renderer = new URL("./render-whiteboard-v5.mjs", import.meta.url).pathname;
for (const semanticModel of [architectureModel, swimlaneModel, flywheelModel]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v5-scene-"));
  const plan = planSceneV5(semanticModel).selected;
  const input = path.join(dir, "plan.json");
  const output = path.join(dir, "whiteboard.svg");
  fs.writeFileSync(input, JSON.stringify(plan));
  execFileSync(process.execPath, [renderer, "--input", input, "--output", output]);
  const svg = fs.readFileSync(output, "utf8");
  assert.match(svg, /data-layout-engine="v5"/);
  assert.match(svg, new RegExp(`data-scene="${plan.scene}"`));
  assert.doesNotMatch(svg, /<(?:linearGradient|radialGradient|filter|clipPath|mask)\b/);
  for (const node of plan.nodes) assert.match(svg, new RegExp(`data-scene-node="${node.id}"`));
  const dimensions = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
  assert.ok(dimensions);
  const ratio = Number(dimensions[1]) / Number(dimensions[2]);
  assert.ok(ratio >= 1.42 && ratio <= 2.15, `${plan.scene} ratio ${ratio} must remain onepage`);
  const contentBottom = Number(svg.match(/data-content-bottom="([\d.]+)"/)?.[1]);
  assert.ok(contentBottom > 0);
  assert.ok((Number(dimensions[2]) - contentBottom) / Number(dimensions[2]) <= 0.24, `${plan.scene} has excessive bottom whitespace`);
  execFileSync("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", output, "-f", "svg", "--check"], { stdio: "pipe" });
}

console.log("ok: V5 scene renderer tests passed");
