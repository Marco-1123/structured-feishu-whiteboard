import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-v4-layout.mjs diagram.svg");
  process.exit(1);
}

const svg = fs.readFileSync(file, "utf8");
const issues = [];

function attrs(source) {
  const out = {};
  for (const [, key, value] of source.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
    out[key] = value;
  }
  return out;
}

function num(value) {
  return Number.parseFloat(value || "0");
}

function point(value) {
  const [x, y] = String(value || "").split(",").map(Number);
  return { x, y };
}

function touchesBoundary(rect, p, tolerance = 2) {
  const onLeft = Math.abs(p.x - rect.x) <= tolerance && p.y >= rect.y - tolerance && p.y <= rect.y + rect.h + tolerance;
  const onRight = Math.abs(p.x - (rect.x + rect.w)) <= tolerance && p.y >= rect.y - tolerance && p.y <= rect.y + rect.h + tolerance;
  const onTop = Math.abs(p.y - rect.y) <= tolerance && p.x >= rect.x - tolerance && p.x <= rect.x + rect.w + tolerance;
  const onBottom = Math.abs(p.y - (rect.y + rect.h)) <= tolerance && p.x >= rect.x - tolerance && p.x <= rect.x + rect.w + tolerance;
  return onLeft || onRight || onTop || onBottom;
}

function textWidth(line, size) {
  let width = 0;
  for (const char of String(line || "")) {
    if (/[\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/.test(char)) width += size;
    else if (/[A-Z0-9%+.-]/.test(char)) width += size * 0.66;
    else width += size * 0.54;
  }
  return width;
}

if (!svg.includes('data-layout-engine="v4"')) {
  issues.push("missing V4 layout engine marker");
}

if (/<text\b[^>]*fill="#(?:FFF|FFFFFF|ffffff)"/.test(svg)) {
  issues.push("V4 text must not rely on white text over strong color blocks");
}

if (/<(?:linearGradient|radialGradient|filter|clipPath|mask|polygon)\b|opacity=|fill-opacity=|stroke-opacity=/.test(svg)) {
  issues.push("V4 output contains forbidden SVG features");
}

const riskTones = new Set(["#7A5A46", "#8A5A44", "#A16207"]);
for (const [, attrs] of svg.matchAll(/<rect\b([^>]*)\/>/g)) {
  if (!attrs.includes('data-tone-group="parallel-metrics"')) continue;
  const fill = attrs.match(/\bfill="([^"]+)"/)?.[1];
  const stroke = attrs.match(/\bstroke="([^"]+)"/)?.[1];
  if (riskTones.has(fill) || riskTones.has(stroke)) {
    issues.push("parallel metric group uses risk tone; keep metric color semantics consistent");
  }
}

if (svg.includes('data-layout="flow-canvas"')) {
  const nodes = new Map();
  for (const [, raw] of svg.matchAll(/<rect\b([^>]*)\/>/g)) {
    const a = attrs(raw);
    if (!a["data-flow-node"]) continue;
    nodes.set(a["data-flow-node"], {
      x: num(a.x),
      y: num(a.y),
      w: num(a.width),
      h: num(a.height),
    });
  }

  if (nodes.size < 4) {
    issues.push("flow-canvas must render at least four flow nodes");
  }

  for (const [, rawAttrs, rawBody] of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = attrs(rawAttrs);
    const x = num(a.x);
    const y = num(a.y);
    const size = num(a["font-size"]);
    const lines = [...rawBody.matchAll(/<tspan\b[^>]*>([\s\S]*?)<\/tspan>/g)].map(([, value]) => value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    const parent = [...nodes.values()].find((node) => x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h);
    if (!parent) continue;
    const lineHeight = Math.round(size * 1.38);
    const bottom = y + Math.max(0, lines.length - 1) * lineHeight;
    const right = x + Math.max(0, ...lines.map((line) => textWidth(line, size)));
    if (bottom > parent.y + parent.h - 12) {
      issues.push(`flow node text "${lines.join(" / ")}" exceeds node bottom`);
    }
    if (right > parent.x + parent.w - 12) {
      issues.push(`flow node text "${lines.join(" / ")}" exceeds node right edge`);
    }
  }

  const edgePattern = /<(?:line|polyline)\b([^>]*)\/>/g;
  let edgeCount = 0;
  for (const [, raw] of svg.matchAll(edgePattern)) {
    const a = attrs(raw);
    if (!a["data-flow-edge"]) continue;
    edgeCount += 1;
    const from = nodes.get(a["data-from"]);
    const to = nodes.get(a["data-to"]);
    if (!from || !to) {
      issues.push(`flow edge ${a["data-flow-edge"]} references missing node`);
      continue;
    }
    const start = point(a["data-start"]);
    const end = point(a["data-end"]);
    if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !touchesBoundary(from, start)) {
      issues.push(`flow edge ${a["data-flow-edge"]} start does not touch source node boundary`);
    }
    if (!Number.isFinite(end.x) || !Number.isFinite(end.y) || !touchesBoundary(to, end)) {
      issues.push(`flow edge ${a["data-flow-edge"]} end does not touch target node boundary`);
    }
  }

  if (edgeCount < nodes.size - 1) {
    issues.push("flow-canvas must render enough connectors for the node chain");
  }

  if (svg.includes('data-flow-mode="swimlane-flow"')) {
    const laneCount = [...svg.matchAll(/data-flow-lane="/g)].length;
    if (laneCount < 2) {
      issues.push("swimlane-flow must render lane markers");
    }
  }
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("ok: V4 layout constraints passed");
