import fs from "node:fs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
const output = args[args.indexOf("--output") + 1];

if (!input || !output) {
  console.error("usage: node scripts/render-whiteboard-v4.mjs --input brief.json --output diagram.svg");
  process.exit(1);
}

const brief = JSON.parse(fs.readFileSync(input, "utf8"));
if (brief.layout !== "expression-canvas") {
  throw new Error("V4 pilot supports layout: expression-canvas only");
}
if ((brief.engine || "v3") !== "v4") {
  throw new Error('V4 renderer requires engine: "v4"');
}

const styles = {
  "professional-blue": {
    canvas: "#F7FAFC",
    surface: "#FFFFFF",
    muted: "#EEF4FA",
    ink: "#172033",
    secondary: "#5C6B82",
    border: "#D8E2EF",
    accent: "#2563EB",
    soft: "#DBEAFE",
    success: "#0F766E",
    risk: "#8A5A44",
    track: "#E6EDF5",
  },
  "linear-command": {
    canvas: "#F7F8FA",
    surface: "#FFFFFF",
    muted: "#F1F3F6",
    ink: "#111827",
    secondary: "#5F6B7A",
    border: "#D8DEE8",
    accent: "#5E6AD2",
    soft: "#ECEEFE",
    success: "#16A085",
    risk: "#8A5A44",
    track: "#E7EAF0",
  },
  "linear-system": {
    canvas: "#F7F8FA",
    surface: "#FFFFFF",
    muted: "#F1F3F6",
    ink: "#111827",
    secondary: "#5F6B7A",
    border: "#D8DEE8",
    accent: "#5E6AD2",
    soft: "#ECEEFE",
    success: "#16A085",
    risk: "#8A5A44",
    track: "#E7EAF0",
  },
  "apple-report": {
    canvas: "#F5F5F7",
    surface: "#FFFFFF",
    muted: "#F2F2F7",
    ink: "#1D1D1F",
    secondary: "#6E6E73",
    border: "#D2D2D7",
    accent: "#007AFF",
    soft: "#E8F2FF",
    success: "#248A3D",
    risk: "#8A5A44",
    track: "#E5E5EA",
  },
  "stripe-data": {
    canvas: "#F6F9FC",
    surface: "#FFFFFF",
    muted: "#F0F6FF",
    ink: "#0A2540",
    secondary: "#53657D",
    border: "#D9E5F2",
    accent: "#635BFF",
    soft: "#EEF2FF",
    success: "#00A88F",
    risk: "#7A5A46",
    track: "#E8EEF7",
  },
  "vercel-precision": {
    canvas: "#FFFFFF",
    surface: "#FFFFFF",
    muted: "#F5F5F5",
    ink: "#000000",
    secondary: "#666666",
    border: "#D8D8D8",
    accent: "#000000",
    soft: "#F5F5F5",
    success: "#000000",
    risk: "#666666",
    track: "#E8E8E8",
  },
};

