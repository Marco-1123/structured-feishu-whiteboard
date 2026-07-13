import assert from "node:assert/strict";
import { buildAdaptiveExpressionLayout, buildExpressionLayout, profileExpressionBlock } from "./lib/v4-layout-tree.mjs";

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

const moderateSingle = profileExpressionBlock({ type: "evidence-list", items: [{ label: "真实试点验证", note: "读取稳定性达到预期" }] });
assert.equal(moderateSingle.minSpan, 4, "a short evidence list must remain eligible for a three-column support row");

const adaptiveTree = buildAdaptiveExpressionLayout({
  blocks: [
    { ...compactList, id: "compact-a", height: 180 },
    { ...compactList, id: "compact-b", height: 220 },
    { type: "mini-roadmap", id: "directional", height: 240, items: [{ label: "A" }, { label: "B" }] },
  ],
  mode: "modular-canvas",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: (block) => ({ height: block.height }),
});
assert.equal(adaptiveTree.nodes[0].span, 6);
assert.equal(adaptiveTree.nodes[1].span, 6);
assert.equal(adaptiveTree.nodes[0].row, adaptiveTree.nodes[1].row, "two compact lists should share a row");
assert.equal(adaptiveTree.nodes[2].span, 12);
assert.ok(adaptiveTree.nodes[2].y >= adaptiveTree.nodes[1].y + adaptiveTree.nodes[1].height + 32);

const noHoleTree = buildAdaptiveExpressionLayout({
  blocks: [
    { type: "evidence-list", id: "evidence", items: [{ label: "证据" }] },
    { type: "risk-list", id: "risk", items: [{ label: "风险" }] },
    { type: "action-list", id: "action", items: [{ label: "行动" }] },
  ],
  mode: "narrative-map",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: () => ({ height: 180 }),
});
assert.deepEqual(noHoleTree.nodes.map((node) => node.span), [4, 4, 4], "three compact support blocks must form a complete row");
assert.deepEqual(noHoleTree.nodes.map((node) => node.profile.assignedSpan), [4, 4, 4], "renderers must know the width assigned by the row planner");
assert.equal(new Set(noHoleTree.nodes.map((node) => node.row)).size, 1, "three compact support blocks must not create an orphan row");
assert.equal(noHoleTree.rows[0].usedSpan, 12, "a multi-block row must fill all 12 columns");
assert.equal(new Set(noHoleTree.nodes.map((node) => node.height)).size, 1, "cards in the same row must share one outer height");
assert.equal(noHoleTree.nodes[0].height, 180, "equal-height rows must preserve the tallest natural card height");

const unevenRowTree = buildAdaptiveExpressionLayout({
  blocks: [
    { type: "evidence-list", id: "short-card", items: [{ label: "证据" }] },
    { type: "risk-list", id: "tall-card", items: [{ label: "风险一" }, { label: "风险二" }] },
  ],
  mode: "narrative-map",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: (block) => ({ height: block.id === "short-card" ? 160 : 240 }),
});
assert.deepEqual(unevenRowTree.nodes.map((node) => node.height), [240, 240], "short cards must stretch to the tallest card in their row");
assert.deepEqual(unevenRowTree.nodes.map((node) => node.profile.targetHeight), [240, 240], "renderer profiles must receive the row target height");

const balancedPairTree = buildAdaptiveExpressionLayout({
  blocks: [
    { type: "risk-list", id: "risk-pair", items: [{ label: "风险" }] },
    { type: "status-board", id: "status-pair", items: [{ label: "状态" }, { label: "状态二" }, { label: "状态三" }, { label: "状态四" }] },
  ],
  mode: "modular-canvas",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: () => ({ height: 180 }),
});
assert.equal(balancedPairTree.rows[0].usedSpan, 12, "compatible pairs must be resized to a complete row");

const centeredOrphanTree = buildAdaptiveExpressionLayout({
  blocks: [{ type: "action-list", id: "single", items: [{ label: "单项行动" }] }],
  mode: "modular-canvas",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: () => ({ height: 180 }),
});
assert.equal(centeredOrphanTree.nodes[0].rowAlignment, "centered", "a compact orphan must be intentionally centered");
assert.equal(centeredOrphanTree.nodes[0].offsetSpan, 3, "a half-width orphan must have symmetric margins");

const closingBandTree = buildAdaptiveExpressionLayout({
  blocks: [
    { type: "evidence-list", id: "main-evidence", items: [{ label: "证据一" }, { label: "证据二" }, { label: "证据三" }] },
    { type: "risk-list", id: "main-risk", items: [{ label: "风险一" }, { label: "风险二" }] },
    { type: "action-list", id: "closing-action", items: [{ label: "行动一" }, { label: "行动二" }] },
  ],
  mode: "dashboard-onepage",
  pageSkeleton: "overview-detail",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: (_block, _width, profile) => ({ height: profile.itemLayout === "footer-band" ? 154 : 220 }),
});
const closingBand = closingBandTree.nodes.find((node) => node.id === "closing-action");
assert.equal(closingBand.span, 12, "the last support block in a onepage must close the composition instead of floating as a narrow centered card");
assert.equal(closingBand.profile.itemLayout, "footer-band");
assert.equal(closingBand.rowAlignment, "filled");

const centeredSystemTree = buildAdaptiveExpressionLayout({
  blocks: [{ type: "status-board", id: "five-status", items: Array.from({ length: 5 }, (_, index) => ({ label: `能力 ${index + 1}` })) }],
  mode: "modular-canvas",
  pageSkeleton: "centered-system",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: () => ({ height: 180 }),
});
assert.equal(centeredSystemTree.nodes[0].span, 12, "centered-system must create a real full-width system anchor rather than only reorder blocks");
assert.equal(centeredSystemTree.nodes[0].profile.itemLayout, "grid-5", "five peers must use a balanced five-column grid without an empty cell");

const splitTree = buildAdaptiveExpressionLayout({
  blocks: [
    { type: "evidence-list", id: "past", items: [{ label: "阶段结果" }] },
    { type: "action-list", id: "future", items: [{ label: "下一阶段" }] },
  ],
  mode: "narrative-map",
  pageSkeleton: "past-future-split",
  x: 96,
  startY: 300,
  width: 2008,
  gap: 32,
  measure: () => ({ height: 180 }),
});
assert.deepEqual(splitTree.nodes.map((node) => node.span), [6, 6], "past-future-split must enforce a visible left/right geometry");

console.log("ok: V4.3 layout tree tests passed");
