import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCapability,
  loadCapabilities,
  resolveCapability,
} from "./lib/capabilities.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = loadCapabilities(root);

assert.equal(registry.version, fs.readFileSync(path.join(root, "VERSION"), "utf8").trim());

const briefsDir = path.join(root, "examples", "briefs");
for (const name of fs.readdirSync(briefsDir).filter((entry) => entry.endsWith(".json"))) {
  const brief = JSON.parse(fs.readFileSync(path.join(briefsDir, name), "utf8"));
  const result = resolveCapability(registry, brief);
  assert.equal(result.ok, true, `${name}: ${result.errors.join("; ")}`);
  assert.ok(result.renderer, `${name}: renderer must be registered`);
}

const unsupportedV4 = resolveCapability(registry, {
  engine: "v4",
  layout: "expression-canvas",
  renderTarget: "svg",
  style: "apple-studio",
});
assert.equal(unsupportedV4.ok, false);
assert.match(unsupportedV4.errors.join(" "), /apple-studio/);
assert.match(unsupportedV4.errors.join(" "), /V4/i);

const unsupportedDsl = resolveCapability(registry, {
  engine: "v3",
  layout: "metric-dashboard",
  renderTarget: "dsl",
  style: "stripe-data",
});
assert.equal(unsupportedDsl.ok, false);
assert.match(unsupportedDsl.errors.join(" "), /stripe-data/);

assert.throws(
  () => assertCapability(registry, {
    engine: "v4",
    layout: "flow-canvas",
    renderTarget: "svg",
    style: "neo-grid-bold",
  }),
  /Unsupported whiteboard capability/,
);

const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas", "whiteboard-brief.schema.json"), "utf8"));
assert.deepEqual(
  [...new Set(registry.styles)].sort(),
  [...schema.properties.style.enum].sort(),
  "registry and schema style enums must match",
);
assert.deepEqual(
  [...new Set(registry.layouts)].sort(),
  [...schema.properties.layout.enum].sort(),
  "registry and schema layout enums must match",
);

console.log("ok: capability registry tests passed");
