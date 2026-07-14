import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v43-flow-"));

function render(name) {
  const output = path.join(temp, `${name}.svg`);
  execFileSync(process.execPath, [path.join(root, "scripts/render-whiteboard-v4.mjs"), "--input", path.join(root, `examples/briefs/${name}.json`), "--output", output]);
  return fs.readFileSync(output, "utf8");
}

try {
  const linear = render("v41-linear-flow-engine");
  const nodes = [...linear.matchAll(/data-flow-node="([^"]+)"[^>]*data-node-x="(\d+)"[^>]*data-node-y="(\d+)"/g)];
  assert.equal(nodes.length, 5);
  assert.equal(new Set(nodes.map((match) => match[3])).size, 2, "five linear steps should wrap into a balanced 4+1 flow instead of creating an unreadably wide strip");
  assert.ok(linear.indexOf("data-flow-edge=") < linear.indexOf("data-flow-node="), "connectors must render behind nodes");
  assert.doesNotMatch(linear, /data-edge-crosses-node="true"/, "connectors must not cross unrelated nodes");
  assert.match(linear, /data-edge-label="约束明确"/, "edge labels must remain visible");

  const swimlane = render("v41-swimlane-flow-engine");
  assert.ok(swimlane.indexOf("data-flow-edge=") < swimlane.indexOf("data-flow-node="), "swimlane connectors must render behind nodes");
  assert.doesNotMatch(swimlane, /data-edge-crosses-node="true"/, "swimlane connectors must avoid unrelated nodes");
  assert.match(swimlane, /data-edge-label="预览"/, "swimlane edge labels must remain visible");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("ok: V4.3 flow renderer tests passed");