const c = styles[brief.style] || styles["professional-blue"];
const WIDTH = 2200;
const M = 96;
const GAP = 32;
const CONTENT = WIDTH - M * 2;

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function estimateWidth(value, size) {
  let width = 0;
  for (const char of String(value)) {
    if (/[\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/.test(char)) width += size;
    else if (/[A-Z0-9%+.-]/.test(char)) width += size * 0.66;
    else width += size * 0.54;
  }
  return width;
}

function splitText(value, maxWidth, size, maxLines = 4) {
  const text = String(value || "").trim();
  if (!text) return [];
  const chunks = [];
  let current = "";
  for (const char of text) {
    const candidate = current + char;
    if (current && estimateWidth(candidate, size) > maxWidth) {
      chunks.push(current.trim());
      current = char.trimStart();
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  const out = chunks.slice(0, maxLines);
  if (chunks.length > maxLines) out[maxLines - 1] = `${out[maxLines - 1].replace(/[，。,.、；;：:]?$/, "")}...`;
  return out;
}

function rect(x, y, w, h, fill = c.surface, stroke = c.border, sw = 1.5, rx = 16, attrs = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${attrs}/>`;
}

function text(x, y, size, fill, lines, weight = "500", lineHeight = Math.round(size * 1.38), attrs = "") {
  const safe = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  if (!safe.length) return "";
  const normalizedWeight = Number(weight) >= 700 ? "700" : Number(weight) >= 500 ? "500" : "400";
  const tspans = safe.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${normalizedWeight}"${attrs}>${tspans}</text>`;
}

function measureLines(value, width, size, maxLines = 4, lineHeight = Math.round(size * 1.38)) {
  const lines = splitText(value, width, size, maxLines);
  return { lines, height: lines.length ? size + (lines.length - 1) * lineHeight : 0 };
}

function blockCard(x, y, w, h, title, note = "") {
  const noteLines = splitText(note, w - 56, 18, 2);
  return `${rect(x, y, w, h)}
${text(x + 28, y + 48, 26, c.ink, [title], "800")}
${noteLines.length ? text(x + 28, y + 80, 18, c.secondary, noteLines, "500", 25) : ""}`;
}

function tone(status) {
  if (status === "good") return c.success;
  if (status === "risk") return c.risk;
  return c.accent;
}

function parsePercent(value, fallback = 60) {
  const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;
  return Math.max(0, Math.min(100, Number(match[0])));
}

function titleBlock() {
  const titleLines = splitText(brief.title, CONTENT, 46, 2);
  const subLines = splitText(brief.subtitle || "", CONTENT, 21, 2);
  const h = 88 + titleLines.length * 58 + subLines.length * 30;
  const body = `${text(M, 86, 46, c.ink, titleLines, "850", 58)}
${subLines.length ? text(M, 86 + titleLines.length * 58, 21, c.secondary, subLines, "500", 30) : ""}`;
  return { body, h };
}

function statementBlock(block, x, y, w) {
  const bodyValue = (block.body || []).join(" ");
  const body = measureLines(bodyValue, w - 96, 31, 3, 43);
  const h = Math.max(150, 92 + body.height);
  return {
    h,
    body: `${rect(x, y, w, h, c.surface, c.border, 1.5, 16)}
<rect x="${x}" y="${y}" width="12" height="${h}" rx="6" fill="${c.accent}" stroke="${c.accent}" stroke-width="1"/>
${text(x + 42, y + 48, 18, c.accent, [block.title || brief.summaryLabel || "核心判断"], "800")}
${text(x + 42, y + 98, 31, c.ink, body.lines, "800", 43)}`,
  };
}

function metricCard(block, x, y, w) {
  const note = measureLines(block.note || "", w - 52, 17, 2, 24);
  const h = Math.max(150, 132 + note.height);
  const chip = block.label ? `${rect(x + 26, y + h - 48, 104, 32, c.muted, c.border, 1, 8)}
${text(x + 46, y + h - 27, 16, tone(block.status), [block.label], "800")}` : "";
  return {
    h,
    body: `${rect(x, y, w, h, c.surface, c.border, 1.5, 16, ' data-tone-group="parallel-metrics"')}
${text(x + 26, y + 40, 18, c.secondary, [block.title], "800")}
${text(x + 26, y + 92, 42, c.accent, [block.value], "850")}
${note.lines.length ? text(x + 26, y + 124, 17, c.secondary, note.lines, "500", 24) : ""}
${chip}`,
  };
}

function metricsGroup(blocks, x, y, w) {
  const gap = 24;
  const cols = blocks.length === 1 ? 3 : blocks.length >= 3 ? 3 : 2;
  const cardW = Math.floor((w - gap * (cols - 1)) / cols);
  const cards = blocks.map((block) => metricCard(block, 0, 0, cardW));
  const h = Math.max(...cards.map((card) => card.h));
  let body = "";
  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    body += metricCard(blocks[i], x + col * (cardW + gap), y + row * (h + gap), cardW).body;
  });
  return { h: Math.ceil(blocks.length / cols) * h + Math.max(0, Math.ceil(blocks.length / cols) - 1) * gap, body };
}

function progressGroup(block, x, y, w) {
  const items = (block.items || []).slice(0, 5);
  const titleH = block.note ? 84 : 58;
  const rowH = 54;
  const h = titleH + items.length * rowH + 34;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const rowY = y + titleH + index * rowH + 6;
    const labelW = 150;
    const valueW = 56;
    const trackX = x + 28 + labelW;
    const trackW = w - 56 - labelW - valueW - 18;
    const pct = parsePercent(item.value, 60);
    body += `
${text(x + 28, rowY + 24, 17, c.ink, [item.label], "800")}
${rect(trackX, rowY + 9, trackW, 18, c.track, c.track, 1, 9)}
${rect(trackX, rowY + 9, Math.round(trackW * pct / 100), 18, c.accent, c.accent, 1, 9)}
${text(trackX + trackW + 18, rowY + 25, 16, c.secondary, [item.value], "800")}`;
  });
  return { h, body };
}

