import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(root, "config/expression-strategies.json"), "utf8"));

function count(model, type) {
  return model.facts.filter((fact) => fact.type === type || fact.visualType === type).length;
}

function ids(model, types) {
  const allowed = new Set(types);
  return model.facts.filter((fact) => allowed.has(fact.type) || allowed.has(fact.visualType)).map((fact) => fact.id);
}

function metricComponent(facts = []) {
  if (facts.length < 3) return "metric-card";
  if (facts.every((fact) => fact.type === "variance")) return "variance-bridge-v2";
  if (facts.every((fact) => fact.type === "trend" || Number.isFinite(fact.order))) return "trend-sparkline";
  if (facts.every((fact) => /%/.test(String(fact.value || fact.measure?.display || fact.text)))) return "progress-bar";
  return "metric-card";
}

const SUPPORT_COMPONENTS = new Set(["evidence-list", "risk-list", "action-list"]);

function fallbackComponent(fact) {
  if (fact.visualType === "metric" || fact.type === "metric") return "metric-card";
  if (["risk", "constraint"].includes(fact.type)) return "risk-list";
  if (["action", "unresolved"].includes(fact.type)) return "action-list";
  if (fact.type === "stage") return "mini-roadmap";
  if (fact.type === "capability") return "status-board";
  if (["cause", "process-chain"].includes(fact.type)) return "narrative-chain";
  if (fact.type === "option") return "decision-matrix";
  if (["conclusion", "result", "objective"].includes(fact.type)) return "statement";
  return "evidence-list";
}

function appendFacts(region, factIds, purpose) {
  region.factIds.push(...factIds.filter((id) => !region.factIds.includes(id)));
  region.embeddedPurposes = [...new Set([...(region.embeddedPurposes || []), purpose])];
}

function composeSupportRegions(regions, model) {
  const facts = new Map(model.facts.map((fact) => [fact.id, fact]));
  const independent = [];
  const singleton = [];
  for (const region of regions) {
    if (!SUPPORT_COMPONENTS.has(region.preferredComponent)) {
      independent.push(region);
      continue;
    }
    const regionFacts = region.factIds.map((id) => facts.get(id)).filter(Boolean);
    const deservesOwnRegion = regionFacts.length >= 2 || regionFacts.some((fact) => fact.importance === "critical");
    (deservesOwnRegion ? independent : singleton).push(region);
  }

  const hostFor = (component) => {
    const preferences = component === "action-list"
      ? ["mini-roadmap", "narrative-chain", "status-board"]
      : component === "evidence-list"
        ? ["decision-matrix", "narrative-chain", "status-board"]
        : ["decision-matrix", "status-board"];
    return preferences.map((type) => independent.find((region) => region.preferredComponent === type)).find(Boolean);
  };

  const unresolved = [];
  for (const region of singleton) {
    const host = hostFor(region.preferredComponent);
    if (host) appendFacts(host, region.factIds, region.purpose);
    else unresolved.push(region);
  }
  if (unresolved.length >= 2) {
    independent.push({
      id: `region-support-${independent.length + 1}`,
      purpose: "support-summary",
      factIds: unresolved.flatMap((region) => region.factIds),
      preferredComponent: "status-board",
      visualPriority: "secondary",
      widthIntent: "adaptive",
      embeddedPurposes: unresolved.map((region) => region.purpose),
    });
  } else {
    independent.push(...unresolved);
  }
  return independent;
}

