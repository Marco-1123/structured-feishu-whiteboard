import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCapabilities } from "./capabilities.mjs";
import { runWhiteboard } from "./pipeline-runner.mjs";
import { routeInventory } from "./scenario-router.mjs";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function candidateKey(candidate) {
  return `${candidate.layout}${candidate.mode ? `:${candidate.mode}` : ""}`;
}

export async function evaluateV43(root) {
  const base = path.join(root, "examples", "evals", "v43");
  const manifest = readJson(path.join(base, "cases.json"));
  const registry = loadCapabilities(root);
  const routerCases = readJson(path.join(base, manifest.routerCases));
  const routeResults = [];
  for (const testCase of routerCases) {
    const decision = routeInventory(testCase.inventory, registry);
    const topTwo = decision.candidates.slice(0, 2).map(candidateKey);
    const hit = testCase.expectedTopTwo.some((expected) => topTwo.includes(expected));
    routeResults.push({ id: testCase.id, hit, topTwo, confidence: decision.confidence });
  }

  const pipelineResults = [];
  for (const testCase of manifest.pipelineCases) {
    const caseDir = path.join(base, testCase.directory);
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `v43-eval-${testCase.id}-`));
    try {
      const result = await runWhiteboard({
        root,
        inventoryPath: path.join(caseDir, "inventory.json"),
        routePath: path.join(caseDir, "route.json"),
        briefPath: path.join(caseDir, "brief.json"),
        outputDir,
        skipWhiteboardCli: true,
      });
      pipelineResults.push({
        id: testCase.id,
        status: result.status,
        criticalCoverage: result.coverage.criticalCoverage,
        highAccounting: result.coverage.highAccounting,
        checks: result.checks.map((check) => check.name),
      });
    } catch (error) {
      pipelineResults.push({ id: testCase.id, status: "failed", error: error.message, criticalCoverage: 0, highAccounting: 0, checks: [] });
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }

  const topTwoHits = routeResults.filter((result) => result.hit).length;
  const passed = pipelineResults.filter((result) => result.status === "passed").length;
  const report = {
    version: fs.readFileSync(path.join(root, "VERSION"), "utf8").trim(),
    router: {
      caseCount: routeResults.length,
      topTwoHits,
      topTwoAccuracy: routeResults.length ? topTwoHits / routeResults.length : 0,
      results: routeResults,
    },
    pipeline: {
      caseCount: pipelineResults.length,
      passed,
      criticalCoverage: pipelineResults.length ? Math.min(...pipelineResults.map((result) => result.criticalCoverage)) : 0,
      highAccounting: pipelineResults.length ? Math.min(...pipelineResults.map((result) => result.highAccounting)) : 0,
      results: pipelineResults,
    },
  };
  report.status = report.router.topTwoAccuracy >= 0.9
    && report.pipeline.passed === report.pipeline.caseCount
    && report.pipeline.criticalCoverage === 1
    && report.pipeline.highAccounting === 1
    ? "passed"
    : "failed";
  return report;
}
