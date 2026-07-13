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
    const sparse = demand.maxItemUnits <= 18 && demand.textUnits <= 100;
    const dense = demand.maxItemUnits > 42 || demand.textUnits > 240 || (demand.itemCount >= 5 && demand.maxItemUnits > 36);
    if (dense) {
      return { ...base, span: 12, minSpan: 8, preferredSpan: 12, maxSpan: 12, density: "dense", itemLayout: "rows", reason: "long-explanatory-items" };
    }
    if (sparse && demand.itemCount === 3) {
      return { ...base, span: 6, minSpan: 6, preferredSpan: 6, maxSpan: 8, density: "sparse", itemLayout: "grid-3", reason: "three-short-parallel-items" };
    }
    if (sparse && demand.itemCount <= 2) {
      return { ...base, span: 4, minSpan: 4, preferredSpan: 4, maxSpan: 6, density: "sparse", itemLayout: demand.itemCount === 2 ? "grid-2" : "rows", reason: "few-short-parallel-items" };
    }
    if (sparse) {
      return { ...base, span: 6, minSpan: 6, preferredSpan: 6, maxSpan: 8, density: "sparse", itemLayout: "grid-2", reason: "short-parallel-items" };
    }
    if (demand.maxItemUnits <= 32 && demand.textUnits <= 190) {
      const itemLayout = block.type === "risk-list" && demand.itemCount === 5 ? "grid-3" : "rows";
      return { ...base, span: 6, minSpan: 6, preferredSpan: 6, maxSpan: 8, density: "medium", itemLayout, reason: itemLayout === "grid-3" ? "compact-risk-cluster" : "moderate-parallel-items" };
    }
    return { ...base, span: 8, minSpan: 6, preferredSpan: 8, maxSpan: 12, density: "medium", itemLayout: "grid-2", reason: "substantial-parallel-items" };
  }

  if (block.type === "status-board") {
    if (demand.maxItemUnits <= 34 && demand.textUnits <= 210) {
      const span = demand.itemCount <= 3 ? 4 : demand.itemCount === 5 ? 12 : 8;
      const itemLayout = demand.itemCount === 5 ? "grid-5" : demand.itemCount >= 4 ? "grid-2" : "rows";
      return { ...base, span, minSpan: span, preferredSpan: span, maxSpan: span, density: "sparse", itemLayout, reason: demand.itemCount === 5 ? "balanced-five-status-items" : "compact-status-items" };
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

const SKELETON_PRIORITY = {
  "overview-detail": ["progress-bar", "trend-sparkline", "ranked-bar", "status-board", "variance-bridge-v2", "evidence-list", "risk-list", "action-list", "narrative-chain", "mini-roadmap", "decision-matrix"],
  "centered-system": ["status-board", "narrative-chain", "progress-bar", "evidence-list", "risk-list", "action-list", "mini-roadmap", "decision-matrix"],
  "past-future-split": ["evidence-list", "risk-list", "mini-roadmap", "action-list", "status-board", "narrative-chain"],
  "left-right-argument": ["narrative-chain", "evidence-list", "risk-list", "action-list", "decision-matrix", "status-board"],
  "multi-line-comparison": ["decision-matrix", "evidence-list", "risk-list", "action-list", "status-board"],
  timeline: ["mini-roadmap", "narrative-chain", "risk-list", "action-list", "evidence-list", "status-board"],
};

function skeletonProfile(block, pageSkeleton, profile) {
  const intent = profile(block);
  if (pageSkeleton === "centered-system" && block.type === "status-board" && intent.itemCount >= 4) {
    return { ...intent, span: 12, minSpan: 12, preferredSpan: 12, maxSpan: 12, itemLayout: intent.itemCount === 5 ? "grid-5" : intent.itemLayout, reason: "centered-system-anchor" };
  }
  if (pageSkeleton === "timeline" && ["mini-roadmap", "narrative-chain"].includes(block.type)) {
    return { ...intent, span: 12, minSpan: 12, preferredSpan: 12, maxSpan: 12, reason: "timeline-reading-axis" };
  }
  if (["past-future-split", "left-right-argument"].includes(pageSkeleton) && ["evidence-list", "risk-list", "action-list"].includes(block.type)) {
    return { ...intent, span: 6, minSpan: 6, preferredSpan: 6, maxSpan: 6, reason: `${pageSkeleton}-paired-region` };
  }
  return intent;
}

export function arrangeExpressionBlocks(blocks, pageSkeleton, profile = profileExpressionBlock) {
  const priorities = SKELETON_PRIORITY[pageSkeleton] || [];
  const rank = (block) => {
    const index = priorities.indexOf(block.type);
    return index === -1 ? priorities.length + 10 : index;
  };
  const pending = blocks.map((block, index) => ({ block, index, intent: skeletonProfile(block, pageSkeleton, profile) }))
    .sort((a, b) => rank(a.block) - rank(b.block) || a.index - b.index);
  const output = [];
  const allowed = (intent) => [4, 6, 8, 12].filter((span) => span >= intent.minSpan && span <= intent.maxSpan);
  const pairable = (a, b) => allowed(a.intent).some((left) => allowed(b.intent).some((right) => left + right === 12));

  while (pending.length) {
    const current = pending.shift();
    output.push(current.block);
    if (current.intent.minSpan === 12) continue;
    const mateIndex = pending.findIndex((candidate) => pairable(current, candidate));
    if (mateIndex >= 0) output.push(pending.splice(mateIndex, 1)[0].block);
  }
  return output;
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
  pageSkeleton,
}) {
  const workingBlocks = pageSkeleton ? arrangeExpressionBlocks(blocks, pageSkeleton, profile) : blocks;
  const intents = workingBlocks.map((block) => skeletonProfile(block, pageSkeleton, profile));
  const allowed = (intent) => [4, 6, 8, 12].filter((span) => span >= intent.minSpan && span <= intent.maxSpan);
  const canUse = (index, span) => index < workingBlocks.length && allowed(intents[index]).includes(span);
  const pair = (index) => {
    if (index + 1 >= workingBlocks.length) return null;
    const candidates = [];
    for (const left of allowed(intents[index])) {
      for (const right of allowed(intents[index + 1])) {
        if (left + right !== 12) continue;
        const cost = Math.abs(left - intents[index].preferredSpan) + Math.abs(right - intents[index + 1].preferredSpan);
        candidates.push({ spans: [left, right], cost });
      }
    }
    return candidates.sort((a, b) => a.cost - b.cost || a.spans[0] - b.spans[0])[0]?.spans || null;
  };
  const compactRunLength = (index) => {
    let length = 0;
    while (index + length < workingBlocks.length && canUse(index + length, 4)) length += 1;
    return length;
  };

  const rowPlans = [];
  for (let index = 0; index < workingBlocks.length;) {
    const currentAllowed = allowed(intents[index]);
    if (currentAllowed.length === 1 && currentAllowed[0] === 12) {
      rowPlans.push({ indexes: [index], spans: [12], alignment: "filled", offsetSpan: 0 });
      index += 1;
      continue;
    }

    const runLength = compactRunLength(index);
    if (runLength >= 3 && runLength % 3 !== 1) {
      rowPlans.push({ indexes: [index, index + 1, index + 2], spans: [4, 4, 4], alignment: "filled", offsetSpan: 0 });
      index += 3;
      continue;
    }

    const pairSpans = pair(index);
    if (pairSpans) {
      rowPlans.push({ indexes: [index, index + 1], spans: pairSpans, alignment: "filled", offsetSpan: 0 });
      index += 2;
      continue;
    }

    if (runLength >= 3) {
      rowPlans.push({ indexes: [index, index + 1, index + 2], spans: [4, 4, 4], alignment: "filled", offsetSpan: 0 });
      index += 3;
      continue;
    }

    if (currentAllowed.includes(12)) {
      rowPlans.push({ indexes: [index], spans: [12], alignment: "filled", offsetSpan: 0 });
    } else {
      const span = currentAllowed.at(-1);
      rowPlans.push({ indexes: [index], spans: [span], alignment: "centered", offsetSpan: (12 - span) / 2 });
    }
    index += 1;
  }

  const finalRow = rowPlans.at(-1);
  if (pageSkeleton && finalRow?.indexes.length === 1 && finalRow.alignment === "centered") {
    const finalIndex = finalRow.indexes[0];
    const intent = intents[finalIndex];
    if (LIST_TYPES.has(workingBlocks[finalIndex].type) && !intent.reason.endsWith("-paired-region")) {
      finalRow.spans = [12];
      finalRow.alignment = "filled";
      finalRow.offsetSpan = 0;
      intents[finalIndex] = { ...intent, span: 12, minSpan: 12, preferredSpan: 12, maxSpan: 12, itemLayout: "footer-band", reason: "full-width-closing-band" };
    }
  }

  const nodes = [];
  const rows = [];
  const unitWithGap = (width - gap * 11) / 12 + gap;
  let rowY = startY;
  rowPlans.forEach((rowPlan, row) => {
    let usedSpan = rowPlan.offsetSpan;
    const rowNodes = rowPlan.indexes.map((sourceIndex, position) => {
      const block = workingBlocks[sourceIndex];
      const intent = intents[sourceIndex];
      const span = rowPlan.spans[position];
      const blockWidth = spanWidth(width, span, gap);
      const blockX = x + usedSpan * unitWithGap;
      const assignedProfile = { ...intent, assignedSpan: span };
      const measured = measure(block, blockWidth, assignedProfile);
      const node = {
        id: nodeId(block, sourceIndex), type: block.type, x: Math.round(blockX), y: Math.round(rowY), width: Math.round(blockWidth), height: measured.height,
        children: [], sourceBlockIndex: sourceIndex,
        column: span === 12 ? "full" : rowPlan.alignment === "centered" ? "center" : usedSpan === 0 ? "left" : usedSpan + span === 12 ? "right" : "grid",
        row, span, offsetSpan: rowPlan.offsetSpan, rowAlignment: rowPlan.alignment,
        preferredWidth: Math.round(spanWidth(width, intent.preferredSpan, gap)), profile: assignedProfile, block,
      };
      usedSpan += span;
      return node;
    });
    const rowHeight = Math.max(...rowNodes.map((node) => node.height));
    rowNodes.forEach((node) => {
      node.naturalHeight = node.height;
      node.height = rowHeight;
      node.profile = { ...node.profile, targetHeight: rowHeight };
    });
    nodes.push(...rowNodes);
    rows.push({ row, usedSpan: rowPlan.spans.reduce((sum, span) => sum + span, 0), alignment: rowPlan.alignment, offsetSpan: rowPlan.offsetSpan, height: rowHeight, nodeIds: rowNodes.map((node) => node.id) });
    rowY += rowHeight + gap;
  });

  const bottom = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) : startY;
  return {
    mode,
    nodes,
    rows,
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