function recipe(model, narrativeType) {
  const scenario = model.scenario.primary;
  const group = (types, component) => ({ types, component });
  if (scenario === "process-collaboration" && narrativeType === "flow-driven") {
    const actorCount = new Set(model.facts.map((fact) => fact.actor).filter(Boolean)).size;
    return { skeleton: actorCount >= 2 ? "swimlane" : "timeline", layout: "flow-canvas", components: actorCount >= 2 ? ["flow-node", "flow-edge", "lane"] : ["flow-node", "flow-edge"], groups: [group(["input", "actor", "action", "constraint", "output"], "flow-node")] };
  }
  if (scenario === "research-decision" && narrativeType === "comparison-driven") return { skeleton: "left-right-argument", layout: "expression-canvas", components: ["statement", "evidence-list", "decision-matrix", "risk-list"], groups: [group(["conclusion", "unresolved"], "statement"), group(["evidence"], "evidence-list"), group(["option"], "decision-matrix"), group(["risk"], "risk-list")] };
  if (scenario === "product-capability" && narrativeType === "hierarchical") return { skeleton: "centered-system", layout: "expression-canvas", components: ["statement", "metric-card", "status-board", "narrative-chain", "evidence-list"], groups: [group(["conclusion"], "statement"), group(["metric"], "metric-card"), group(["process-chain"], "narrative-chain"), group(["capability"], "status-board"), group(["evidence"], "evidence-list")] };
  if (narrativeType === "temporal") return { skeleton: scenario === "review-update" ? "past-future-split" : "timeline", layout: "expression-canvas", components: ["statement", "metric-card", "mini-roadmap", "risk-list", "action-list"], groups: [group(["conclusion", "result", "metric"], "statement"), group(["stage"], "mini-roadmap"), group(["risk"], "risk-list"), group(["action"], "action-list")] };
  if (narrativeType === "result-driven") return { skeleton: "overview-detail", layout: "expression-canvas", components: ["statement", "metric-card", "trend-sparkline", "narrative-chain", "risk-list", "action-list"], groups: [group(["conclusion", "result"], "statement"), group(["metric", "trend", "variance"], "metric-card"), group(["cause"], "narrative-chain"), group(["risk"], "risk-list"), group(["action"], "action-list")] };
  if (narrativeType === "comparison-driven") return { skeleton: "multi-line-comparison", layout: "expression-canvas", components: ["statement", "decision-matrix", "evidence-list", "risk-list"], groups: [group(["conclusion"], "statement"), group(["option"], "decision-matrix"), group(["evidence"], "evidence-list"), group(["risk"], "risk-list")] };
  if (narrativeType === "causal") return { skeleton: "left-right-argument", layout: "expression-canvas", components: ["statement", "narrative-chain", "evidence-list", "risk-list", "action-list"], groups: [group(["conclusion", "result"], "statement"), group(["cause"], "narrative-chain"), group(["evidence"], "evidence-list"), group(["risk", "constraint"], "risk-list"), group(["action", "unresolved"], "action-list")] };
  if (narrativeType === "hierarchical") return { skeleton: "centered-system", layout: "expression-canvas", components: ["statement", "status-board", "narrative-chain", "mini-roadmap"], groups: [group(["conclusion", "objective"], "statement"), group(["capability", "constraint"], "status-board"), group(["stage", "action"], "mini-roadmap")] };
  if (narrativeType === "flow-driven") {
    const actorCount = new Set(model.facts.map((fact) => fact.actor).filter(Boolean)).size;
    return { skeleton: actorCount >= 2 ? "swimlane" : "timeline", layout: "flow-canvas", components: actorCount >= 2 ? ["flow-node", "flow-edge", "lane"] : ["flow-node", "flow-edge"], groups: [group(["input", "actor", "action", "constraint", "output", "stage"], "flow-node")] };
  }
  return { skeleton: "overview-detail", layout: "expression-canvas", components: ["statement", "evidence-list", "risk-list", "action-list"], groups: [group(["conclusion", "result"], "statement"), group(["cause", "evidence"], "evidence-list"), group(["risk"], "risk-list"), group(["action", "unresolved"], "action-list")] };
}

function scoreCandidate(model, candidate, rank) {
  const covered = new Set(candidate.regions.flatMap((region) => region.factIds));
  const critical = model.facts.filter((fact) => fact.importance === "critical");
  const high = model.facts.filter((fact) => fact.importance === "high");
  const criticalCoverage = critical.length ? critical.filter((fact) => covered.has(fact.id)).length / critical.length : 1;
  const highCoverage = high.length ? high.filter((fact) => covered.has(fact.id)).length / high.length : 1;
  const semanticMatch = candidate.regions.filter((region) => region.factIds.length).length / Math.max(1, candidate.regions.length);
  const repetitionPenalty = Math.max(0, candidate.componentMix.length - new Set(candidate.componentMix).size) * 5;
  const unsupportedInferencePenalty = model.facts.filter((fact) => fact.confidence === "inferred").length * 2;
  const coherence = Math.max(0.5, 1 - rank * 0.12);
  const signalCounts = {
    "result-driven": count(model, "metric") + count(model, "trend") + count(model, "variance"),
    temporal: count(model, "stage") + count(model, "action"),
    causal: count(model, "cause") + count(model, "evidence") + count(model, "risk"),
    "comparison-driven": count(model, "option") + count(model, "evidence"),
    hierarchical: count(model, "capability") + count(model, "constraint") + count(model, "objective"),
    "flow-driven": count(model, "input") + count(model, "action") + count(model, "output") + new Set(model.facts.map((fact) => fact.actor).filter(Boolean)).size,
    "problem-driven": count(model, "unresolved") + count(model, "evidence") + count(model, "risk"),
  };
  const semanticSignalBonus = Math.min(12, (signalCounts[candidate.narrativeType] || 0) * 3);
  const reviewHasTimeline = model.scenario.primary === "review-update" && count(model, "stage") >= 2 && count(model, "action") >= 1;
  const scenarioFitBonus = reviewHasTimeline && candidate.narrativeType === "temporal"
    ? 12
    : model.scenario.primary === "review-update" && candidate.narrativeType === "result-driven" && count(model, "metric") >= 2 && !reviewHasTimeline ? 8 : 0;
  const total = Math.max(0, Math.min(100, Math.round(criticalCoverage * 32 + highCoverage * 18 + semanticMatch * 18 + coherence * 17 + 3 + semanticSignalBonus + scenarioFitBonus - repetitionPenalty - unsupportedInferencePenalty)));
  return { total, criticalCoverage, highCoverage, semanticMatch, coherence, semanticSignalBonus, scenarioFitBonus, repetitionPenalty, unsupportedInferencePenalty, rendererCompatibility: 1 };
}

