import fs from "node:fs";

const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const input = value("--input");
const output = value("--output");
if (!input || !output) {
  console.error("usage: node scripts/render-whiteboard-v5.mjs --input scene-plan.json --output whiteboard.svg");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(input, "utf8"));
if (raw.selected !== undefined) throw new Error("V5 renderer requires a pure scene-plan.json, not scene-decision.json");
const plan = raw;
if (plan.engine !== "v5") throw new Error("V5 renderer requires engine: v5");

const styles = {
  "linear-system": { canvas: "#F7F8FA", surface: "#FFFFFF", muted: "#F1F3F6", ink: "#111827", secondary: "#5F6B7A", border: "#D8DEE8", accent: "#5E6AD2", soft: "#ECEEFE", success: "#168570", risk: "#8A5A44", line: "#9AA5B4" },
  "professional-blue": { canvas: "#F7FAFC", surface: "#FFFFFF", muted: "#EEF4FA", ink: "#172033", secondary: "#5C6B82", border: "#D8E2EF", accent: "#2563EB", soft: "#DBEAFE", success: "#0F766E", risk: "#8A5A44", line: "#9AA9BC" },
  "apple-report": { canvas: "#F5F5F7", surface: "#FFFFFF", muted: "#F2F2F7", ink: "#1D1D1F", secondary: "#6E6E73", border: "#D2D2D7", accent: "#007AFF", soft: "#E8F2FF", success: "#248A3D", risk: "#8A5A44", line: "#A1A1A6" },
  "stripe-data": { canvas: "#F6F9FC", surface: "#FFFFFF", muted: "#F0F6FF", ink: "#0A2540", secondary: "#53657D", border: "#D9E5F2", accent: "#635BFF", soft: "#EEF2FF", success: "#008C76", risk: "#7A5A46", line: "#879AAF" },
  "vercel-precision": { canvas: "#FFFFFF", surface: "#FFFFFF", muted: "#F5F5F5", ink: "#000000", secondary: "#666666", border: "#D8D8D8", accent: "#000000", soft: "#F5F5F5", success: "#000000", risk: "#666666", line: "#999999" },
  "feishu-status": { canvas: "#F6FAFE", surface: "#FFFFFF", muted: "#EEF6FF", ink: "#172033", secondary: "#5C6B82", border: "#D8E6F3", accent: "#3370FF", soft: "#EAF2FF", success: "#0F766E", risk: "#8A5A44", line: "#90A4BA" }
};
const c = styles[plan.style];
if (!c) throw new Error(`unsupported V5 style: ${plan.style}`);

const WIDTH = 2200;
const M = 96;
const CONTENT = WIDTH - M * 2;
const esc = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function estimate(value, size) {
  return [...String(value)].reduce((sum, char) => sum + (/[一-鿿　-〿＀-￯]/.test(char) ? size : size * 0.62), 0);
}

function wrap(value, maxWidth, size, maxLines = 3) {
  const chunks = [];
  let current = "";
  for (const char of String(value || "").trim()) {
    if (current && estimate(current + char, size) > maxWidth) {
      chunks.push(current);
      current = char;
    } else current += char;
  }
  if (current) chunks.push(current);
  const visible = chunks.slice(0, maxLines);
  if (chunks.length > maxLines) {
    let last = visible.at(-1).replace(/[，。；：,.;:]$/, "");
    while (last && estimate(`${last}…`, size) > maxWidth) last = last.slice(0, -1);
    visible[visible.length - 1] = `${last}…`;
  }
  return visible;
}

