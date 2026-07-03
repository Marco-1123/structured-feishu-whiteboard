import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-v4-layout.mjs diagram.svg");
  process.exit(1);
}

const svg = fs.readFileSync(file, "utf8");
const issues = [];

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

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("ok: V4 layout constraints passed");
