#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES="$ROOT/examples/evals/v44/acceptance"
OUT="${TMPDIR:-/tmp}/structured-whiteboard-production-regression"
CASES=(review-1 strategy-1 plan-1 research-1 product-1 flow-1)

rm -rf "$OUT"
mkdir -p "$OUT"

for case_name in "${CASES[@]}"; do
  case_dir="$OUT/$case_name"
  mkdir -p "$case_dir"
  node - "$FIXTURES/$case_name/inventory.json" "$case_dir/inventory.json" "$case_dir/source.md" <<'NODE'
const fs = require("fs");
const inventory = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
inventory.facts = inventory.facts.map((fact) => ({ ...fact, sourceQuote: fact.sourceQuote || fact.text }));
fs.writeFileSync(process.argv[3], `${JSON.stringify(inventory, null, 2)}\n`);
fs.writeFileSync(process.argv[4], `${inventory.facts.map((fact) => fact.sourceQuote).join("\n\n")}\n`);
NODE
  node "$ROOT/scripts/run-structured-whiteboard.mjs" \
    --source "$case_dir/source.md" \
    --inventory "$case_dir/inventory.json" \
    --output-dir "$case_dir/run" \
    --skip-whiteboard-cli
done

node - "$OUT" "${CASES[@]}" <<'NODE'
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const cases = process.argv.slice(3);
const narratives = new Set();
const structures = new Set();
for (const caseName of cases) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, caseName, "run/run-manifest.json"), "utf8"));
  if (manifest.status !== "rendered-unverified") throw new Error(`${caseName}: unexpected status ${manifest.status}`);
  const selected = manifest.candidates.find((candidate) => candidate.id === manifest.selection?.candidateId);
  if (!selected || selected.status !== "accepted") throw new Error(`${caseName}: no accepted selected candidate`);
  const ratio = selected.evaluation.visual?.aspectRatio;
  if (!Number.isFinite(ratio) || ratio < 1.45 || ratio > 2.2) throw new Error(`${caseName}: invalid selected aspect ratio ${ratio}`);
  if (selected.evaluation.missingFactIds?.length) throw new Error(`${caseName}: selected output dropped important facts`);
  narratives.add(selected.narrativeType);
  if (!selected.structureSignature) throw new Error(`${caseName}: missing structural signature`);
  structures.add(selected.structureSignature);
}
if (narratives.size < 4) throw new Error(`semantic diversity regression: only ${narratives.size} selected narrative types`);
if (structures.size < 4) throw new Error(`structural diversity regression: only ${structures.size} distinct selected geometries`);
console.log(`ok: ${cases.length} production cases passed with ${narratives.size} narrative types and ${structures.size} geometries`);
NODE

node "$ROOT/scripts/test-v5-scene-render.mjs"

REAL_BADCASE="$ROOT/examples/evals/v44-badcases/audit-assistant-knowledge-overview"
REAL_OUT="$OUT/real-audit-assistant"
node "$ROOT/scripts/run-structured-whiteboard.mjs" \
  --source "$REAL_BADCASE/source.md" \
  --inventory "$REAL_BADCASE/inventory.json" \
  --output-dir "$REAL_OUT" \
  --title "审核智能助手知识库概览"
node - "$REAL_OUT/run-manifest.json" <<'NODE'
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (manifest.status !== "passed") throw new Error(`real badcase did not pass Feishu-compatible import: ${manifest.status}`);
const selected = manifest.candidates.find((candidate) => candidate.id === manifest.selection?.candidateId);
if (!selected || selected.evaluation.missingFactIds?.length) throw new Error("real badcase dropped important facts");
if (selected.evaluation.visual.aspectRatio < 1.42 || selected.evaluation.visual.aspectRatio > 2.15) throw new Error("real badcase has an invalid onepage ratio");
if ((selected.evaluation.visual.effectiveContentDensity || 0) < 1.15) throw new Error("real badcase is visually underfilled");
if (!manifest.checks.some((check) => check.name === "feishu-svg-import-and-preview" && check.status === "passed")) throw new Error("real badcase skipped the Feishu SVG import gate");
console.log("ok: real cross-agent badcase passed content, layout and Feishu import gates");
NODE