function text(x, y, size, fill, lines, weight = 500, anchor = "start", lineHeight = Math.round(size * 1.35), attrs = "") {
  const list = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${attrs}>${list.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${esc(line)}</tspan>`).join("")}</text>`;
}
const rect = (x, y, w, h, fill = c.surface, stroke = c.border, sw = 1.5, rx = 12, attrs = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${attrs}/>`;
const line = (x1, y1, x2, y2, stroke = c.line, sw = 3, attrs = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${attrs}/>`;
const polyline = (points, stroke = c.line, sw = 3, attrs = "") => `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${attrs}/>`;
const tone = (status) => status === "risk" ? c.risk : status === "good" ? c.success : c.accent;
const sourceAttrs = (value) => {
  const ids = Array.isArray(value?.sourceFactIds) ? value.sourceFactIds : Array.isArray(value) ? value : [];
  return ` data-source-fact-ids="${esc(ids.join(","))}"`;
};

function arrowHead(x, y, angle, color = c.accent, size = 12) {
  const back = angle + Math.PI;
  const a = { x, y };
  const b = { x: x + Math.cos(back + 0.55) * size, y: y + Math.sin(back + 0.55) * size };
  const d = { x: x + Math.cos(back - 0.55) * size, y: y + Math.sin(back - 0.55) * size };
  return `<polygon points="${a.x},${a.y} ${b.x},${b.y} ${d.x},${d.y}" fill="${color}" stroke="${color}" stroke-width="1"/>`;
}

function header() {
  const titleLines = wrap(plan.title, CONTENT, 46, 2);
  const subtitleLines = wrap(plan.subtitle || "", CONTENT, 20, 2);
  const summaryLines = wrap(plan.summary, CONTENT - 96, 29, 3);
  const titleH = titleLines.length * 58 + subtitleLines.length * 28;
  const summaryH = Math.max(146, 90 + summaryLines.length * 40);
  const summaryY = 70 + titleH + 34;
  return {
    bottom: summaryY + summaryH,
    svg: `${text(M, 88, 46, c.ink, titleLines, 800, "start", 58)}
${subtitleLines.length ? text(M, 88 + titleLines.length * 58, 20, c.secondary, subtitleLines, 500, "start", 28) : ""}
${rect(M, summaryY, CONTENT, summaryH, c.surface, c.border, 1.5, 14, ` data-v5-summary="true" data-source-fact-ids="${esc((plan.summarySourceFactIds || []).join(","))}"`)}
<rect x="${M}" y="${summaryY}" width="12" height="${summaryH}" rx="6" fill="${c.accent}"/>
${text(M + 42, summaryY + 48, 17, c.accent, ["核心判断"], 800)}
${text(M + 42, summaryY + 98, 29, c.ink, summaryLines, 750, "start", 40)}`
  };
}

function nodeCard(node, x, y, w, h, number = "") {
  const titleLines = wrap(node.title, w - 48, 20, 2);
  const noteLines = wrap(node.note || "", w - 48, 16, 2);
  const color = tone(node.status);
  return `${rect(x, y, w, h, c.surface, c.border, 1.4, 12, ` data-scene-node="${esc(node.id)}"${sourceAttrs(node)}`)}
<rect x="${x}" y="${y}" width="7" height="${h}" rx="3.5" fill="${color}"/>
${number ? text(x + 26, y + 31, 14, color, [number], 800) : ""}
${text(x + 24, y + (number ? 61 : 40), 20, c.ink, titleLines, 750, "start", 26)}
${noteLines.length ? text(x + 24, y + (number ? 61 : 40) + titleLines.length * 26 + 16, 16, c.secondary, noteLines, 450, "start", 22) : ""}`;
}

function renderArchitecture(startY) {
  const layers = plan.layers || [];
  const nodeMap = new Map(plan.nodes.map((node) => [node.id, node]));
  const labelW = 250;
  const bodyX = M + labelW + 24;
  const bodyW = CONTENT - labelW - 24;
  let y = startY + 38;
  const parts = [text(M, startY, 25, c.ink, ["分层结构"], 800)];
  const positions = new Map();
  for (const [layerIndex, layer] of layers.entries()) {
    const nodes = layer.nodeIds.map((id) => nodeMap.get(id)).filter(Boolean);
    const columns = nodes.length <= 3 ? nodes.length : Math.min(4, Math.ceil(nodes.length / 2));
    const rows = Math.ceil(nodes.length / columns);
    const gap = 18;
    const cardW = (bodyW - gap * (columns - 1)) / columns;
    const cardH = 116;
    const bandH = 44 + rows * cardH + (rows - 1) * gap;
    parts.push(rect(M, y, CONTENT, bandH, layerIndex % 2 ? c.surface : c.soft, c.border, 1.4, 14, ` data-scene-layer="${esc(layer.id)}" data-source-fact-ids="${esc((layer.sourceFactIds || []).join(","))}"`));
    parts.push(text(M + 28, y + 42, 19, c.accent, [`0${layerIndex + 1}`], 800));
    parts.push(text(M + 28, y + 82, 24, c.ink, wrap(layer.title, labelW - 54, 24, 3), 800, "start", 31));
    nodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = bodyX + col * (cardW + gap);
      const cy = y + 22 + row * (cardH + gap);
      positions.set(node.id, { x, y: cy, w: cardW, h: cardH });
      parts.push(nodeCard(node, x, cy, cardW, cardH));
    });
    y += bandH + 22;
  }
  for (const edge of plan.edges || []) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h;
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    parts.push(polyline([{ x: x1, y: y1 }, { x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: y2 - 9 }], c.line, 2.4));
    parts.push(arrowHead(x2, y2 - 2, Math.PI / 2, c.line, 10));
  }
  return { svg: parts.join("\n"), bottom: y - 22 };
}

