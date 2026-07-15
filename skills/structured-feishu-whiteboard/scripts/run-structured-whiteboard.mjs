import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { auditSourceExtraction } from "./lib/source-audit.mjs";
import { compileSemanticModel } from "./lib/semantic-compiler.mjs";
import { compileDesignCandidates } from "./lib/design-compiler.mjs";
import { evaluateCandidate, structureSignature } from "./lib/candidate-evaluator.mjs";
import { currentCommit, gitDirty, hashFile } from "./lib/run-manifest.mjs";

const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const sourcePath = option("--source");
const inventoryPath = option("--inventory") || option("--input");
const outputDir = option("--output-dir");
const title = option("--title");
const style = option("--style") || "auto";
const skipWhiteboardCli = args.includes("--skip-whiteboard-cli");

if (!sourcePath || !inventoryPath || !outputDir) {
  console.error("usage: node scripts/run-structured-whiteboard.mjs --source raw-source.md --inventory inventory.json --output-dir run-dir [--title title] [--style auto]");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(outputDir);
const candidatesDir = path.join(out, "candidates");
fs.mkdirSync(candidatesDir, { recursive: true });
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "command failed").trim());
  return (result.stdout || "").trim();
};

const manifest = {
  schemaVersion: 3,
  pipeline: "structured-whiteboard",
  version: "5.0.0-beta.1",
  gitCommit: currentCommit(root),
  gitDirty: gitDirty(root),
  status: "running",
  startedAt: new Date().toISOString(),
  inputs: { source: path.resolve(sourcePath), inventory: path.resolve(inventoryPath), style, ...(title ? { title } : {}) },
  checks: [],
  candidates: [],
  outputs: {},
  implementationHashes: Object.fromEntries([
    "scripts/run-structured-whiteboard.mjs",
    "scripts/lib/design-compiler.mjs",
    "scripts/lib/candidate-evaluator.mjs",
    "scripts/lib/semantic-compiler.mjs",
    "scripts/lib/expression-planner.mjs",
    "scripts/lib/v44-brief-compiler.mjs",
    "scripts/lib/v4-layout-tree.mjs",
    "scripts/lib/v43-visual-quality.mjs",
    "scripts/lib/v5-scene-planner.mjs",
    "scripts/lib/v5-scene-validation.mjs",
    "scripts/render-whiteboard-v4.mjs",
    "scripts/render-whiteboard-v5.mjs",
    "scripts/check-svg-layout.mjs",
    "schemas/content-inventory.schema.json",
    "schemas/semantic-model.schema.json",
    "schemas/whiteboard-brief.schema.json",
    "config/expression-strategies.json",
    "config/scene-topologies-v5.json",
  ].map((relative) => [relative, hashFile(path.join(root, relative))])),
};
const manifestPath = path.join(out, "run-manifest.json");
writeJson(manifestPath, manifest);