function preferredNarratives(model, config) {
  const scenario = model.scenario.primary;
  const base = [...config.archetypes[scenario]];
  if (scenario === "review-update") {
    if (count(model, "stage") >= 2 && count(model, "action") >= 1) return ["temporal", "result-driven", "causal"];
    if (count(model, "metric") >= 2 || count(model, "trend") >= 1 || count(model, "variance") >= 1) return ["result-driven", "causal", "temporal"];
    return ["causal", "temporal", "result-driven"];
  }
  if (scenario === "project-plan") {
    const actorCount = new Set(model.facts.map((fact) => fact.actor).filter(Boolean)).size;
    if (actorCount >= 2) return ["flow-driven", "temporal", "hierarchical"];
  }
  if (scenario === "product-capability" && count(model, "option") >= 2) {
    return ["comparison-driven", "hierarchical", "flow-driven"];
  }
  return base;
}

export function planExpressions(model, config = defaultConfig) {
  const candidates = preferredNarratives(model, config).slice(0, 3).map((narrativeType, rank) => {
    const selected = recipe(model, narrativeType);
    const regions = selected.groups.map((group, index) => {
      const factIds = ids(model, group.types);
      const regionFacts = factIds.map((id) => model.facts.find((fact) => fact.id === id)).filter(Boolean);
      const preferredComponent = group.component === "decision-matrix" && factIds.length < 2
        ? "evidence-list"
        : group.component === "metric-card" ? metricComponent(regionFacts) : group.component;
      return { id: `region-${index + 1}`, purpose: group.types.join("-"), factIds, preferredComponent, visualPriority: index === 0 ? "primary" : "secondary", widthIntent: index === 0 ? "full" : "adaptive" };
    }).filter((region) => region.factIds.length);
    const covered = new Set(regions.flatMap((region) => region.factIds));
    const uncoveredImportant = model.facts.filter((fact) => ["critical", "high"].includes(fact.importance) && !covered.has(fact.id));
    const uncoveredGroups = new Map();
    for (const fact of uncoveredImportant) {
      const component = fallbackComponent(fact);
      if (!uncoveredGroups.has(component)) uncoveredGroups.set(component, []);
      uncoveredGroups.get(component).push(fact);
    }
    for (const [component, facts] of uncoveredGroups) {
      const existing = regions.find((region) => region.preferredComponent === component);
      if (existing) appendFacts(existing, facts.map((fact) => fact.id), `uncovered-${facts[0].type}`);
      else regions.push({ id: `region-${regions.length + 1}`, purpose: facts.map((fact) => fact.type).join("-"), factIds: facts.map((fact) => fact.id), preferredComponent: component, visualPriority: "secondary", widthIntent: "adaptive" });
    }
    const composedRegions = selected.layout === "flow-canvas" ? regions : composeSupportRegions(regions, model);
    const componentMix = [...new Set(composedRegions.map((region) => region.preferredComponent))];
    const candidate = { planId: `${model.modelId}-${narrativeType}`, scenario: model.scenario.primary, narrativeType, pageSkeleton: selected.skeleton, layout: selected.layout, regions: composedRegions, componentMix, fallbackLayout: "large-canvas" };
    candidate.scoreBreakdown = scoreCandidate(model, candidate, rank);
    return candidate;
  }).sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);
  return {
    candidates,
    confidenceEvidence: { topScore: candidates[0]?.scoreBreakdown.total || 0, secondScore: candidates[1]?.scoreBreakdown.total || 0, scoreMargin: Math.max(0, (candidates[0]?.scoreBreakdown.total || 0) - (candidates[1]?.scoreBreakdown.total || 0)), missingRequiredSignals: model.facts.filter((fact) => fact.confidence === "missing").map((fact) => fact.id), unsupportedInferenceCount: model.facts.filter((fact) => fact.confidence === "inferred").length },
  };
}