function renderSwimlane(startY) {
  const lanes = plan.lanes || [];
  const laneH = 176;
  const labelW = 210;
  const axisX = M + labelW;
  const axisW = CONTENT - labelW;
  const ordered = [...plan.nodes].sort((a, b) => (a.order || 0) - (b.order || 0));
  const columns = ordered.length;
  const gap = 18;
  const cardW = Math.max(150, Math.min(250, (axisW - gap * Math.max(0, columns - 1)) / Math.max(1, columns)));
  const contentW = columns * cardW + Math.max(0, columns - 1) * gap;
  const offsetX = axisX + Math.max(0, (axisW - contentW) / 2);
  const parts = [text(M, startY, 25, c.ink, ["责任流转"], 800)];
  const top = startY + 38;
  const positions = new Map();
  lanes.forEach((lane, laneIndex) => {
    const y = top + laneIndex * laneH;
    parts.push(rect(M, y, CONTENT, laneH - 10, laneIndex % 2 ? c.surface : c.soft, c.border, 1.3, 10, ` data-scene-lane="${esc(lane.id)}" data-source-fact-ids="${esc((lane.sourceFactIds || []).join(","))}"`));
    parts.push(text(M + 26, y + 54, 22, c.ink, wrap(lane.title, labelW - 52, 22, 3), 750, "start", 29));
  });
  ordered.forEach((node, index) => {
    const laneIndex = Math.max(0, lanes.findIndex((lane) => lane.id === node.laneId));
    const x = offsetX + index * (cardW + gap);
    const y = top + laneIndex * laneH + 24;
    const h = laneH - 58;
    positions.set(node.id, { x, y, w: cardW, h });
    parts.push(nodeCard(node, x, y, cardW, h, String(index + 1).padStart(2, "0")));
  });
  for (const edge of plan.edges || []) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;
    const bendX = (x1 + x2) / 2;
    parts.push(polyline([{ x: x1 + 4, y: y1 }, { x: bendX, y: y1 }, { x: bendX, y: y2 }, { x: x2 - 10, y: y2 }], c.accent, 3));
    parts.push(arrowHead(x2 - 2, y2, 0, c.accent, 11));
    if (edge.label) parts.push(text(bendX + 8, (y1 + y2) / 2 - 8, 14, c.secondary, wrap(edge.label, 120, 14, 2), 600));
  }
  return { svg: parts.join("\n"), bottom: top + lanes.length * laneH - 10 };
}

