import assert from "node:assert/strict";
import { buildExpressionLayout } from "./lib/v4-layout-tree.mjs";

const blocks = [
  { type: "progress-bar", id: "tall", height: 400 },
  { type: "trend-sparkline", id: "short-1", height: 100 },
  { type: "status-board", id: "short-2", height: 100 },
];

const tree = buildExpressionLayout({
  blocks,
  mode: "dashboard-onepage",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: (block) => ({ height: block.height }),
  isWide: () => false,
});

assert.equal(tree.nodes.length, 3);
assert.equal(tree.nodes[0].column, "left");
assert.equal(tree.nodes[1].column, "right");
assert.equal(tree.nodes[2].column, "right", "third block must use the shorter column instead of index alternation");
assert.ok(Math.abs(tree.columnHeights.left - tree.columnHeights.right) <= 200);

const wideTree = buildExpressionLayout({
  blocks: [blocks[1], { type: "narrative-chain", id: "wide", height: 220 }, blocks[2]],
  mode: "narrative-map",
  x: 96,
  startY: 200,
  width: 2008,
  gap: 32,
  measure: (block) => ({ height: block.height }),
  isWide: (block) => block.id === "wide",
});

const wide = wideTree.nodes.find((node) => node.id === "wide");
assert.equal(wide.column, "full");
assert.equal(wide.width, 2008);
assert.ok(wideTree.nodes[2].y >= wide.y + wide.height + 32, "blocks after a full-width row must start below it");

console.log("ok: V4.3 layout tree tests passed");
