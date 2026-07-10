import fs from "node:fs";
import { buildExpressionLayout } from "./lib/v4-layout-tree.mjs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
const output = args[args.indexOf("--output") + 1];

if (!input || !output) {
  console.error("usage: node scripts/render-whiteboard-v4.mjs --input brief.json --output diagram.svg");
  process.exit(1);
}

const brief = JSON.parse(fs.readFileSync(input, "utf8"));
if (!["expression-canvas", "flow-canvas"].includes(brief.layout)) {
  throw new Error("V4 pilot supports layout: expression-canvas and flow-canvas only");
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
  "feishu-status": {
    canvas: "#F6FAFE",
    surface: "#FFFFFF",
    muted: "#EEF6FF",
    ink: "#172033",
    secondary: "#5C6B82",
    border: "#D8E6F3",
    accent: "#3370FF",
    soft: "#EAF2FF",
    success: "#0F766E",
    risk: "#8A5A44",
    track: "#E4EDF7",
  },
};

const c = styles[brief.style];
if (!c) throw new Error(`unsupported V4 style: ${brief.style}`);
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

function line(x1, y1, x2, y2, stroke = c.accent, sw = 3, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${attrs}/>`;
}

function polyline(points, stroke = c.accent, sw = 3, attrs = "") {
  return `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${attrs}/>`;
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

function flowTone(node) {
  if (node.type === "result" || node.status === "good") return c.success;
  if (node.type === "risk" || node.status === "risk") return c.risk;
  if (node.type === "system") return c.secondary;
  return c.accent;
}

function flowTypeLabel(type) {
  return ({
    start: "开始",
    action: "动作",
    decision: "判断",
    system: "系统",
    result: "结果",
    risk: "风险",
  })[type] || "节点";
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
  const hasChip = Boolean(block.label);
  const h = Math.max(172, 124 + note.height + (hasChip ? 54 : 18));
  const chip = hasChip ? `${rect(x + 26, y + h - 48, 118, 32, c.muted, c.border, 1, 8)}
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
  const withNotes = items.some((item) => item.note);
  const itemH = withNotes ? 76 : type === "evidence" ? 66 : 58;
  const h = 108 + items.length * itemH + 30;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const iy = y + 104 + index * itemH;
    const t = type === "risk" ? tone(item.status || "risk") : c.accent;
    const labelLines = splitText(item.label, w - 118, 17, 1);
    const noteLines = item.note ? splitText(item.note, w - 118, 14, withNotes ? 2 : 1) : [];
    body += `
${rect(x + 28, iy, w - 56, itemH - 12, c.muted, c.border, 1, 10, ` data-v4-list-row="${escapeXml(`${block.title || type}-${index}`)}" data-has-note="${noteLines.length ? "true" : "false"}"`)}
<rect x="${x + 28}" y="${iy}" width="8" height="${itemH - 12}" rx="4" fill="${t}" stroke="${t}" stroke-width="1"/>
${text(x + 50, iy + 30, 17, c.ink, labelLines, "800")}
${noteLines.length ? text(x + 50, iy + 54, 14, c.secondary, noteLines, "500", 20) : ""}`;
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
  const cols = items.length >= 5 && w < 1600 ? 3 : items.length;
  const rows = Math.ceil(items.length / cols);
  const itemW = Math.floor((w - 56 - gap * (cols - 1)) / cols);
  const itemH = 116;
  const h = 118 + itemH + 36;
  const totalH = 118 + rows * itemH + Math.max(0, rows - 1) * 28 + 36;
  let body = blockCard(x, y, w, h, block.title, block.note);
  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const ix = x + 28 + col * (itemW + gap);
    const iy = y + 112 + row * (itemH + 28);
    body += `
${rect(ix, iy, itemW, itemH, c.muted, c.border, 1.2, 12)}
${text(ix + 20, iy + 36, 17, c.ink, [item.label], "800")}
${item.note ? text(ix + 20, iy + 64, 15, c.secondary, splitText(item.note, itemW - 40, 15, 2), "500", 21) : ""}`;
    if (index < items.length - 1 && col < cols - 1) body += `${text(ix + itemW + 3, iy + 66, 31, c.accent, ["→"], "700")}`;
  });
  body = body.replace(`width="${w}" height="${h}"`, `width="${w}" height="${totalH}"`);
  return { h: totalH, body };
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

function blockTextDensity(block) {
  const own = `${block.title || ""}${block.note || ""}`;
  const items = (block.items || []).map((item) => `${item.label || ""}${item.note || ""}${item.value || ""}`).join("");
  return own.length + items.length;
}

