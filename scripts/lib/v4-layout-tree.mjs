function nodeId(block, index) {
  return block.id || `${block.type || "block"}-${index + 1}`;
}

const DIRECTIONAL_TYPES = new Set(["narrative-chain", "mini-roadmap", "variance-bridge-v2"]);
const LIST_TYPES = new Set(["risk-list", "action-list", "evidence-list"]);

function itemText(item = {}) {
  return `${item.label || ""}${item.note || ""}${item.value || ""}`;
}

function blockDemand(block = {}) {
  const items = block.items || [];
  const itemLengths = items.map((item) => itemText(item).length);
  const ownText = `${block.title || ""}${block.note || ""}${(block.body || []).join("")}`;
  return {
    itemCount: items.length,
    textUnits: ownText.length + itemLengths.reduce((sum, length) => sum + length, 0),
    maxItemUnits: itemLengths.length ? Math.max(...itemLengths) : 0,
    noteCount: items.filter((item) => item.note).length,
  };
}

export function profileExpressionBlock(block = {}) {
  const demand = blockDemand(block);
  const base = {
    span: 6,
    minSpan: 4,
    preferredSpan: 6,
    maxSpan: 8,
    density: "medium",
    itemLayout: "rows",
    reason: "balanced-analytical-block",
    ...demand,
  };

  if (DIRECTIONAL_TYPES.has(block.type)) {
    return { ...base, span: 12, minSpan: 12, preferredSpan: 12, maxSpan: 12, density: "medium", reason: "directional-reading" };
  }

  if (block.type === "decision-matrix") {
    return { ...base, span: 12, minSpan: 8, preferredSpan: 12, maxSpan: 12, density: "dense", reason: "tabular-comparison" };
  }

  if (LIST_TYPES.has(block.type)) {
    const sparse = demand.maxItemUnits <= 32 && demand.textUnits <= 190;
    const dense = demand.maxItemUnits > 42 || demand.textUnits > 240 || (demand.itemCount >= 5 && demand.maxItemUnits > 36);
    if (dense) {
      return { ...base, span: 12, minSpan: 8, preferredSpan: 12, maxSpan: 12, density: "dense", itemLayout: "rows", reason: "long-explanatory-items" };
    }
    if (sparse && demand.itemCount <= 3) {
      return { ...base, span: 4, minSpan: 4, preferredSpan: 4, maxSpan: 6, density: "sparse", itemLayout: "rows", reason: "few-short-parallel-items" };
    }
    if (sparse) {
      return { ...base, span: 6, minSpan: 6, preferredSpan: 6, maxSpan: 8, density: "sparse", itemLayout: "grid-2", reason: "short-parallel-items" };
    }
    return { ...base, span: 8, minSpan: 6, preferredSpan: 8, maxSpan: 12, density: "medium", itemLayout: "grid-2", reason: "moderate-parallel-items" };
  }

  if (block.type === "status-board") {
    if (demand.maxItemUnits <= 34 && demand.textUnits <= 210) {
      const span = demand.itemCount <= 3 ? 4 : demand.itemCount <= 5 ? 6 : 8;
      return { ...base, span, minSpan: Math.min(6, span), preferredSpan: span, maxSpan: Math.min(12, span + 2), density: "sparse", itemLayout: demand.itemCount >= 4 ? "grid-2" : "rows", reason: "compact-status-items" };
    }
    if (demand.maxItemUnits > 64 || demand.textUnits > 320) {
      return { ...base, span: 12, minSpan: 8, preferredSpan: 12, maxSpan: 12, density: "dense", itemLayout: "grid-2", reason: "dense-status-items" };
    }
    return { ...base, span: 8, minSpan: 6, preferredSpan: 8, maxSpan: 12, itemLayout: "grid-2", reason: "moderate-status-items" };
  }

  if (["trend-sparkline", "progress-bar", "ranked-bar"].includes(block.type)) {
    const dense = demand.maxItemUnits > 48 || demand.textUnits > 240;
    return dense
      ? { ...base, span: 8, minSpan: 6, preferredSpan: 8, maxSpan: 12, density: "dense", reason: "dense-chart-labels" }
      : { ...base, span: 6, minSpan: 6, preferredSpan: 6, maxSpan: 8, density: "medium", reason: "compact-chart" };
  }

  return base;
}