function trendSparkline(block, x, y, w) {
  const items = (block.items || []).slice(0, 6);
  const h = 300;
  const chartX = x + 56;
  const chartY = y + 118;
  const chartW = w - 112;
  const chartH = 110;
  const values = items.map((item) => parsePercent(item.value, 50));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const px = chartX + (items.length === 1 ? chartW / 2 : index * chartW / (items.length - 1));
    const py = chartY + chartH - ((value - min) / range) * chartH;
    return { x: Math.round(px), y: Math.round(py), value, label: items[index].label };
  });
  let body = blockCard(x, y, w, h, block.title, block.note);
  body += `
<line x1="${chartX}" y1="${chartY + chartH}" x2="${chartX + chartW}" y2="${chartY + chartH}" stroke="${c.border}" stroke-width="2"/>
<polyline points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${c.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  points.forEach((point) => {
    body += `
<circle cx="${point.x}" cy="${point.y}" r="7" fill="${c.surface}" stroke="${c.accent}" stroke-width="4"/>
${text(point.x - 18, point.y - 20, 16, c.ink, [`${point.value}%`], "800")}
${text(point.x - 16, chartY + chartH + 34, 15, c.secondary, [point.label], "700")}`;
  });
  return { h, body };
}

function statusBoard(block, x, y, w) {
  const items = (block.items || []).slice(0, 6);
  const cols = items.length > 3 ? 2 : items.length;
  const gap = 16;
  const itemW = Math.floor((w - 56 - gap * (cols - 1)) / cols);
  const itemH = 82;
  const rows = Math.ceil(items.length / cols);
  const h = 112 + rows * itemH + Math.max(0, rows - 1) * 14 + 26;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const ix = x + 28 + col * (itemW + gap);
    const iy = y + 106 + row * (itemH + 14);
    const t = tone(item.status);
    body += `
${rect(ix, iy, itemW, itemH, c.surface, c.border, 1.2, 12)}
<rect x="${ix + 14}" y="${iy + 18}" width="8" height="${itemH - 36}" rx="4" fill="${t}" stroke="${t}" stroke-width="1"/>
${text(ix + 36, iy + 31, 17, c.ink, [item.label], "800")}
${text(ix + itemW - 94, iy + 31, 16, t, [item.value || ""], "800")}
${item.note ? text(ix + 36, iy + 60, 15, c.secondary, splitText(item.note, itemW - 52, 15, 1), "500") : ""}`;
  });
  return { h, body };
}

function listBlock(block, x, y, w, type = "action") {
  const items = (block.items || []).slice(0, 5);
  const itemH = type === "evidence" ? 62 : 54;
  const h = 104 + items.length * itemH + 26;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const iy = y + 100 + index * itemH;
    const t = type === "risk" ? tone(item.status || "risk") : c.accent;
    body += `
${rect(x + 28, iy, w - 56, itemH - 12, c.muted, c.border, 1, 10)}
<rect x="${x + 28}" y="${iy}" width="8" height="${itemH - 12}" rx="4" fill="${t}" stroke="${t}" stroke-width="1"/>
${text(x + 50, iy + 30, 17, c.ink, splitText(item.label, w - 110, 17, 1), "800")}
${item.note ? text(x + 50, iy + 53, 14, c.secondary, splitText(item.note, w - 110, 14, 1), "500") : ""}`;
  });
  return { h, body };
}

function narrativeChain(block, x, y, w) {
  const items = (block.items || []).slice(0, 5);
  const gap = 26;
  const itemW = Math.floor((w - 56 - gap * (items.length - 1)) / items.length);
  const itemH = 180;
  const h = 118 + itemH + 36;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const ix = x + 28 + index * (itemW + gap);
    const iy = y + 110;
    body += `
