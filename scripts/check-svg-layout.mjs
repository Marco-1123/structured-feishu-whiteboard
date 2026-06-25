import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-svg-layout.mjs diagram.svg");
  process.exit(1);
}

const svg = fs.readFileSync(file, "utf8");

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
  const lines = [...match[2].matchAll(/<tspan\b[^>]*>([\s\S]*?)<\/tspan>/g)]
    .map(([, value]) => value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  return {
    index,
    x: num(a.x),
    y: num(a.y),
    size: num(a["font-size"]),
    lines,
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
  const parent = findParentRect(rect, rect.index);
  if (!parent) continue;
  if (rect.x + rect.w > parent.x + parent.w + 1 || rect.y + rect.h > parent.y + parent.h + 1) {
    issues.push(`rect ${rect.index} exceeds parent rect ${parent.index}`);
  }
}

for (const text of texts) {
  const parent = findParentRect({ x: text.x, y: text.y - text.size, w: 1, h: text.size });
  if (!parent) continue;
  const longestLine = Math.max(...text.lines.map((line) => lineWidth(line, text.size)));
  const estimatedRight = text.x + longestLine;
  if (estimatedRight > parent.x + parent.w - 8) {
    issues.push(`text "${text.lines.join(" / ")}" likely exceeds parent rect ${parent.index}`);
  }
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("ok: svg layout containment check passed");
