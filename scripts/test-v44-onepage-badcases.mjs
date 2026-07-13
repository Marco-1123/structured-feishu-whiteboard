import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWhiteboardV44 } from "./lib/v44-pipeline-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = [
  {
    id: "audit-assistant-overview",
    expectedSkeleton: "overview-detail",
    minimumMetrics: 3,
    requiredBlocks: ["risk-list", "action-list"],
  },
  {
    id: "audit-assistant-capability",
    expectedSkeleton: "centered-system",
    minimumMetrics: 0,
    requiredBlocks: ["status-board", "narrative-chain", "evidence-list"],
  },
];

for (const fixture of fixtures) {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `v44-${fixture.id}-`));
  const inventoryPath = path.join(root, "examples/evals/v44-badcases", fixture.id, "inventory.json");
  const manifest = await runWhiteboardV44({ root, inventoryPath, outputDir, skipWhiteboardCli: true });
  assert.equal(manifest.status, "passed");
  const brief = JSON.parse(fs.readFileSync(path.join(outputDir, "brief.json"), "utf8"));
  const svg = fs.readFileSync(path.join(outputDir, "whiteboard.svg"), "utf8");
  assert.equal(brief.pageSkeleton, fixture.expectedSkeleton);
  assert.match(svg, new RegExp(`data-page-skeleton="${fixture.expectedSkeleton}"`));
  assert.doesNotMatch(svg, />[，。；：！？]<\/tspan>/, `${fixture.id} must not leave Chinese punctuation alone at the start of a wrapped line`);
  assert.ok((brief.expressionBlocks || []).filter((block) => block.type === "metric-card").length >= fixture.minimumMetrics);
  for (const type of fixture.requiredBlocks) assert.ok(brief.expressionBlocks.some((block) => block.type === type), `${fixture.id} must render ${type}`);
  for (const block of brief.expressionBlocks || []) {
    for (const item of block.items || []) assert.notEqual(item.note, item.label, `${fixture.id} must not repeat the same sentence as label and note`);
    assert.ok(!String(block.note || "").endsWith("…"), `${fixture.id} must not use a clipped aggregate sentence as a decorative block note`);
  }
  const dimensions = svg.match(/<svg[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/);
  assert.ok(dimensions, `${fixture.id} must expose SVG dimensions`);
  assert.ok(Number(dimensions[1]) / Number(dimensions[2]) >= 1.1, `${fixture.id} must remain a compact onepage`);
  assert.match(svg, /data-span="12"[^>]*data-item-layout="footer-band"/, `${fixture.id} must finish with a full-width closing band rather than a narrow floating card`);
}

console.log("ok: V4.4 onepage bad-case regressions passed");
