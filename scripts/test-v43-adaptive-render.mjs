import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v43-adaptive-"));

function render(briefName) {
  const output = path.join(temp, `${briefName}.svg`);
  execFileSync(process.execPath, [
    path.join(root, "scripts/render-whiteboard-v4.mjs"),
    "--input", path.join(root, `examples/briefs/${briefName}.json`),
    "--output", output,
  ], { stdio: "pipe" });
  return fs.readFileSync(output, "utf8");
}

try {
  const sparse = render("v43-sparse-stack-regression");
  const compactSpans = [...sparse.matchAll(/data-span="(4|6|8)"/g)];
  assert.ok(compactSpans.length >= 3, "sparse regression should contain at least three compact top-level blocks");
  assert.ok([...sparse.matchAll(/data-item-layout="grid-2"/g)].length >= 2, "short parallel lists should use two-column interiors");
  assert.ok(!/data-v43-block="(?:risk-list|evidence-list|action-list)-\d+"[^>]*data-span="12"[^>]*data-density="sparse"/.test(sparse), "sparse lists must not be full width");
  assert.match(sparse, /data-block-type="risk-list"[^>]*data-component-variant="risk-cluster"/, "risk content needs a dedicated risk component");
  assert.match(sparse, /data-block-type="evidence-list"[^>]*data-component-variant="evidence-tiles"/, "evidence content needs numbered evidence tiles");
  assert.match(sparse, /data-block-type="action-list"[^>]*data-component-variant="action-checklist"/, "action content needs a checklist component");
  assert.doesNotMatch(sparse, /适合紧凑并列|不需要占满整行|可以在两列中完成阅读|方向关系继续保持全宽|回归样例/, "layout-test instructions must not leak into visible copy");

  const rows = new Map();
  for (const match of sparse.matchAll(/<g\b([^>]*)data-v43-block="[^"]+"([^>]*)>/g)) {
    const attrs = `${match[1]} ${match[2]}`;
    const row = Number(attrs.match(/data-row="(\d+)"/)?.[1]);
    const height = Number(attrs.match(/data-height="(\d+)"/)?.[1]);
    if (!Number.isFinite(row) || !Number.isFinite(height)) continue;
    const heights = rows.get(row) || [];
    heights.push(height);
    rows.set(row, heights);
  }
  for (const heights of rows.values()) {
    if (heights.length < 2) continue;
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 32, `same-row height mismatch must stay within 32px: ${heights.join(", ")}`);
  }

  const dense = render("v42-badcase-architecture-density");
  const readableDenseRows = [...dense.matchAll(/data-block-type="(?:risk-list|evidence-list|action-list)"[^>]*data-span="(?:6|8|12)"[^>]*data-item-layout="rows"/g)];
  assert.ok(readableDenseRows.length >= 2, "long evidence and action content must remain at least half width with row interiors");
  assert.match(dense, /data-block-type="risk-list"[^>]*data-span="6"[^>]*data-item-layout="grid-3"/, "five readable risks should use a compact half-width cluster");
  assert.ok(!/data-block-type="(?:risk-list|evidence-list|action-list)"[^>]*data-span="4"/.test(dense), "V4.2 explanatory lists must not collapse into one-third cards");

  const longForm = path.join(root, "examples/evals/v43/long-form/brief.json");
  const longOutput = path.join(temp, "long-form.svg");
  execFileSync(process.execPath, [path.join(root, "scripts/render-whiteboard-v4.mjs"), "--input", longForm, "--output", longOutput], { stdio: "pipe" });
  const longSvg = fs.readFileSync(longOutput, "utf8");
  assert.match(longSvg, /data-block-type="risk-list"[^>]*data-item-layout="grid-3"/, "five readable risks should use a compact three-column cluster beside a status grid");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("ok: V4.3 adaptive renderer tests passed");