function spanWidth(totalWidth, span, gap) {
  const unit = (totalWidth - gap * 11) / 12;
  return unit * span + gap * (span - 1);
}

export function buildAdaptiveExpressionLayout({
  blocks,
  mode,
  x,
  startY,
  width,
  gap = 32,
  measure,
  profile = profileExpressionBlock,
}) {
  const nodes = [];
  let row = 0;
  let rowY = startY;
  let rowHeight = 0;
  let usedSpan = 0;

  const closeRow = () => {
    if (usedSpan === 0) return;
    rowY += rowHeight + gap;
    row += 1;
    rowHeight = 0;
    usedSpan = 0;
  };

  for (const [index, block] of blocks.entries()) {
    const intent = profile(block);
    const span = [4, 6, 8, 12].includes(intent.span) ? intent.span : 12;
    if (usedSpan > 0 && usedSpan + span > 12) closeRow();
    if (span === 12 && usedSpan > 0) closeRow();

    const blockWidth = spanWidth(width, span, gap);
    const blockX = x + usedSpan * ((width - gap * 11) / 12 + gap);
    const measured = measure(block, blockWidth, intent);
    const node = {
      id: nodeId(block, index),
      type: block.type,
      x: Math.round(blockX),
      y: Math.round(rowY),
      width: Math.round(blockWidth),
      height: measured.height,
      children: [],
      sourceBlockIndex: index,
      column: span === 12 ? "full" : usedSpan === 0 ? "left" : usedSpan + span === 12 ? "right" : "grid",
      row,
      span,
      preferredWidth: Math.round(spanWidth(width, intent.preferredSpan, gap)),
      profile: intent,
      block,
    };
    nodes.push(node);
    usedSpan += span;
    rowHeight = Math.max(rowHeight, node.height);
    if (usedSpan === 12 || span === 12) closeRow();
  }
  closeRow();

  const bottom = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) : startY;
  return {
    mode,
    nodes,
    height: Math.max(0, bottom - startY),
    rowCount: nodes.length ? Math.max(...nodes.map((node) => node.row)) + 1 : 0,
    contentBounds: { x, y: startY, width, height: Math.max(0, bottom - startY) },
  };
}

export function buildExpressionLayout({
  blocks,
  mode,
  x,
  startY,
  width,
  gap = 32,
  measure,
  isWide,
}) {
  const columnGap = gap;
  const columnWidth = Math.floor((width - columnGap) / 2);
  const columns = [startY, startY];
  const nodes = [];

  for (const [index, block] of blocks.entries()) {
    const wide = Boolean(isWide(block, mode));
    if (wide) {
      const y = Math.max(...columns);
      const measured = measure(block, width);
      const node = {
        id: nodeId(block, index),
        type: block.type,
        x,
        y,
        width,
        height: measured.height,
        children: [],
        sourceBlockIndex: index,
        column: "full",
        block,
      };
      nodes.push(node);
      const nextY = y + node.height + gap;
      columns[0] = nextY;
      columns[1] = nextY;
      continue;
    }

    const columnIndex = columns[0] <= columns[1] ? 0 : 1;
    const measured = measure(block, columnWidth);
    const node = {
      id: nodeId(block, index),
      type: block.type,
      x: x + columnIndex * (columnWidth + columnGap),
      y: columns[columnIndex],
      width: columnWidth,
      height: measured.height,
      children: [],
      sourceBlockIndex: index,
      column: columnIndex === 0 ? "left" : "right",
      block,
    };
    nodes.push(node);
    columns[columnIndex] += node.height + gap;
  }

  const bottom = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) : startY;
  return {
    mode,
    nodes,
    height: Math.max(0, bottom - startY),
    columnHeights: {
      left: Math.max(startY, columns[0] - gap),
      right: Math.max(startY, columns[1] - gap),
    },
    contentBounds: { x, y: startY, width, height: Math.max(0, bottom - startY) },
  };
}
