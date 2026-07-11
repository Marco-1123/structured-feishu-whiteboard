function attrs(source) {
  const out = {};
  for (const [, key, value] of source.matchAll(/([a-zA-Z0-9:-]+)="([^"]*)"/g)) out[key] = value;
  return out;
}

function number(value) {
  return Number.parseFloat(value || "0");
}

function overlaps(a, b, tolerance = 1) {
  return a.x < b.x + b.w - tolerance
    && a.x + a.w > b.x + tolerance
    && a.y < b.y + b.h - tolerance
    && a.y + a.h > b.y + tolerance;
}

export function inspectV43VisualQuality(svg) {
  const issues = [];
  const svgMatch = svg.match(/<svg\b([^>]*)>/);
  if (!svgMatch) return { ok: false, issues: ["Missing SVG root"], metrics: {} };
  const root = attrs(svgMatch[1]);
  const width = number(root.width || String(root.viewBox || "").split(/\s+/)[2]);
  const height = number(root.height || String(root.viewBox || "").split(/\s+/)[3]);
  const blocks = [...svg.matchAll(/<g\b([^>]*)data-v43-block="([^"]+)"([^>]*)>/g)].map((match) => {
    const a = attrs(`${match[1]} data-v43-block="${match[2]}" ${match[3]}`);
    return {
      id: a["data-v43-block"],
      type: a["data-block-type"],
      column: a["data-column"] || "full",
      x: number(a["data-x"]),
      y: number(a["data-y"]),
      w: number(a["data-width"]),
      h: number(a["data-height"]),
      span: number(a["data-span"]),
      row: a["data-row"] === undefined ? Number.NaN : number(a["data-row"]),
      density: a["data-density"] || "",
      preferredWidth: number(a["data-preferred-width"]),
      textUnits: number(a["data-text-units"]),
      itemCount: number(a["data-item-count"]),
      itemLayout: a["data-item-layout"] || "",
    };
  });

  if (blocks.length < 1) issues.push("Missing V4.3 top-level layout markers");
  for (const block of blocks) {
    if (block.w < 120 || block.h < 44) issues.push(`Block ${block.id} is below minimum component size`);
    if (block.x < 0 || block.y < 0 || block.x + block.w > width + 1 || block.y + block.h > height + 1) issues.push(`Block ${block.id} exceeds the canvas`);
  }
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      if (overlaps(blocks[i], blocks[j])) issues.push(`Top-level blocks overlap: ${blocks[i].id} and ${blocks[j].id}`);
    }
  }

  const rows = new Map();
  for (const block of blocks) {
    if (!Number.isFinite(block.row) || block.span === 12 || block.row < 0) continue;
    const rowBlocks = rows.get(block.row) || [];
    rowBlocks.push(block);
    rows.set(block.row, rowBlocks);
  }
  let maxRowHeightDelta = 0;
  for (const [row, rowBlocks] of rows) {
    if (rowBlocks.length < 2) continue;
    const heights = rowBlocks.map((block) => block.h);
    const delta = Math.max(...heights) - Math.min(...heights);
    maxRowHeightDelta = Math.max(maxRowHeightDelta, delta);
    if (delta > 32) issues.push(`Row harmony failure in row ${row}: height delta ${delta}`);
  }

  const directionalTypes = new Set(["narrative-chain", "mini-roadmap", "variance-bridge-v2", "trend-sparkline", "flow"]);
  const sparseFullWidth = (block) => block.density === "sparse"
    && block.span === 12
    && !directionalTypes.has(block.type);
  for (const block of blocks) {
    if (sparseFullWidth(block) && block.preferredWidth > 0 && block.w > block.preferredWidth + 120) {
      issues.push(`Sparse full-width block ${block.id} is overstretched: width ${block.w}, preferred ${block.preferredWidth}`);
    }
    if (block.density === "sparse" && block.span >= 8 && block.textUnits > 0) {
      const textUnitsPerHundredPx = block.textUnits / Math.max(1, block.w / 100);
      if (textUnitsPerHundredPx < 2.2 && !directionalTypes.has(block.type)) {
        issues.push(`Sparse block ${block.id} has low content utilization: ${textUnitsPerHundredPx.toFixed(2)} text units per 100px`);
      }
    }
  }

  let sparseRun = [];
  for (const block of blocks) {
    if (sparseFullWidth(block)) {
      sparseRun.push(block.id);
      if (sparseRun.length === 3) issues.push(`Sparse full-width repetition: ${sparseRun.join(", ")}`);
    } else if (!["title", "statement", "metric-group"].includes(block.type)) {
      sparseRun = [];
    }
  }

  const maxBottom = blocks.length ? Math.max(...blocks.map((block) => block.y + block.h)) : 0;
  const bottomMargin = height - maxBottom;
  if (blocks.length && bottomMargin < 40) issues.push(`Canvas bottom margin is too small: ${bottomMargin}`);
  if (blocks.length && bottomMargin > Math.max(260, height * 0.18)) issues.push(`Canvas bottom margin is excessive: ${bottomMargin}`);

  const aspectRatio = height ? width / height : 0;
  if (aspectRatio < 0.5 || aspectRatio > 2.2) issues.push(`Unsupported canvas aspect ratio: ${aspectRatio.toFixed(2)}`);

  const left = blocks.filter((block) => block.column === "left");
  const right = blocks.filter((block) => block.column === "right");
  let columnImbalance = 0;
  if (left.length && right.length) {
    const leftBottom = Math.max(...left.map((block) => block.y + block.h));
    const rightBottom = Math.max(...right.map((block) => block.y + block.h));
    columnImbalance = Math.abs(leftBottom - rightBottom);
    if (columnImbalance > Math.max(240, height * 0.22)) issues.push(`Excessive column imbalance: ${columnImbalance}`);
  }

  const occupiedArea = blocks.reduce((sum, block) => sum + block.w * block.h, 0);
  const occupiedRatio = width && height ? occupiedArea / (width * height) : 0;
  if (blocks.length >= 3 && occupiedRatio < 0.24) issues.push(`Excessive empty canvas ratio: occupied ${occupiedRatio.toFixed(2)}`);

  return {
    ok: issues.length === 0,
    issues,
    metrics: {
      width,
      height,
      aspectRatio,
      bottomMargin,
      columnImbalance,
      occupiedRatio,
      sparseFullWidthCount: blocks.filter(sparseFullWidth).length,
      blockCount: blocks.length,
      maxRowHeightDelta,
    },
  };
}