${rect(ix, iy, itemW, itemH, c.surface, c.border, 1.4, 14)}
${text(ix + 24, iy + 46, 24, c.ink, [item.label], "850")}
${item.note ? text(ix + 24, iy + 82, 17, c.secondary, splitText(item.note, itemW - 48, 17, 3), "500", 25) : ""}`;
    if (index < items.length - 1) {
      const ax = ix + itemW + 7;
      const ay = iy + itemH / 2;
      body += `${text(ax, ay + 10, 38, c.accent, ["→"], "700")}`;
    }
  });
  return { h, body };
}

function decisionMatrix(block, x, y, w) {
  const items = (block.items || []).slice(0, 4);
  const headerH = 42;
  const rowH = 56;
  const h = 112 + headerH + rowH * items.length + 28;
  const tableX = x + 28;
  const tableY = y + 98;
  const tableW = w - 56;
  let body = blockCard(x, y, w, h, block.title, block.note);
  body += `${rect(tableX, tableY, tableW, headerH, c.muted, c.border, 1, 8)}
${text(tableX + 20, tableY + 27, 15, c.secondary, ["选项"], "800")}
${text(tableX + tableW * 0.38, tableY + 27, 15, c.secondary, ["判断依据"], "800")}
${text(tableX + tableW - 110, tableY + 27, 15, c.secondary, ["结论"], "800")}`;
  items.forEach((item, index) => {
    const iy = tableY + headerH + index * rowH;
    const t = tone(item.status);
    body += `
${rect(tableX, iy, tableW, rowH - 8, item.status === "good" ? c.soft : c.surface, item.status === "good" ? c.accent : c.border, 1.3, 8)}
${text(tableX + 20, iy + 31, 17, item.status === "good" ? c.accent : c.ink, [item.label], "800")}
${text(tableX + tableW * 0.38, iy + 31, 15, c.secondary, splitText(item.note || "", tableW * 0.42, 15, 1), "500")}
${text(tableX + tableW - 110, iy + 31, 16, t, [item.value || ""], "800")}`;
  });
  return { h, body };
}

function miniRoadmap(block, x, y, w) {
  const items = (block.items || []).slice(0, 5);
  const gap = 20;
  const itemW = Math.floor((w - 56 - gap * (items.length - 1)) / items.length);
  const itemH = 100;
  const h = 118 + itemH + 36;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const ix = x + 28 + index * (itemW + gap);
    const iy = y + 112;
    body += `
${rect(ix, iy, itemW, itemH, c.muted, c.border, 1.2, 12)}
${text(ix + 20, iy + 36, 17, c.ink, [item.label], "800")}
${item.note ? text(ix + 20, iy + 64, 15, c.secondary, splitText(item.note, itemW - 40, 15, 2), "500", 21) : ""}`;
    if (index < items.length - 1) body += `${text(ix + itemW + 3, iy + 60, 31, c.accent, ["→"], "700")}`;
  });
  return { h, body };
}

function varianceBridge(block, x, y, w) {
  const items = (block.items || []).slice(0, 6);
  const h = 282;
  const stageY = y + 154;
  const stageGap = 18;
  const stageW = Math.floor((w - 56 - stageGap * (items.length - 1)) / items.length);
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const ix = x + 28 + index * (stageW + stageGap);
    const num = Number(String(item.value || "0").replace(/[^\d.-]/g, "")) || 0;
    const isEnd = index === 0 || index === items.length - 1;
    const t = isEnd ? c.accent : (num < 0 ? c.risk : c.success);
    const cardH = isEnd ? 102 : Math.max(54, Math.min(100, 52 + Math.abs(num) * 0.12));
    body += `
