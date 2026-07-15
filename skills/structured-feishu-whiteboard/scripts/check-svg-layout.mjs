import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-svg-layout.mjs diagram.svg");
  process.exit(1);
}

const svg = fs.readFileSync(file, "utf8");
const rootAttrs = attrs(svg.match(/<svg\b([^>]*)>/)?.[1] || "");
const viewBox = String(rootAttrs.viewBox || "").split(/\s+/).map(Number);
const canvas = {
  x: Number.isFinite(viewBox[0]) ? viewBox[0] : 0,
  y: Number.isFinite(viewBox[1]) ? viewBox[1] : 0,
  w: num(rootAttrs.width) || viewBox[2] || 0,
  h: num(rootAttrs.height) || viewBox[3] || 0,
};

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

const rects = [...svg.matchAll(/<rect\b([^>]*)\/>/g)].map((match, index) => {
  const a = attrs(match[1]);
  return {
    index,
    x: num(a.x),
    y: num(a.y),
    w: num(a.width),
    h: num(a.height),
  };
}).filter((rect) => rect.w > 0 && rect.h > 0);

const texts = [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].map((match, index) => {
  const a = attrs(match[1]);
  const tspans = [...match[2].matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g)].map((entry) => ({
    attrs: attrs(entry[1]),
    value: entry[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
  }));
  const lines = tspans.map((entry) => entry.value);
  return {
    index,
    x: num(a.x),
    y: num(a.y),
    size: num(a["font-size"]),
    anchor: a["text-anchor"] || "start",
    externalLabel: a["data-chart-external-label"] === "true" || a["data-flow-edge-label"] !== undefined,
    lines,
    tspans,
  };
});

function area(rect) {
  return rect.w * rect.h;
}

function containsStart(parent, child) {
  return parent.x <= child.x && parent.y <= child.y
    && parent.x + parent.w >= child.x && parent.y + parent.h >= child.y;
}

function findParentRect(child, excludeIndex = -1) {
  return rects
    .filter((rect) => rect.index !== excludeIndex && rect.w > child.w && rect.h > child.h && containsStart(rect, child))
    .sort((a, b) => area(a) - area(b))[0];
}

function lineWidth(line, size) {
  let width = 0;
  for (const char of line) {
    width += /[\u4E00-\u9FFF]/.test(char) ? size : size * 0.62;
  }
  return width;
}

const issues = [];

for (const rect of rects) {
  if (canvas.w && canvas.h && (rect.x < canvas.x || rect.y < canvas.y || rect.x + rect.w > canvas.x + canvas.w || rect.y + rect.h > canvas.y + canvas.h)) {
    issues.push(`rect ${rect.index} exceeds root canvas`);
  }
  const parent = findParentRect(rect, rect.index);
  if (!parent) continue;
  if (rect.x + rect.w > parent.x + parent.w + 1 || rect.y + rect.h > parent.y + parent.h + 1) {
    issues.push(`rect ${rect.index} exceeds parent rect ${parent.index}`);
  }
}

for (const text of texts) {
  const longestLine = Math.max(...text.lines.map((line) => lineWidth(line, text.size)));
  const estimatedLeft = text.anchor === "middle" ? text.x - longestLine / 2 : text.anchor === "end" ? text.x - longestLine : text.x;
  const estimatedRight = text.anchor === "middle" ? text.x + longestLine / 2 : text.anchor === "end" ? text.x : text.x + longestLine;
  let baseline = text.y;
  let estimatedBottom = baseline + text.size * 0.18;
  for (const [index, tspan] of text.tspans.entries()) {
    const explicitY = tspan.attrs.y === undefined ? Number.NaN : num(tspan.attrs.y);
    const dy = tspan.attrs.dy === undefined ? (index === 0 ? 0 : text.size * 1.25) : num(tspan.attrs.dy);
    baseline = Number.isFinite(explicitY) ? explicitY : baseline + dy;
    estimatedBottom = Math.max(estimatedBottom, baseline + text.size * 0.18);
  }
  if (canvas.w && canvas.h && (estimatedLeft < canvas.x || estimatedRight > canvas.x + canvas.w || text.y - text.size < canvas.y || estimatedBottom > canvas.y + canvas.h)) {
    issues.push(`text "${text.lines.join(" / ")}" exceeds root canvas`);
    continue;
  }
  const parent = findParentRect({ x: text.x, y: text.y - text.size, w: 1, h: text.size });
  if (!parent) continue;
  if (estimatedLeft < parent.x + 8) {
    issues.push(`text "${text.lines.join(" / ")}" likely exceeds parent rect ${parent.index}`);
    continue;
  }
  if (estimatedRight > parent.x + parent.w - 8) {
    issues.push(`text "${text.lines.join(" / ")}" likely exceeds parent rect ${parent.index}`);
  }
  // Small rectangles are content containers (cards, rows, pills). Larger
  // rectangles may be chart bars or lanes whose labels intentionally sit
  // outside the shape; their containment is enforced by the outer layout node.
  const isStrictVerticalContainer = parent.h <= 96 || baseline <= parent.y + parent.h;
  if (!text.externalLabel && isStrictVerticalContainer && estimatedBottom > parent.y + parent.h) {
    issues.push(`text "${text.lines.join(" / ")}" likely exceeds parent rect ${parent.index} vertically`);
  }
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("ok: svg layout containment check passed");