function shouldRenderWide(block) {
  const count = (block.items || []).length;
  if (["mini-roadmap", "variance-bridge-v2", "narrative-chain"].includes(block.type)) return true;
  if (block.type === "status-board" && (count >= 5 || blockTextDensity(block) > 130)) return true;
  if (["risk-list", "action-list", "evidence-list"].includes(block.type) && (count >= 4 || blockTextDensity(block) > 120)) return true;
  return false;
}

function twoColumnGrid(blocks, x, y, w) {
  if (!blocks.length) return { h: 0, body: "" };
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
  if (!blocks.length) return { h: 0, body: "" };
  let body = "";
  let cy = y;
  blocks.forEach((block) => {
    const rendered = blockRenderer(block, x, cy, w);
    body += rendered.body;
    cy += rendered.h + GAP;
  });
  return { h: cy - y - GAP, body };
}

function markLayoutNode(node, body) {
  return `<g data-v43-block="${escapeXml(node.id)}" data-block-type="${escapeXml(node.type)}" data-x="${node.x}" data-y="${node.y}" data-width="${node.width}" data-height="${node.height}" data-column="${node.column || "full"}">
${body}
</g>`;
}

function renderCanvas() {
  const blocks = brief.expressionBlocks || [];
  const statement = blocks.find((block) => block.type === "statement");
  const metrics = blocks.filter((block) => block.type === "metric-card");
  const rest = blocks.filter((block) => block.type !== "statement" && block.type !== "metric-card");

  const title = titleBlock();
  let y = 64 + title.h;
  let body = markLayoutNode({ id: "title", type: "title", x: M, y: 40, width: CONTENT, height: title.h + 24, column: "full" }, title.body);

  if (statement) {
    const rendered = statementBlock(statement, M, y, CONTENT);
    body += markLayoutNode({ id: "statement", type: "statement", x: M, y, width: CONTENT, height: rendered.h, column: "full" }, rendered.body);
    y += rendered.h + 44;
  }

  if (metrics.length) {
    const rendered = metricsGroup(metrics, M, y, CONTENT);
    body += markLayoutNode({ id: "metrics", type: "metric-group", x: M, y, width: CONTENT, height: rendered.h, column: "full" }, rendered.body);
    y += rendered.h + 44;
  }

  let ordered;
  if (brief.expressionMode === "narrative-map") {
    const chain = rest.find((block) => block.type === "narrative-chain");
    const others = rest.filter((block) => block.type !== "narrative-chain");
    ordered = [...(chain ? [chain] : []), ...others];
  } else if (brief.expressionMode === "modular-canvas") {
    ordered = [...rest];
  } else {
    const upperTypes = new Set(["progress-bar", "trend-sparkline", "status-board", "ranked-bar"]);
    const upper = rest.filter((block) => upperTypes.has(block.type));
    const lower = rest.filter((block) => !upperTypes.has(block.type));
    ordered = [...upper, ...lower];
  }

  const tree = buildExpressionLayout({
    blocks: ordered,
    mode: brief.expressionMode,
    x: M,
    startY: y,
    width: CONTENT,
    gap: GAP,
    measure: (block, width) => ({ height: blockRenderer(block, 0, 0, width).h }),
    isWide: (block) => shouldRenderWide(block),
  });
  for (const node of tree.nodes) {
    const rendered = blockRenderer(node.block, node.x, node.y, node.width);
    body += markLayoutNode(node, rendered.body);
  }
  y += tree.height + 40;

  if (brief.footer) {
    const footerLines = splitText(brief.footer, CONTENT - 68, 20, 2);
    const h = 74 + (footerLines.length - 1) * 26;
    const footerBody = `${rect(M, y, CONTENT, h, c.surface, c.border, 1.3, 14)}
<rect x="${M}" y="${y}" width="10" height="${h}" rx="5" fill="${c.accent}" stroke="${c.accent}" stroke-width="1"/>
${text(M + 36, y + 46, 20, c.ink, footerLines, "800", 26)}`;
    body += markLayoutNode({ id: "footer", type: "footer", x: M, y, width: CONTENT, height: h, column: "full" }, footerBody);
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

function flowNodeSize(node, w) {
  const titleLines = splitText(node.title, w - 72, 24, 2);
  const bodyLines = (node.body || []).slice(0, 3).flatMap((lineValue) => splitText(lineValue, w - 52, 17, 2));
  const bodyHeight = bodyLines.length ? 24 * bodyLines.length : 0;
  const titleHeight = titleLines.length ? 30 * titleLines.length : 0;
  return {
    titleLines,
    bodyLines,
    h: Math.max(198, 94 + titleHeight + bodyHeight + 42),
  };
}

function flowNode(node, x, y, w, h) {
  const t = flowTone(node);
  const measured = flowNodeSize(node, w);
  const chipFill = node.type === "result" ? "#ECFDF5" : node.type === "risk" || node.status === "risk" ? "#FFF7ED" : c.muted;
  return `${rect(x, y, w, h, c.surface, c.border, 1.5, 14, ` data-flow-node="${escapeXml(node.id)}"`)}
<rect x="${x + 22}" y="${y + 22}" width="8" height="${h - 44}" rx="4" fill="${t}" stroke="${t}" stroke-width="1"/>
${rect(x + 46, y + 22, 86, 30, chipFill, c.border, 1, 8)}
${text(x + 64, y + 43, 15, t, [flowTypeLabel(node.type)], "800")}
${text(x + 46, y + 84, 24, c.ink, measured.titleLines, "850", 30)}
${measured.bodyLines.length ? text(x + 46, y + 116 + Math.max(0, measured.titleLines.length - 1) * 30, 17, c.secondary, measured.bodyLines, "500", 24) : ""}`;
}

function arrowHead(x, y, direction = "right", stroke = c.accent) {
  if (direction === "down") {
    return `${line(x, y, x - 9, y - 12, stroke, 3)}${line(x, y, x + 9, y - 12, stroke, 3)}`;
  }
  if (direction === "up") {
    return `${line(x, y, x - 9, y + 12, stroke, 3)}${line(x, y, x + 9, y + 12, stroke, 3)}`;
  }
  if (direction === "left") {
    return `${line(x, y, x + 12, y - 9, stroke, 3)}${line(x, y, x + 12, y + 9, stroke, 3)}`;
  }
  return `${line(x, y, x - 12, y - 9, stroke, 3)}${line(x, y, x - 12, y + 9, stroke, 3)}`;
}

function flowStatement(y) {
  const body = measureLines(brief.summary, CONTENT - 96, 27, 2, 38);
  const h = Math.max(128, 78 + body.height);
  return {
    h,
    body: `${rect(M, y, CONTENT, h, c.surface, c.border, 1.5, 16)}
<rect x="${M}" y="${y}" width="12" height="${h}" rx="6" fill="${c.accent}" stroke="${c.accent}" stroke-width="1"/>
${text(M + 42, y + 44, 17, c.accent, [brief.summaryLabel || "流程判断"], "800")}
${text(M + 42, y + 88, 27, c.ink, body.lines, "800", 38)}`,
  };
}

function edgeLabel(label, x, y, maxWidth = 120) {
  if (!label) return "";
  return `${rect(x - 8, y - 22, Math.min(maxWidth, Math.max(56, estimateWidth(label, 14) + 22)), 30, c.canvas, c.border, 1, 8)}
${text(x + 4, y - 2, 14, c.secondary, splitText(label, maxWidth - 22, 14, 1), "700")}`;
}

function flowConnector(edge, boxes, stroke = c.accent) {
  const from = boxes.get(edge.from);
  const to = boxes.get(edge.to);
  if (!from || !to) return "";
  const start = { x: from.x + from.w, y: from.y + from.h / 2 };
  const end = { x: to.x, y: to.y + to.h / 2 };
  const attrs = ` data-flow-edge="${escapeXml(`${edge.from}->${edge.to}`)}" data-from="${escapeXml(edge.from)}" data-to="${escapeXml(edge.to)}" data-start="${Math.round(start.x)},${Math.round(start.y)}" data-end="${Math.round(end.x)},${Math.round(end.y)}"`;
  if (Math.abs(start.y - end.y) < 2 && end.x > start.x) {
    return `${line(start.x, start.y, end.x, end.y, stroke, 3, attrs)}
${arrowHead(end.x, end.y, "right", stroke)}`;
  }
  const midX = Math.round(start.x + (end.x - start.x) / 2);
  const points = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  const direction = end.x >= midX ? "right" : "left";
  return `${polyline(points, stroke, 3, attrs)}
${arrowHead(end.x, end.y, direction, stroke)}`;
}

function renderLinearFlow(y) {
  const nodes = brief.flowNodes || [];
  const edges = brief.flowEdges || [];
  const averageDensity = nodes.reduce((sum, node) => sum + String(node.title || "").length + (node.body || []).join("").length, 0) / Math.max(1, nodes.length);
  const cols = Math.min(averageDensity > 36 ? 3 : 4, nodes.length);
  const nodeGap = 40;
  const nodeW = Math.floor((CONTENT - nodeGap * (cols - 1)) / cols);
  const rowGap = 104;
  const boxes = new Map();
  const body = [];
  const rowHeights = [];
  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const measured = flowNodeSize(node, nodeW);
    rowHeights[row] = Math.max(rowHeights[row] || 0, measured.h);
  });
  const rowY = [];
  rowHeights.reduce((cursor, h, index) => {
    rowY[index] = cursor;
    return cursor + h + rowGap;
  }, y);
  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = M + col * (nodeW + nodeGap);
    const ny = rowY[row];
    const h = rowHeights[row];
    boxes.set(node.id, { x, y: ny, w: nodeW, h });
    body.push(flowNode(node, x, ny, nodeW, h));
  });
  edges.forEach((edge) => body.push(flowConnector(edge, boxes, c.accent)));
  return { h: rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rowHeights.length - 1) * rowGap, body: body.join("\n") };
}

