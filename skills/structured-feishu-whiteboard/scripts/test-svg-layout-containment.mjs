import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "whiteboard-containment-"));
const run = (name, svg) => {
  const file = path.join(directory, `${name}.svg`);
  fs.writeFileSync(file, svg);
  return spawnSync(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), file], { encoding: "utf8" });
};

try {
  const valid = run("valid", '<svg width="400" height="200"><rect x="20" y="20" width="360" height="120"/><text x="40" y="60" font-size="20"><tspan x="40" dy="0">第一行</tspan><tspan x="40" dy="28">第二行</tspan></text></svg>');
  assert.equal(valid.status, 0, valid.stderr);

  const overflow = run("overflow", '<svg width="400" height="200"><rect x="20" y="20" width="360" height="72"/><text x="40" y="60" font-size="20"><tspan x="40" dy="0">第一行</tspan><tspan x="40" dy="32">第二行越过底边</tspan></text></svg>');
  assert.notEqual(overflow.status, 0, "multi-line text crossing the bottom edge must fail");
  assert.match(overflow.stderr, /vertically/);

  const rootOverflow = run("root-overflow", '<svg width="400" height="200"><text x="390" y="80" font-size="20"><tspan x="390" dy="0">越过整张画布</tspan></text></svg>');
  assert.notEqual(rootOverflow.status, 0, "text without a parent card must still stay inside the root canvas");
  assert.match(rootOverflow.stderr, /root canvas/);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}

console.log("ok: svg horizontal and vertical containment tests passed");
