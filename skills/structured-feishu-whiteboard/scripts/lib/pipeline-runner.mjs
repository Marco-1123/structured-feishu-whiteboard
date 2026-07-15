import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { assertCapability, loadCapabilities } from "./capabilities.mjs";
import { verifyCoverage } from "./content-coverage.mjs";
import { createRunManifest, hashFile, writeRunManifest } from "./run-manifest.mjs";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "command failed").trim();
    throw new Error(detail);
  }
  return (result.stdout || "").trim();
}

function selectedRouteMatches(route, brief) {
  const mode = brief.expressionMode || brief.flowMode;
  const target = brief.renderTarget || "svg";
  const engine = brief.engine || "v3";
  return (route.candidates || []).some((candidate) => (
    candidate.layout === brief.layout
    && (!mode || candidate.mode === mode)
    && (candidate.engine || "v3") === engine
    && (candidate.renderTarget || "svg") === target
  )) || (
    route.fallback?.layout === brief.layout
    && (route.fallback.engine || "v3") === engine
    && (route.fallback.renderTarget || "svg") === target
  );
}

export async function runWhiteboard({
  root,
  inventoryPath,
  routePath,
  briefPath,
  outputDir,
  skipWhiteboardCli = false,
}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "run-manifest.json");
  const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
  const manifest = createRunManifest({ root, version, inventoryPath, routePath, briefPath });
  writeRunManifest(manifestPath, manifest);

  try {
    const inventory = readJson(inventoryPath);
    const route = readJson(routePath);
    const brief = readJson(briefPath);
    if (brief.pipelineVersion !== "4.3" || !brief.planning) throw new Error("V4.3 runner requires pipelineVersion 4.3 and planning metadata");
    if (route.inventoryId !== inventory.inventoryId) throw new Error("Route inventoryId does not match content inventory");
    if (brief.planning.routeDecisionId !== route.decisionId) throw new Error("Brief routeDecisionId does not match route decision");
    if (!selectedRouteMatches(route, brief)) throw new Error("Brief layout/mode is not present in the route candidates or fallback");

    runCommand(process.execPath, [path.join(root, "scripts/validate-content-inventory.mjs"), inventoryPath], { cwd: root });
    manifest.checks.push({ name: "inventory-validation", status: "passed" });
    runCommand(process.execPath, [path.join(root, "scripts/validate-brief.mjs"), briefPath], { cwd: root });
    manifest.checks.push({ name: "brief-validation", status: "passed" });

    const coverage = verifyCoverage(inventory, brief.planning);
    manifest.coverage = coverage;
    if (!coverage.ok) throw new Error(coverage.issues.join("; "));
    manifest.checks.push({ name: "content-coverage", status: "passed" });

    const capability = assertCapability(loadCapabilities(root, { includeArchived: true }), brief);
    manifest.capability = capability;
    manifest.route = {
      decisionId: route.decisionId,
      confidence: route.confidence,
      candidates: route.candidates,
      selected: {
        engine: capability.engine,
        layout: capability.layout,
        mode: brief.expressionMode || brief.flowMode || null,
        renderTarget: capability.renderTarget,
        style: capability.style,
      },
    };
    manifest.checks.push({ name: "capability-resolution", status: "passed" });

    const extension = capability.renderTarget === "dsl" ? "json" : "svg";
    const outputPath = path.join(outputDir, `whiteboard.${extension}`);
    runCommand(process.execPath, [path.join(root, capability.renderer), "--input", briefPath, "--output", outputPath], { cwd: root });
    manifest.outputs.whiteboard = outputPath;
    manifest.hashes.output = hashFile(outputPath);
    manifest.checks.push({ name: "renderer", status: "passed" });

    if (capability.renderTarget === "svg") {
      runCommand(process.execPath, [path.join(root, "scripts/check-svg-layout.mjs"), outputPath], { cwd: root });
      manifest.checks.push({ name: "svg-layout", status: "passed" });
      if (capability.engine === "v4") {
        runCommand(process.execPath, [path.join(root, "scripts/check-v4-layout.mjs"), outputPath], { cwd: root });
        manifest.checks.push({ name: "v4-layout", status: "passed" });
        runCommand(process.execPath, [path.join(root, "scripts/check-v43-visual-quality.mjs"), outputPath], { cwd: root });
        manifest.checks.push({ name: "v43-visual-quality", status: "passed" });
      }
    }

    if (!skipWhiteboardCli) {
      const pngPath = path.join(outputDir, "whiteboard.png");
      const cliArgs = ["-y", "@larksuite/whiteboard-cli@^0.2.12", "-i", outputPath, "-o", pngPath];
      if (capability.renderTarget === "svg") cliArgs.push("-f", "svg");
      runCommand("npx", cliArgs, { cwd: root });
      const checkArgs = ["-y", "@larksuite/whiteboard-cli@^0.2.12", "-i", outputPath];
      if (capability.renderTarget === "svg") checkArgs.push("-f", "svg");
      checkArgs.push("--check");
      runCommand("npx", checkArgs, { cwd: root });
      manifest.outputs.preview = pngPath;
      manifest.checks.push({ name: "whiteboard-cli", status: "passed" });
    }

    manifest.status = "passed";
    manifest.finishedAt = new Date().toISOString();
    writeRunManifest(manifestPath, manifest);
    return manifest;
  } catch (error) {
    manifest.status = "failed";
    manifest.finishedAt = new Date().toISOString();
    manifest.error = { message: error.message };
    writeRunManifest(manifestPath, manifest);
    const failure = new Error(error.message);
    failure.manifestPath = manifestPath;
    throw failure;
  }
}
