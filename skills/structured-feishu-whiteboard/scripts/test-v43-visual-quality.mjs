import assert from "node:assert/strict";
import { inspectV43VisualQuality } from "./lib/v43-visual-quality.mjs";

function svg(blocks, width = 1000, height = 700) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-layout-engine="v4">${blocks.map((block) => `<g data-v43-block="${block.id}" data-block-type="${block.type || "test"}" data-x="${block.x}" data-y="${block.y}" data-width="${block.w}" data-height="${block.h}" data-column="${block.column || "full"}" data-text-units="${block.textUnits ?? 80}" data-item-count="${block.itemCount ?? 4}"></g>`).join("")}</svg>`;
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

const longOnepage = inspectV43VisualQuality(`<svg width="2200" height="2600" viewBox="0 0 2200 2600" data-layout-engine="v4" data-layout="expression-canvas" data-pipeline-version="4.4" data-page-skeleton="overview-detail">
  <g data-v43-block="a" data-block-type="statement" data-x="50" data-y="50" data-width="2100" data-height="240" data-column="full"></g>
  <g data-v43-block="b" data-block-type="evidence-list" data-x="50" data-y="330" data-width="2100" data-height="2100" data-column="full"></g>
</svg>`);
assert.equal(longOnepage.ok, false, "V4.4 onepages must reject vertical report strips");
assert.match(longOnepage.issues.join(" "), /onepage aspect ratio/i);

const wideOnepage = inspectV43VisualQuality(`<svg width="3500" height="1000" viewBox="0 0 3500 1000" data-layout-engine="v4" data-layout="expression-canvas" data-pipeline-version="4.4">
  <g data-v43-block="a" data-block-type="statement" data-x="50" data-y="50" data-width="3400" data-height="850" data-column="full"></g>
</svg>`);
assert.equal(wideOnepage.ok, false, "V4.4 onepages must reject unreadably wide strips");
assert.match(wideOnepage.issues.join(" "), /outside 1.42-2.15/i);

const longFlow = inspectV43VisualQuality(`<svg width="1000" height="1600" viewBox="0 0 1000 1600" data-layout-engine="v4" data-layout="flow-canvas" data-pipeline-version="4.4">
  <g data-v43-block="flow" data-block-type="linear-flow" data-x="50" data-y="50" data-width="900" data-height="1450" data-column="full"></g>
</svg>`);
assert.equal(longFlow.ok, false, "V4.4 flow canvases must carry pipeline markers and reject accidental report strips");
assert.match(longFlow.issues.join(" "), /flow canvas aspect ratio is outside/i);

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

const rowVoid = inspectV43VisualQuality(`<svg width="1000" height="760" viewBox="0 0 1000 760" data-layout-engine="v4">
  <g data-v43-block="status" data-block-type="status-board" data-x="50" data-y="80" data-width="430" data-height="310" data-column="left" data-row="0" data-span="6"></g>
  <g data-v43-block="risk" data-block-type="risk-list" data-x="520" data-y="80" data-width="430" data-height="180" data-column="right" data-row="0" data-span="6"></g>
  <g data-v43-block="evidence" data-block-type="evidence-list" data-x="50" data-y="430" data-width="430" data-height="220" data-column="left" data-row="1" data-span="6"></g>
  <g data-v43-block="action" data-block-type="action-list" data-x="520" data-y="430" data-width="430" data-height="220" data-column="right" data-row="1" data-span="6"></g>
</svg>`);
assert.equal(rowVoid.ok, false);
assert.match(rowVoid.issues.join(" "), /row harmony/i);

console.log("ok: V4.3 visual quality tests passed");