function renderFlywheel(startY) {
  const count = plan.nodes.length;
  const cx = WIDTH / 2;
  const cy = startY + 430;
  const cardR = 430;
  const cardW = 300;
  const cardH = 132;
  const parts = [text(M, startY, 25, c.ink, ["闭环机制"], 800)];
  const segment = (Math.PI * 2) / count;
  const positions = plan.nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index + 0.5) * segment;
    const cardCx = cx + cardR * Math.cos(angle);
    const cardCy = cy + cardR * Math.sin(angle);
    return { node, angle, cardCx, cardCy };
  });
  // A polygonal loop is more robust in Feishu than nested SVG arcs. The
  // connectors run behind the cards, while arrowheads make the cycle explicit.
  for (let index = 0; index < positions.length; index += 1) {
    const from = positions[index];
    const to = positions[(index + 1) % positions.length];
    parts.push(line(from.cardCx, from.cardCy, to.cardCx, to.cardCy, c.line, 4));
    const progress = 0.68;
    const arrowX = from.cardCx + (to.cardCx - from.cardCx) * progress;
    const arrowY = from.cardCy + (to.cardCy - from.cardCy) * progress;
    const arrowAngle = Math.atan2(to.cardCy - from.cardCy, to.cardCx - from.cardCx);
    parts.push(arrowHead(arrowX, arrowY, arrowAngle, c.accent, 14));
  }
  positions.forEach(({ node, cardCx, cardCy }, index) => {
    parts.push(nodeCard(node, cardCx - cardW / 2, cardCy - cardH / 2, cardW, cardH, String(index + 1).padStart(2, "0")));
  });
  // Feishu's importer cannot reliably calculate text containment for circles.
  // Keep the circular motion outside, but use a rectangular center information
  // carrier so the SVG and Feishu share the same deterministic box model.
  const centerW = 330;
  const centerH = 166;
  const centerX = cx - centerW / 2;
  const centerY = cy - centerH / 2;
  parts.push(rect(centerX, centerY, centerW, centerH, c.surface, c.border, 1.5, 18, ` data-scene-center="true"`));
  const centerTitle = plan.centerTitle || "持续增长闭环";
  const centerLines = centerTitle.length > 4
    ? [centerTitle.slice(0, 4), centerTitle.slice(4)]
    : [centerTitle];
  const centerTitleY = centerY + 50 - ((centerLines.length - 1) * 31) / 2;
  parts.push(text(centerX + 28, centerTitleY, 22, c.ink, centerLines, 800, "start", 31));
  parts.push(text(centerX + 28, centerY + centerH - 38, 13, c.secondary, ["输入 · 反馈", "复用"], 600, "start", 20));
  return { svg: parts.join("\n"), bottom: cy + cardR + cardH / 2 };
}