try {
  if (!fs.existsSync(sourcePath)) throw new Error(`source snapshot not found: ${sourcePath}`);
  if (!fs.existsSync(inventoryPath)) throw new Error(`inventory not found: ${inventoryPath}`);
  run(process.execPath, [path.join(root, "scripts/validate-content-inventory.mjs"), path.resolve(inventoryPath)]);
  const inventory = readJson(inventoryPath);
  if (!String(inventory.sourceRef || "").trim()) throw new Error("production inventory requires sourceRef");
  const audit = auditSourceExtraction({ sourceText: fs.readFileSync(sourcePath, "utf8"), inventory });
  const auditPath = path.join(out, "source-audit.json");
  writeJson(auditPath, audit);
  if (!audit.ok) throw new Error(`source extraction coverage failed: ${audit.issues.join("; ")}`);
  manifest.checks.push({ name: "source-and-inventory", status: "passed" });
  manifest.outputs.sourceAudit = auditPath;

  const model = compileSemanticModel({ inventory });
  const semanticPath = path.join(out, "semantic-model.json");
  writeJson(semanticPath, model);
  run(process.execPath, [path.join(root, "scripts/validate-semantic-model.mjs"), semanticPath]);
  manifest.checks.push({ name: "semantic-model", status: "passed" });
  manifest.outputs.semanticModel = semanticPath;

  const design = compileDesignCandidates({ semanticModel: model, title: title || inventory.title, style });
  const designPath = path.join(out, "design-candidates.json");
  writeJson(designPath, { style: design.style, planning: design.planning, sceneDecision: design.sceneDecision, candidates: design.candidates });
  manifest.outputs.designCandidates = designPath;
  if (!design.candidates.length) throw new Error("no viable design candidates were produced");
  const acceptedStructures = new Map();

  for (const candidate of design.candidates) {
    const briefPath = path.join(candidatesDir, `${candidate.id}.json`);
    const svgPath = path.join(candidatesDir, `${candidate.id}.svg`);
    writeJson(briefPath, candidate.kind === "scene" ? candidate.scenePlan : candidate.brief);
    const record = { id: candidate.id, planId: candidate.planId, narrativeType: candidate.narrativeType, pageSkeleton: candidate.pageSkeleton, componentMix: candidate.componentMix, status: "rendering" };
    try {
      if (candidate.kind === "scene") {
        run(process.execPath, [path.join(root, "scripts/validate-scene-plan-v5.mjs"), briefPath]);
        run(process.execPath, [path.join(root, "scripts/render-whiteboard-v5.mjs"), "--input", briefPath, "--output", svgPath]);
      } else {
        run(process.execPath, [path.join(root, "scripts/validate-brief.mjs"), briefPath]);
        run(process.execPath, [path.join(root, "scripts/render-whiteboard-v4.mjs"), "--input", briefPath, "--output", svgPath]);
      }
      run(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), svgPath]);
      const evaluation = evaluateCandidate({ svg: fs.readFileSync(svgPath, "utf8"), candidate, semanticModel: model });
      record.evaluation = evaluation;
      record.outputs = { brief: briefPath, whiteboard: svgPath };
      record.hashes = { brief: hashFile(briefPath), whiteboard: hashFile(svgPath) };
      if (!evaluation.accepted) {
        record.status = "rejected";
      } else {
        const signature = structureSignature(fs.readFileSync(svgPath, "utf8"));
        const duplicateOf = acceptedStructures.get(signature);
        if (duplicateOf) {
          record.status = "rejected";
          record.evaluation = { ...evaluation, accepted: false, hardIssues: [...evaluation.hardIssues, `Structurally duplicates ${duplicateOf}`] };
        } else {
          if (!skipWhiteboardCli) {
            const candidatePng = path.join(candidatesDir, `${candidate.id}.png`);
            run("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", svgPath, "-o", candidatePng, "-f", "svg"]);
            run("npx", ["-y", "@larksuite/whiteboard-cli@0.2.12", "-i", svgPath, "-f", "svg", "--check"]);
            run("python3", [path.join(root, "scripts/check-v44-preview.py"), candidatePng]);
            record.outputs.preview = candidatePng;
            record.hashes.preview = hashFile(candidatePng);
          }
          acceptedStructures.set(signature, candidate.id);
          record.structureSignature = signature;
          record.status = "accepted";
        }
      }
    } catch (error) {
      record.status = "rejected";
      record.evaluation = { accepted: false, total: 0, hardIssues: [error.message] };
    }
    manifest.candidates.push(record);
  }

  const accepted = manifest.candidates.filter((candidate) => candidate.status === "accepted").sort((a, b) => b.evaluation.total - a.evaluation.total);
  if (!accepted.length) {
    const reasons = manifest.candidates.map((candidate) => `${candidate.id}: ${(candidate.evaluation.hardIssues || []).join(" | ")}`).join("; ");
    throw new Error(`all design candidates failed final quality gate: ${reasons}`);
  }
  const requiredFactCount = model.facts.filter((fact) => ["critical", "high", "medium"].includes(fact.importance)).length;
  const minimumAcceptedCandidates = requiredFactCount >= 7 ? 2 : 1;
  if (accepted.length < minimumAcceptedCandidates) {
    throw new Error(`design competition produced only ${accepted.length} distinct accepted structure(s); ${minimumAcceptedCandidates} required for ${requiredFactCount} important facts`);
  }
  const selected = accepted[0];
  const whiteboardPath = path.join(out, "whiteboard.svg");
  const briefPath = path.join(out, "brief.json");
  fs.copyFileSync(selected.outputs.whiteboard, whiteboardPath);
  fs.copyFileSync(selected.outputs.brief, briefPath);
  manifest.selection = { candidateId: selected.id, score: selected.evaluation.total, rationale: selected.evaluation.scores };
  manifest.outputs.brief = briefPath;
  manifest.outputs.whiteboard = whiteboardPath;
  manifest.hashes = { source: hashFile(sourcePath), inventory: hashFile(inventoryPath), brief: hashFile(briefPath), whiteboard: hashFile(whiteboardPath) };
  manifest.checks.push({ name: "multi-candidate-design-review", status: "passed", accepted: accepted.length, required: minimumAcceptedCandidates, selected: selected.id });

  if (skipWhiteboardCli) {
    manifest.checks.push({ name: "feishu-svg-import", status: "skipped" });
    manifest.status = "rendered-unverified";
  } else {
    const pngPath = path.join(out, "whiteboard.png");
    fs.copyFileSync(selected.outputs.preview, pngPath);
    manifest.outputs.preview = pngPath;
    manifest.hashes.preview = hashFile(pngPath);
    manifest.checks.push({ name: "feishu-svg-import-and-preview", status: "passed" });
    manifest.status = "passed";
  }
} catch (error) {
  manifest.status = "failed";
  manifest.error = { message: error.message };
}

manifest.finishedAt = new Date().toISOString();
writeJson(manifestPath, manifest);
if (manifest.status === "failed") {
  console.error(manifest.error.message);
  process.exit(1);
}
console.log(`ok: ${manifest.pipeline} ${manifest.status} -> ${out}`);
