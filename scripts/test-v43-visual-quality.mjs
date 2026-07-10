import assert from "node:assert/strict";
import { inspectV43VisualQuality } from "./lib/v43-visual-quality.mjs";

function svg(blocks, width = 1000, height = 700) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-layout-engine="v4">${blocks.map((block) => `<g data-v43-block="${block.id}" data-block-type="${block.type || "test"}" data-x="${block.x}" data-y="${block.y}" data-width="${block.w}" data-height="${block.h}" data-column="${block.column || "full"}"></g>`).join("")}</svg>`;
}

const valid = inspectV43VisualQuality(svg([
  { id: "a", x: 50, y: 50, w: 430, h: 220, column: "left" },
  { id: "b", x: 520, y: 50, w: 430, h: 220, column: "right" },
  { id: "c", x: 50, y: 310, w: 900, h: 300, column: "full" },
]));
assert.equal(valid.ok, true, valid.issues.join("; "));

const overlap = inspectV43VisualQuality(svg([
  { id: "a", x: 50, y: 50, w: 500, h: 300 },
  { id: "b", x: 500, y: 200, w: 450, h: 300 },
]));
assert.equal(overlap.ok, false);
assert.match(overlap.issues.join(" "), /overlap/i);

const bottom = inspectV43VisualQuality(svg([
  { id: "a", x: 50, y: 50, w: 900, h: 630 },
]));
assert.equal(bottom.ok, false);
assert.match(bottom.issues.join(" "), /bottom margin/i);

const extreme = inspectV43VisualQuality(svg([
  { id: "a", x: 50, y: 50, w: 900, h: 2300 },
], 1000, 2400));
assert.equal(extreme.ok, false);
assert.match(extreme.issues.join(" "), /aspect ratio/i);

const imbalance = inspectV43VisualQuality(svg([
  { id: "a", x: 50, y: 50, w: 430, h: 500, column: "left" },
  { id: "b", x: 520, y: 50, w: 430, h: 120, column: "right" },
  { id: "c", x: 50, y: 590, w: 900, h: 50, column: "full" },
]));
assert.equal(imbalance.ok, false);
assert.match(imbalance.issues.join(" "), /column imbalance/i);

const sparseStack = inspectV43VisualQuality(`<svg width="1000" height="900" viewBox="0 0 1000 900" data-layout-engine="v4">
  <g data-v43-block="title" data-block-type="title" data-x="50" data-y="40" data-width="900" data-height="100" data-column="full"></g>
  <g data-v43-block="risk" data-block-type="risk-list" data-x="50" data-y="180" data-width="900" data-height="180" data-column="full" data-span="12" data-density="sparse" data-preferred-width="440" data-text-units="42" data-item-count="4" data-item-layout="rows"></g>
  <g data-v43-block="evidence" data-block-type="evidence-list" data-x="50" data-y="392" data-width="900" data-height="180" data-column="full" data-span="12" data-density="sparse" data-preferred-width="440" data-text-units="38" data-item-count="4" data-item-layout="rows"></g>
  <g data-v43-block="action" data-block-type="action-list" data-x="50" data-y="604" data-width="900" data-height="180" data-column="full" data-span="12" data-density="sparse" data-preferred-width="440" data-text-units="36" data-item-count="4" data-item-layout="rows"></g>
</svg>`);
assert.equal(sparseStack.ok, false);
assert.match(sparseStack.issues.join(" "), /sparse full-width/i);

console.log("ok: V4.3 visual quality tests passed");