function renderDecisionComparison(startY) {
  const nodeMap = new Map(plan.nodes.map((node) => [node.id, node]));
  const options = (plan.optionNodeIds || []).map((id) => nodeMap.get(id)).filter(Boolean);
  const criteria = (plan.criterionNodeIds || []).map((id) => nodeMap.get(id)).filter(Boolean);
  const parts = [text(M, startY, 25, c.ink, ["方案评估"], 800)];
  const top = startY + 42;
  const labelW = 300;
  const gridX = M + labelW;
  const optionW = (CONTENT - labelW) / options.length;
  const headerH = 126;
  parts.push(rect(M, top, CONTENT, headerH, c.surface, c.border, 1.4, 12));
  parts.push(text(M + 28, top + 52, 18, c.secondary, ["评价标准"], 750));
  options.forEach((option, index) => {
    const x = gridX + index * optionW;
    if (index) parts.push(line(x, top + 18, x, top + headerH - 18, c.border, 1.2));
    parts.push(text(x + 26, top + 42, 14, c.accent, [`方案 ${String.fromCharCode(65 + index)}`], 800));
    parts.push(text(x + 26, top + 78, 21, c.ink, wrap(option.title, optionW - 52, 21, 2), 750, "start", 28, ` data-scene-node="${esc(option.id)}"${sourceAttrs(option)}`));
  });
  const edgeMap = new Map();
  for (const edge of plan.edges || []) edgeMap.set(`${edge.from}->${edge.to}`, edge.type);
  const rowH = 88;
  criteria.forEach((criterion, row) => {
    const y = top + headerH + row * rowH;
    parts.push(rect(M, y, CONTENT, rowH, row % 2 ? c.surface : c.soft, c.border, 1, 0));
    parts.push(text(M + 28, y + 36, 18, c.ink, wrap(criterion.title, labelW - 56, 18, 2), 700, "start", 24, ` data-scene-node="${esc(criterion.id)}"${sourceAttrs(criterion)}`));
    options.forEach((option, col) => {
      const x = gridX + col * optionW;
      if (col) parts.push(line(x, y + 12, x, y + rowH - 12, c.border, 1));
      const type = edgeMap.get(`${criterion.id}->${option.id}`) || edgeMap.get(`${option.id}->${criterion.id}`);
      const symbol = type === "supports" ? "匹配" : type === "conflicts-with" ? "冲突" : type === "depends-on" ? "依赖" : type === "contrasts" ? "差异" : "待验证";
      const color = type === "supports" ? c.success : type === "conflicts-with" ? c.risk : c.accent;
      parts.push(`<circle cx="${x + 32}" cy="${y + 43}" r="7" fill="${color}"/>`);
      parts.push(text(x + 52, y + 49, 16, color, [symbol], 700));
    });
  });
  const matrixBottom = top + headerH + criteria.length * rowH;
  const recY = matrixBottom + 28;
  const recLines = wrap(plan.recommendation || plan.summary, CONTENT - 90, 23, 2);
  parts.push(rect(M, recY, CONTENT, 118, c.soft, c.accent, 1.5, 12, ` data-v5-recommendation="true"${sourceAttrs(plan.recommendationSourceFactIds || [])}`));
  parts.push(text(M + 30, recY + 38, 15, c.accent, ["推荐结论"], 800));
  parts.push(text(M + 30, recY + 76, 23, c.ink, recLines, 750, "start", 31));
  return { svg: parts.join("\n"), bottom: recY + 118 };
}

