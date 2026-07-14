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

function sourceStructureSignature(sourceCase) {
  const facts = sourceCase.facts || [];
  const types = [...new Set(facts.map((fact) => fact.type))].sort();
  const lanes = facts.map((fact) => fact.lane).filter(Boolean);
  const laneCounts = new Map(lanes.map((lane) => [lane, lanes.filter((value) => value === lane).length]));
  const hasRepeatedLane = [...laneCounts.values()].some((count) => count > 1);
  // One label per step is decorative ownership, not a swimlane-worthy structure.
  const lanePattern = hasRepeatedLane ? `${new Set(lanes).size}:repeated` : "none";
  return `${types.join(",")}|lanes:${lanePattern}`;
}

export function evaluateInternalBenchmark({ catalog, outputRoot }) {
  const cases = [];
  const skeletons = new Map();
  let correct = 0;
  let criticalTotal = 0;
  let criticalCovered = 0;
  let visibleCovered = 0;
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
      const fact = sourceFacts.get(id);
      const factText = fact?.text?.replace(/\s+/g, "");
      if (fact?.type === "metric") {
        const metricBlock = (brief.expressionBlocks || []).find((block) => block.type === "metric-card" && (block.sourceFactIds || []).includes(id));
        if (!metricBlock) return false;
        const title = String(metricBlock.title || "").replace(/\s+/g, "");
        const value = String(metricBlock.value || "").replace(/\s+/g, "");
        return Boolean(title && value && svgText.includes(title) && svgText.includes(value));
      }
      if (brief.layout === "flow-canvas") {
        const node = (brief.flowNodes || []).find((entry) => (entry.sourceFactIds || []).includes(id));
        if (node) {
          const fragments = [node.title, ...(node.body || [])].map((value) => String(value || "").replace(/\s+/g, "")).filter(Boolean);
          return fragments.length > 0 && fragments.every((fragment) => svgText.includes(fragment));
        }
        if (["conclusion", "objective", "result"].includes(fact?.type)) {
          const summary = String(brief.summary || "").replace(/\s+/g, "");
          return Boolean(summary && svgText.includes(summary));
        }
        return false;
      }
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
  const sourceStructures = new Map();
  for (const sourceCase of catalog.cases.filter((item) => !item.stress)) {
    const scenario = sourceCase.expected.scenario;
    if (!sourceStructures.has(scenario)) sourceStructures.set(scenario, new Set());
    sourceStructures.get(scenario).add(sourceStructureSignature(sourceCase));
  }
  const diversityEligibleArchetypes = [...sourceStructures]
    .filter(([, signatures]) => signatures.size >= 2)
    .map(([scenario]) => scenario);
  const diverseEligibleArchetypes = diversityEligibleArchetypes
    .filter((scenario) => (structuralDiversity[scenario] || []).length >= 2);
  const summary = {
    cases: cases.length,
    passedCases: cases.filter((item) => item.status === "passed").length,
    scenarioAccuracy: cases.length ? correct / cases.length : 0,
    criticalFactCoverage: criticalTotal ? criticalCovered / criticalTotal : 0,
    visibleFactCoverage: criticalTotal ? visibleCovered / criticalTotal : 0,
    fallbackRate: 0,
    primaryArchetypesWithTwoStructures: Object.values(structuralDiversity).filter((values) => values.length >= 2).length,
    diversityEligibleArchetypes,
    diverseEligibleArchetypes,
    structuralDiversity,
  };
  summary.passed = summary.passedCases === cases.length
    && summary.scenarioAccuracy === 1
    && summary.criticalFactCoverage === 1
    && summary.visibleFactCoverage === 1
    && summary.diverseEligibleArchetypes.length === summary.diversityEligibleArchetypes.length;
  return { generatedAt: new Date().toISOString(), summary, cases };
}