function renderSwimlaneFlow(y) {
  const lanes = brief.lanes || [];
  const nodes = brief.flowNodes || [];
  const edges = brief.flowEdges || [];
  const maxStep = Math.max(...nodes.map((node) => node.step || 1));
  const laneLabelW = 168;
  const laneGap = 22;
  const stepW = Math.floor((CONTENT - laneLabelW) / maxStep);
  const nodeW = Math.max(260, stepW - 34);
  const laneH = Math.max(238, Math.max(...nodes.map((node) => flowNodeSize(node, nodeW).h)) + 44);
  const boxes = new Map();
  const body = [];

  lanes.forEach((lane, laneIndex) => {
    const ly = y + laneIndex * (laneH + laneGap);
    body.push(`${rect(M, ly, CONTENT, laneH, laneIndex % 2 === 0 ? c.surface : c.canvas, c.border, 1, 14, ` data-flow-lane="${escapeXml(lane.id)}"`)}
${text(M + 28, ly + 58, 22, c.ink, splitText(lane.title, laneLabelW - 44, 22, 1), "850")}
${line(M + laneLabelW, ly + 22, M + laneLabelW, ly + laneH - 22, c.border, 2)}`);
  });

  nodes.forEach((node) => {
    const laneIndex = lanes.findIndex((lane) => lane.id === node.lane);
    const x = M + laneLabelW + (node.step - 1) * stepW + 18;
    const ny = y + laneIndex * (laneH + laneGap) + 22;
    const h = laneH - 44;
    boxes.set(node.id, { x, y: ny, w: nodeW, h });
    body.push(flowNode(node, x, ny, nodeW, h));
  });
  edges.forEach((edge) => body.push(flowConnector(edge, boxes, c.accent)));
  return { h: lanes.length * laneH + Math.max(0, lanes.length - 1) * laneGap, body: body.join("\n") };
}