function renderEvidenceArgument(startY) {
  const nodeMap = new Map(plan.nodes.map((node) => [node.id, node]));
  const thesis = nodeMap.get(plan.thesisNodeId);
  const evidence = (plan.evidenceNodeIds || []).map((id) => nodeMap.get(id)).filter(Boolean);
  const parts = [text(M, startY, 25, c.ink, ["论证结构"], 800)];
  const thesisW = 600;
  const thesisH = 180;
  const thesisX = (WIDTH - thesisW) / 2;
  const cardW = 460;
  const cardH = 174;
  const rowGap = 32;
  const leftEvidence = evidence.filter((_, index) => index % 2 === 0);
  const rightEvidence = evidence.filter((_, index) => index % 2 === 1);
  const maxRows = Math.max(leftEvidence.length, rightEvidence.length);
  const fieldY = startY + 54;
  const fieldH = maxRows * cardH + Math.max(0, maxRows - 1) * rowGap;
  const thesisY = fieldY + Math.max(0, (fieldH - thesisH) / 2);
  parts.push(rect(thesisX, thesisY, thesisW, thesisH, c.soft, c.accent, 2, 16, ` data-scene-node="${esc(thesis.id)}"${sourceAttrs(thesis)}`));
  parts.push(text(thesisX + 34, thesisY + 42, 15, c.accent, ["中心论点"], 800));
  parts.push(text(thesisX + 34, thesisY + 88, 25, c.ink, wrap(thesis.title, thesisW - 68, 25, 2), 800, "start", 34));
  const positions = [];
  const placeSide = (nodes, side) => nodes.forEach((node, row) => {
    const x = side === "left" ? M : WIDTH - M - cardW;
    const y = fieldY + row * (cardH + rowGap);
    const index = evidence.indexOf(node);
    positions.push({ x, y, node, side, row, sideCount: nodes.length });
    const color = node.status === "risk" ? c.risk : c.accent;
    parts.push(rect(x, y, cardW, cardH, c.surface, c.border, 1.4, 12, ` data-scene-node="${esc(node.id)}"${sourceAttrs(node)}`));
    parts.push(text(x + 24, y + 34, 14, color, [`证据 ${String(index + 1).padStart(2, "0")}`], 800));
    parts.push(text(x + 24, y + 76, 19, c.ink, wrap(node.title, cardW - 48, 19, 2), 750, "start", 27));
    if (node.note) parts.push(text(x + 24, y + 140, 13, c.secondary, wrap(node.note, cardW - 48, 13, 2), 500, "start", 19));
  });
  placeSide(leftEvidence, "left");
  placeSide(rightEvidence, "right");
  positions.forEach(({ x, y, side, row, sideCount }) => {
    const fromX = side === "left" ? x + cardW : x;
    const fromY = y + cardH / 2;
    const targetX = side === "left" ? thesisX : thesisX + thesisW;
    const anchorStep = thesisH / (sideCount + 1);
    const targetY = thesisY + anchorStep * (row + 1);
    const elbowX = side === "left" ? targetX - 34 : targetX + 34;
    parts.unshift(line(fromX, fromY, elbowX, fromY, c.line, 2.2));
    parts.unshift(line(elbowX, fromY, elbowX, targetY, c.line, 2.2));
    parts.unshift(line(elbowX, targetY, targetX, targetY, c.line, 2.2));
    parts.unshift(arrowHead(targetX, targetY, side === "left" ? 0 : Math.PI, c.accent, 10));
  });
  return { svg: parts.join("\n"), bottom: fieldY + fieldH };
}

