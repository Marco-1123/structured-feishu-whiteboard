import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v4-grid-quality-"));
const checker = path.resolve("scripts/check-v4-layout.mjs");
const wrap = (groups) => `<svg xmlns="http://www.w3.org/2000/svg" data-layout-engine="v4" data-expression-mode="modular-canvas">${groups}</svg>`;
const bad = path.join(dir, "bad.svg");
fs.writeFileSync(bad, wrap('<g data-row="0" data-span="4" data-row-alignment="filled" data-offset-span="0"></g><g data-row="0" data-span="6" data-row-alignment="filled" data-offset-span="0"></g>'));
const badResult = spawnSync(process.execPath, [checker, bad], { encoding: "utf8" });
assert.notEqual(badResult.status, 0);
assert.match(badResult.stderr, /unintended 2-column hole/);

const uneven = path.join(dir, "uneven.svg");
fs.writeFileSync(uneven, wrap('<g data-row="0" data-span="6" data-row-alignment="filled" data-offset-span="0" data-height="200"><rect data-v4-block-card="true" height="180"/></g><g data-row="0" data-span="6" data-row-alignment="filled" data-offset-span="0" data-height="200"><rect data-v4-block-card="true" height="200"/></g>'));
const unevenResult = spawnSync(process.execPath, [checker, uneven], { encoding: "utf8" });
assert.notEqual(unevenResult.status, 0);
assert.match(unevenResult.stderr, /renders uneven outer card heights/);

const unevenMetrics = path.join(dir, "uneven-metrics.svg");
fs.writeFileSync(unevenMetrics, wrap('<rect data-metric-card="true" data-metric-row="0" height="172"/><rect data-metric-card="true" data-metric-row="0" height="220"/>'));
const unevenMetricResult = spawnSync(process.execPath, [checker, unevenMetrics], { encoding: "utf8" });
assert.notEqual(unevenMetricResult.status, 0);
assert.match(unevenMetricResult.stderr, /metric row 0 renders uneven card heights/);

const good = path.join(dir, "good.svg");
fs.writeFileSync(good, wrap('<g data-row="0" data-span="6" data-row-alignment="filled" data-offset-span="0"></g><g data-row="0" data-span="6" data-row-alignment="filled" data-offset-span="0"></g><g data-row="1" data-span="6" data-row-alignment="centered" data-offset-span="3"></g>'));
const goodResult = spawnSync(process.execPath, [checker, good], { encoding: "utf8" });
assert.equal(goodResult.status, 0, goodResult.stderr);
console.log("ok: V4 grid quality tests passed");