function renderFlowCanvas() {
  const title = titleBlock();
  let y = 64 + title.h;
  let body = markLayoutNode({ id: "title", type: "title", x: M, y: 40, width: CONTENT, height: title.h + 24, column: "full" }, title.body);

  const statement = flowStatement(y);
  body += markLayoutNode({ id: "statement", type: "statement", x: M, y, width: CONTENT, height: statement.h, column: "full" }, statement.body);
  y += statement.h + 56;

  const flow = brief.flowMode === "swimlane-flow" ? renderSwimlaneFlow(y) : renderLinearFlow(y);
  body += markLayoutNode({ id: "flow", type: brief.flowMode, x: M, y, width: CONTENT, height: flow.h, column: "full" }, flow.body);
  y += flow.h + 56;

  if (brief.footer) {
    const footerLines = splitText(brief.footer, CONTENT - 68, 20, 2);
    const h = 74 + (footerLines.length - 1) * 26;
    const footerBody = `${rect(M, y, CONTENT, h, c.surface, c.border, 1.3, 14)}
<rect x="${M}" y="${y}" width="10" height="${h}" rx="5" fill="${c.accent}" stroke="${c.accent}" stroke-width="1"/>
${text(M + 36, y + 46, 20, c.ink, footerLines, "800", 26)}`;
    body += markLayoutNode({ id: "footer", type: "footer", x: M, y, width: CONTENT, height: h, column: "full" }, footerBody);
    y += h + 72;
  }

  const height = Math.ceil(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" data-layout-engine="v4" data-layout="flow-canvas" data-flow-mode="${escapeXml(brief.flowMode)}">
${rect(0, 0, WIDTH, height, c.canvas, c.canvas, 0, 0)}
<g>
${body}
</g>
</svg>`;
}

fs.writeFileSync(output, brief.layout === "flow-canvas" ? renderFlowCanvas() : renderCanvas());