function renderOperatingDashboard(startY) {
  const nodeMap = new Map(plan.nodes.map((node) => [node.id, node]));
  const metrics = (plan.metricNodeIds || []).map((id) => nodeMap.get(id)).filter(Boolean);
  const support = (plan.supportNodeIds || []).map((id) => nodeMap.get(id)).filter(Boolean);
  const parts = [text(M, startY, 25, c.ink, ["经营概览"], 800)];
  const top = startY + 44;
  const heroMetrics = metrics.slice(0, 3);
  const cardGap = 22;
  const cardW = (CONTENT - cardGap * 2) / 3;
  const cardH = 172;
  heroMetrics.forEach((node, index) => {
    const x = M + index * (cardW + cardGap);
    parts.push(rect(x, top, cardW, cardH, c.surface, c.border, 1.4, 12, ` data-scene-node="${esc(node.id)}"${sourceAttrs(node)}`));
    parts.push(text(x + 28, top + 38, 15, c.secondary, wrap(node.title, cardW - 56, 15, 1), 650));
    parts.push(text(x + 28, top + 96, 36, tone(node.status), [node.value || cleanTitle(node.title, 16)], 800));
    if (node.note && node.note !== node.value) parts.push(text(x + 28, top + 140, 14, c.secondary, wrap(node.note, cardW - 56, 14, 1), 500));
  });
  const lowerY = top + cardH + 28;
  const leftW = (CONTENT - 24) * 0.55;
  const rightW = CONTENT - leftW - 24;
  const panelH = 300;
  parts.push(rect(M, lowerY, leftW, panelH, c.surface, c.border, 1.4, 12));
  const isProgressMetric = (node) => node.unit === "%"
    && node.numericValue >= 0
    && node.numericValue <= 100
    && /率|进度|占比|达成/.test(node.title);
  const remainingPercentMetrics = metrics.slice(3).filter(isProgressMetric);
  const progressMetrics = (remainingPercentMetrics.length ? remainingPercentMetrics : metrics.filter(isProgressMetric)).slice(0, 3);
  parts.push(text(M + 28, lowerY + 42, 21, c.ink, [progressMetrics.length ? "指标进展" : "指标信号"], 800));
  const indicatorRows = progressMetrics.length ? progressMetrics : metrics.slice(0, 3);
  indicatorRows.forEach((node, index) => {
    const y = lowerY + 92 + index * 62;
    parts.push(text(M + 28, y, 16, c.ink, wrap(node.title, 190, 16, 1), 650));
    const barX = M + 250;
    const barW = leftW - 330;
    if (progressMetrics.length) {
      const value = Math.max(0, Math.min(100, node.numericValue));
      parts.push(rect(barX, y - 17, barW, 16, c.muted, "none", 0, 8, ` data-scene-node="${esc(node.id)}"${sourceAttrs(node)}`));
      parts.push(rect(barX, y - 17, barW * value / 100, 16, c.accent, "none", 0, 8));
      parts.push(text(M + leftW - 62, y, 15, c.secondary, [node.value], 700));
    } else {
      parts.push(line(barX, y - 8, M + leftW - 88, y - 8, c.border, 1.5, ` data-scene-node="${esc(node.id)}"${sourceAttrs(node)}`));
      parts.push(text(M + leftW - 62, y, 17, tone(node.status), [node.value || "定性"], 750));
    }
  });
  const rightX = M + leftW + 24;
  parts.push(rect(rightX, lowerY, rightW, panelH, c.surface, c.border, 1.4, 12));
  parts.push(text(rightX + 28, lowerY + 42, 21, c.ink, ["风险与行动"], 800));
  support.slice(0, 4).forEach((node, index) => {
    const y = lowerY + 68 + index * 56;
    const color = node.kind === "risk" ? c.risk : node.kind === "action" ? c.success : c.accent;
    parts.push(rect(rightX + 28, y, rightW - 56, 48, c.muted, c.border, 1, 8, ` data-scene-node="${esc(node.id)}"${sourceAttrs(node)}`));
    parts.push(`<circle cx="${rightX + 48}" cy="${y + 18}" r="6" fill="${color}"/>`);
    parts.push(text(rightX + 66, y + 23, 15, c.ink, wrap(node.title, rightW - 110, 15, 1), 650));
    if (node.note) parts.push(text(rightX + 66, y + 41, 12, c.secondary, wrap(node.note, rightW - 110, 12, 1), 500));
  });
  return { svg: parts.join("\n"), bottom: lowerY + panelH };
}

const head = header();
const startY = head.bottom + 54;
const renderers = {
  "layered-architecture": renderArchitecture,
  "swimlane-process": renderSwimlane,
  "flywheel-loop": renderFlywheel,
  "decision-comparison": renderDecisionComparison,
  "evidence-argument": renderEvidenceArgument,
  "operating-dashboard": renderOperatingDashboard,
};
const scene = renderers[plan.scene](startY);
const minimumHeight = plan.scene === "evidence-argument" ? Math.ceil(WIDTH / 2.15) : 1160;
const height = Math.max(minimumHeight, Math.ceil(scene.bottom + 92));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" data-layout-engine="v5" data-pipeline-version="5.0-beta.1" data-scene="${esc(plan.scene)}" data-content-bottom="${Math.ceil(scene.bottom)}">
<rect x="0" y="0" width="${WIDTH}" height="${height}" fill="${c.canvas}"/>
${head.svg}
${scene.svg}
</svg>`;
fs.writeFileSync(output, `${svg}\n`);
