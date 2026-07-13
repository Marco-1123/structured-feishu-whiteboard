import fs from "node:fs";
import path from "node:path";

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function visibleSvgText(file) {
  try {
    return fs.readFileSync(file, "utf8")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, "");
  } catch {
    return "";
  }
}

export function classifyFailure(message = "") {
  if (/critical coverage|selectedFactIds|missingImportant/i.test(message)) return "fact-selection";
  if (/invalid brief|requires at least|must contain|requires a .* block/i.test(message)) return "expression-planning";
  if (/exceeds parent|overlap|hole|uneven|layout/i.test(message)) return "layout-engine";
  if (/whiteboard|openapi|feishu|conversion/i.test(message)) return "feishu-conversion";
  if (/scenario|archetype|semantic/i.test(message)) return "semantic-classification";
  return "test-infrastructure";
}

export function evaluateInternalBenchmark({ catalog, outputRoot }) {
  const cases = [];
  const skeletons = new Map();
  let correct = 0;
  let criticalTotal = 0;
  let criticalCovered = 0;
  let visibleCovered = 0;
  let fallbackCount = 0;
  for (const sourceCase of catalog.cases) {
    const caseDir = path.join(outputRoot, "cases", sourceCase.id);
    const semantic = readJson(path.join(caseDir, "semantic-model.json"), {});
    const decision = readJson(path.join(caseDir, "decision.json"), {});
    const plans = readJson(path.join(caseDir, "expression-plans.json"), {});
    const brief = readJson(path.join(caseDir, "brief.json"), {});
    const manifest = readJson(path.join(caseDir, "run-manifest.json"), {});
    const actualScenario = semantic.scenario?.primary || null;
    const scenarioCorrect = actualScenario === sourceCase.expected.scenario;
    if (scenarioCorrect) correct += 1;
    const selected = new Set(brief.planning?.selectedFactIds || []);
    const sourceFacts = new Map((sourceCase.facts || []).map((fact) => [fact.id, fact]));
    const required = [...new Set([
      ...(sourceCase.expected.requiredFactIds || []),
      ...(sourceCase.facts || []).filter((fact) => ["critical", "high"].includes(fact.importance)).map((fact) => fact.id),
    ])];
    const covered = required.filter((id) => selected.has(id));
    const svgText = visibleSvgText(path.join(caseDir, "whiteboard.svg"));
    const visible = required.filter((id) => {
      const factText = sourceFacts.get(id)?.text?.replace(/\s+/g, "");
      return factText && svgText.includes(factText);
    });
    criticalTotal += required.length;
    criticalCovered += covered.length;
    visibleCovered += visible.length;
    const selectedPlan = (plans.candidates || []).find((candidate) => candidate.planId === decision.selectedPlanId);
    const skeleton = selectedPlan?.pageSkeleton || decision.brief?.expressionMode || brief.expressionMode || brief.layout || null;
    if (!sourceCase.stress && skeleton) {
      if (!skeletons.has(sourceCase.expected.scenario)) skeletons.set(sourceCase.expected.scenario, new Set());
      skeletons.get(sourceCase.expected.scenario).add(skeleton);
    }
    if (manifest.pipeline === "v4.3-fallback") fallbackCount += 1;
    const message = manifest.error?.message || "";
    cases.push({
      caseId: sourceCase.id,
      stress: Boolean(sourceCase.stress),
      expectedScenario: sourceCase.expected.scenario,
      actualScenario,
      scenarioCorrect,
      requiredFacts: required.length,
      coveredRequiredFacts: covered.length,
      missingRequiredFacts: required.filter((id) => !selected.has(id)),
      visibleRequiredFacts: visible.length,
      hiddenOrTruncatedRequiredFacts: required.filter((id) => !visible.includes(id)),
      pipeline: manifest.pipeline || null,
      status: manifest.status || "missing",
      skeleton,
      componentMix: (brief.expressionBlocks || []).map((block) => block.type),
      failureLayer: message ? classifyFailure(message) : null,
      error: message || null,
    });
  }
  const structuralDiversity = Object.fromEntries([...skeletons].map(([scenario, values]) => [scenario, [...values]]));
  const summary = {
    cases: cases.length,
    passedCases: cases.filter((item) => item.status === "passed").length,
    scenarioAccuracy: cases.length ? correct / cases.length : 0,
    criticalFactCoverage: criticalTotal ? criticalCovered / criticalTotal : 0,
    visibleFactCoverage: criticalTotal ? visibleCovered / criticalTotal : 0,
    fallbackRate: cases.length ? fallbackCount / cases.length : 0,
    primaryArchetypesWithTwoStructures: Object.values(structuralDiversity).filter((values) => values.length >= 2).length,
    structuralDiversity,
  };
  summary.passed = summary.passedCases === cases.length && summary.scenarioAccuracy === 1 && summary.criticalFactCoverage === 1 && summary.visibleFactCoverage === 1 && summary.primaryArchetypesWithTwoStructures === 6;
  return { generatedAt: new Date().toISOString(), summary, cases };
}
