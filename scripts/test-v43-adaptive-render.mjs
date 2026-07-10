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

  const dense = render("v42-badcase-architecture-density");
  const readableDenseRows = [...dense.matchAll(/data-block-type="(?:risk-list|evidence-list|action-list)"[^>]*data-span="(?:6|8|12)"[^>]*data-item-layout="rows"/g)];
  assert.ok(readableDenseRows.length >= 3, "V4.2 explanatory lists must remain at least half width with row interiors");
  assert.ok(!/data-block-type="(?:risk-list|evidence-list|action-list)"[^>]*data-span="4"/.test(dense), "V4.2 explanatory lists must not collapse into one-third cards");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("ok: V4.3 adaptive renderer tests passed");
