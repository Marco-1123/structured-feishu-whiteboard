import assert from "node:assert/strict";
import { buildExpressionLayout, profileExpressionBlock } from "./lib/v4-layout-tree.mjs";

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

const compactList = {
  type: "action-list",
  items: [
    { label: "统一口径", note: "补齐字典" },
    { label: "完善回退", note: "增加兜底" },
    { label: "固定复盘", note: "双周检查" },
    { label: "扩展场景", note: "验证复用" },
  ],
};
const compactProfile = profileExpressionBlock(compactList);
assert.equal(compactProfile.preferredSpan, 6, "four short parallel items should prefer half width");
assert.equal(compactProfile.itemLayout, "grid-2", "four short parallel items should use a two-column interior");

const denseList = {
  type: "risk-list",
  items: Array.from({ length: 5 }, (_, index) => ({
    label: `复杂治理要求 ${index + 1}`,
    note: "这是一段需要保留完整业务语义、责任边界、验证方式和后续行动的较长说明。",
  })),
};
const denseProfile = profileExpressionBlock(denseList);
assert.equal(denseProfile.preferredSpan, 12, "dense explanatory lists must remain full width");
assert.equal(denseProfile.itemLayout, "rows");

console.log("ok: V4.3 layout tree tests passed");