${rect(ix, stageY + (102 - cardH), stageW, cardH, isEnd ? c.soft : c.surface, t, 2, 10)}
${text(ix + 18, stageY + 34, 22, c.ink, [item.value], "850")}
${text(ix + 18, stageY + 68, 15, c.secondary, splitText(item.note || "", stageW - 36, 15, 1), "500")}
${text(ix + 18, stageY + 124, 16, c.ink, splitText(item.label, stageW - 36, 16, 1), "800")}`;
    if (index < items.length - 1) body += `${text(ix + stageW + 2, stageY + 50, 30, c.accent, ["→"], "700")}`;
  });
  return { h, body };
}

function blockRenderer(block, x, y, w) {
  if (block.type === "progress-bar" || block.type === "ranked-bar") return progressGroup(block, x, y, w);
  if (block.type === "trend-sparkline") return trendSparkline(block, x, y, w);
  if (block.type === "status-board") return statusBoard(block, x, y, w);
  if (block.type === "risk-list") return listBlock(block, x, y, w, "risk");
  if (block.type === "action-list") return listBlock(block, x, y, w, "action");
  if (block.type === "evidence-list") return listBlock(block, x, y, w, "evidence");
  if (block.type === "narrative-chain") return narrativeChain(block, x, y, w);
  if (block.type === "decision-matrix") return decisionMatrix(block, x, y, w);
  if (block.type === "mini-roadmap") return miniRoadmap(block, x, y, w);
  if (block.type === "variance-bridge-v2") return varianceBridge(block, x, y, w);
  return listBlock(block, x, y, w, "action");
}

function twoColumnGrid(blocks, x, y, w) {
  const colGap = 32;
  const colW = Math.floor((w - colGap) / 2);
  const columnY = [y, y];
  let body = "";
  blocks.forEach((block, index) => {
    const col = index % 2;
    const rendered = blockRenderer(block, x + col * (colW + colGap), columnY[col], colW);
    body += rendered.body;
    columnY[col] += rendered.h + GAP;
  });
  return { h: Math.max(...columnY) - y - GAP, body };
}

function fullRows(blocks, x, y, w) {
  let body = "";
  let cy = y;
  blocks.forEach((block) => {
    const rendered = blockRenderer(block, x, cy, w);
    body += rendered.body;
    cy += rendered.h + GAP;
  });
  return { h: cy - y - GAP, body };
}

function renderCanvas() {
  const blocks = brief.expressionBlocks || [];
  const statement = blocks.find((block) => block.type === "statement");
  const metrics = blocks.filter((block) => block.type === "metric-card");
  const rest = blocks.filter((block) => block.type !== "statement" && block.type !== "metric-card");

  const title = titleBlock();
  let y = 64 + title.h;
  let body = title.body;

  if (statement) {
    const rendered = statementBlock(statement, M, y, CONTENT);
    body += rendered.body;
    y += rendered.h + 44;
  }

  if (metrics.length) {
    const rendered = metricsGroup(metrics, M, y, CONTENT);
    body += rendered.body;
    y += rendered.h + 44;
  }

  if (brief.expressionMode === "narrative-map") {
    const chain = rest.find((block) => block.type === "narrative-chain");
    const others = rest.filter((block) => block.type !== "narrative-chain");
    if (chain) {
      const rendered = blockRenderer(chain, M, y, CONTENT);
      body += rendered.body;
      y += rendered.h + 44;
    }
    const grid = twoColumnGrid(others, M, y, CONTENT);
    body += grid.body;
    y += grid.h + 40;
  } else if (brief.expressionMode === "modular-canvas") {
    const wideTypes = new Set(["mini-roadmap", "variance-bridge-v2", "narrative-chain"]);
    const wide = rest.filter((block) => wideTypes.has(block.type));
    const compact = rest.filter((block) => !wideTypes.has(block.type));
    const grid = twoColumnGrid(compact.slice(0, 4), M, y, CONTENT);
    body += grid.body;
    y += grid.h + 44;
    const rows = fullRows([...wide, ...compact.slice(4)], M, y, CONTENT);
    body += rows.body;
    y += rows.h + 40;
  } else {
    const upperTypes = new Set(["progress-bar", "trend-sparkline", "status-board", "ranked-bar"]);
    const upper = rest.filter((block) => upperTypes.has(block.type));
    const lower = rest.filter((block) => !upperTypes.has(block.type));
    const grid = twoColumnGrid(upper, M, y, CONTENT);
    body += grid.body;
    y += grid.h + 44;
    const lowerRendered = lower.length === 1 ? fullRows(lower, M, y, CONTENT) : twoColumnGrid(lower, M, y, CONTENT);
    body += lowerRendered.body;
    y += lowerRendered.h + 40;
  }

  if (brief.footer) {
    const footerLines = splitText(brief.footer, CONTENT - 68, 20, 2);
    const h = 74 + (footerLines.length - 1) * 26;
    body += `${rect(M, y, CONTENT, h, c.surface, c.border, 1.3, 14)}
<rect x="${M}" y="${y}" width="10" height="${h}" rx="5" fill="${c.accent}" stroke="${c.accent}" stroke-width="1"/>
${text(M + 36, y + 46, 20, c.ink, footerLines, "800", 26)}`;
    y += h + 72;
  }

  const height = Math.max(1080, y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" data-layout-engine="v4" data-expression-mode="${escapeXml(brief.expressionMode)}">
${rect(0, 0, WIDTH, height, c.canvas, c.canvas, 0, 0)}
<g>
${body}
</g>
</svg>`;
}

fs.writeFileSync(output, renderCanvas());
