import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(root, "config/expression-strategies.json"), "utf8"));

function count(model, type) {
  return model.facts.filter((fact) => fact.type === type).length;
}

function ids(model, types) {
  const allowed = new Set(types);
  return model.facts.filter((fact) => allowed.has(fact.type)).map((fact) => fact.id);
}

function recipe(model, narrativeType) {
  const scenario = model.scenario.primary;
  const group = (types, component) => ({ types, component });
  if (scenario === "process-collaboration" && narrativeType === "flow-driven") return { skeleton: "swimlane", layout: "flow-canvas", components: ["flow-node", "flow-edge", "lane"], groups: [group(["input", "actor", "action", "constraint", "output"], "flow-node")] };
  if (scenario === "research-decision" && narrativeType === "comparison-driven") return { skeleton: "left-right-argument", layout: "expression-canvas", components: ["statement", "evidence-list", "decision-matrix", "risk-list"], groups: [group(["conclusion", "unresolved"], "statement"), group(["evidence"], "evidence-list"), group(["option"], "decision-matrix"), group(["risk"], "risk-list")] };
  if (scenario === "product-capability" && narrativeType === "hierarchical") return { skeleton: "centered-system", layout: "expression-canvas", components: ["statement", "status-board", "narrative-chain", "evidence-list"], groups: [group(["conclusion"], "statement"), group(["capability"], "status-board"), group(["stage"], "narrative-chain"), group(["evidence"], "evidence-list")] };
  if (narrativeType === "temporal") return { skeleton: scenario === "review-update" ? "past-future-split" : "timeline", layout: "expression-canvas", components: ["statement", "metric-card", "mini-roadmap", "risk-list", "action-list"], groups: [group(["conclusion", "result", "metric"], "statement"), group(["stage"], "mini-roadmap"), group(["risk"], "risk-list"), group(["action"], "action-list")] };
  if (narrativeType === "result-driven") return { skeleton: "overview-detail", layout: "expression-canvas", components: ["statement", "metric-card", "trend-sparkline", "narrative-chain", "risk-list", "action-list"], groups: [group(["conclusion", "result"], "statement"), group(["metric", "trend", "variance"], "metric-card"), group(["cause"], "narrative-chain"), group(["risk"], "risk-list"), group(["action"], "action-list")] };
  if (narrativeType === "comparison-driven") return { skeleton: "multi-line-comparison", layout: "expression-canvas", components: ["statement", "decision-matrix", "evidence-list", "risk-list"], groups: [group(["conclusion"], "statement"), group(["option"], "decision-matrix"), group(["evidence"], "evidence-list"), group(["risk"], "risk-list")] };
  if (narrativeType === "causal") return { skeleton: "left-right-argument", layout: "expression-canvas", components: ["statement", "narrative-chain", "evidence-list", "risk-list", "action-list"], groups: [group(["conclusion", "result"], "statement"), group(["cause"], "narrative-chain"), group(["evidence"], "evidence-list"), group(["risk", "constraint"], "risk-list"), group(["action", "unresolved"], "action-list")] };
  if (narrativeType === "hierarchical") return { skeleton: "centered-system", layout: "expression-canvas", components: ["statement", "status-board", "narrative-chain", "mini-roadmap"], groups: [group(["conclusion", "objective"], "statement"), group(["capability", "constraint"], "status-board"), group(["stage", "action"], "mini-roadmap")] };
  if (narrativeType === "flow-driven") return { skeleton: "timeline", layout: "flow-canvas", components: ["flow-node", "flow-edge"], groups: [group(["input", "actor", "action", "constraint", "output", "stage"], "flow-node")] };
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
  const total = Math.max(0, Math.min(100, Math.round(criticalCoverage * 32 + highCoverage * 18 + semanticMatch * 18 + coherence * 17 + 3 + semanticSignalBonus - repetitionPenalty - unsupportedInferencePenalty)));
  return { total, criticalCoverage, highCoverage, semanticMatch, coherence, semanticSignalBonus, repetitionPenalty, unsupportedInferencePenalty, rendererCompatibility: 1 };
}

function preferredNarratives(model, config) {
  const scenario = model.scenario.primary;
  const base = [...config.archetypes[scenario]];
  if (scenario === "review-update") {
    if (count(model, "stage") >= 2 && count(model, "action") >= 1) return ["temporal", "result-driven", "causal"];
    if (count(model, "metric") >= 2 || count(model, "trend") >= 1 || count(model, "variance") >= 1) return ["result-driven", "causal", "temporal"];
    return ["causal", "temporal", "result-driven"];
  }
  return base;
}

export function planExpressions(model, config = defaultConfig) {
  const candidates = preferredNarratives(model, config).slice(0, 3).map((narrativeType, rank) => {
    const selected = recipe(model, narrativeType);
    const regions = selected.groups.map((group, index) => ({ id: `region-${index + 1}`, purpose: group.types.join("-"), factIds: ids(model, group.types), preferredComponent: group.component, visualPriority: index === 0 ? "primary" : "secondary", widthIntent: index === 0 ? "full" : "adaptive" })).filter((region) => region.factIds.length);
    const candidate = { planId: `${model.modelId}-${narrativeType}`, scenario: model.scenario.primary, narrativeType, pageSkeleton: selected.skeleton, layout: selected.layout, regions, componentMix: selected.components, fallbackLayout: "large-canvas" };
    candidate.scoreBreakdown = scoreCandidate(model, candidate, rank);
    return candidate;
  }).sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);
  return {
    candidates,
    confidenceEvidence: { topScore: candidates[0]?.scoreBreakdown.total || 0, secondScore: candidates[1]?.scoreBreakdown.total || 0, scoreMargin: Math.max(0, (candidates[0]?.scoreBreakdown.total || 0) - (candidates[1]?.scoreBreakdown.total || 0)), missingRequiredSignals: model.facts.filter((fact) => fact.confidence === "missing").map((fact) => fact.id), unsupportedInferenceCount: model.facts.filter((fact) => fact.confidence === "inferred").length },
  };
}
