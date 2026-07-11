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
  if (scenario === "process-collaboration" && narrativeType === "flow-driven") return { skeleton: "swimlane", layout: "flow-canvas", components: ["flow-node", "flow-edge", "lane"], groups: [["input", "actor", "action", "constraint", "output"]] };
  if (scenario === "research-decision" && narrativeType === "comparison-driven") return { skeleton: "left-right-argument", layout: "expression-canvas", components: ["statement", "evidence-list", "decision-matrix", "risk-list"], groups: [["conclusion", "unresolved"], ["evidence"], ["option"], ["risk"]] };
  if (scenario === "product-capability" && narrativeType === "hierarchical") return { skeleton: "centered-system", layout: "expression-canvas", components: ["statement", "status-board", "narrative-chain", "evidence-list"], groups: [["conclusion"], ["capability"], ["stage"], ["evidence"]] };
  if (narrativeType === "temporal") return { skeleton: scenario === "review-update" ? "past-future-split" : "timeline", layout: "expression-canvas", components: ["statement", "metric-card", "mini-roadmap", "risk-list", "action-list"], groups: [["conclusion", "result", "metric"], ["stage"], ["risk"], ["action"]] };
  if (narrativeType === "result-driven") return { skeleton: "overview-detail", layout: "expression-canvas", components: ["statement", "metric-card", "trend-sparkline", "variance-bridge-v2", "risk-list", "action-list"], groups: [["conclusion", "result"], ["metric", "trend", "variance"], ["cause"], ["risk"], ["action"]] };
  if (narrativeType === "comparison-driven") return { skeleton: "multi-line-comparison", layout: "expression-canvas", components: ["statement", "decision-matrix", "evidence-list", "risk-list"], groups: [["conclusion"], ["option"], ["evidence"], ["risk"]] };
  if (narrativeType === "causal") return { skeleton: "left-right-argument", layout: "expression-canvas", components: ["statement", "narrative-chain", "evidence-list", "risk-list", "action-list"], groups: [["conclusion", "result"], ["cause"], ["evidence"], ["risk"], ["action", "unresolved"]] };
  if (narrativeType === "hierarchical") return { skeleton: "centered-system", layout: "expression-canvas", components: ["statement", "status-board", "narrative-chain", "mini-roadmap"], groups: [["conclusion", "objective"], ["capability", "constraint"], ["stage", "action"]] };
  if (narrativeType === "flow-driven") return { skeleton: "timeline", layout: "flow-canvas", components: ["flow-node", "flow-edge"], groups: [["input", "actor", "action", "constraint", "output", "stage"]] };
  return { skeleton: "overview-detail", layout: "expression-canvas", components: ["statement", "evidence-list", "risk-list", "action-list"], groups: [["conclusion", "result"], ["cause", "evidence"], ["risk"], ["action", "unresolved"]] };
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
  const total = Math.max(0, Math.min(100, Math.round(criticalCoverage * 35 + highCoverage * 20 + semanticMatch * 20 + coherence * 20 + 5 - repetitionPenalty - unsupportedInferencePenalty)));
  return { total, criticalCoverage, highCoverage, semanticMatch, coherence, repetitionPenalty, unsupportedInferencePenalty, rendererCompatibility: 1 };
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
    const regions = selected.groups.map((types, index) => ({ id: `region-${index + 1}`, purpose: types.join("-"), factIds: ids(model, types), preferredComponent: selected.components[Math.min(index, selected.components.length - 1)], visualPriority: index === 0 ? "primary" : "secondary", widthIntent: index === 0 ? "full" : "adaptive" })).filter((region) => region.factIds.length);
    const candidate = { planId: `${model.modelId}-${narrativeType}`, scenario: model.scenario.primary, narrativeType, pageSkeleton: selected.skeleton, layout: selected.layout, regions, componentMix: selected.components, fallbackLayout: "large-canvas" };
    candidate.scoreBreakdown = scoreCandidate(model, candidate, rank);
    return candidate;
  }).sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);
  return {
    candidates,
    confidenceEvidence: { topScore: candidates[0]?.scoreBreakdown.total || 0, secondScore: candidates[1]?.scoreBreakdown.total || 0, scoreMargin: Math.max(0, (candidates[0]?.scoreBreakdown.total || 0) - (candidates[1]?.scoreBreakdown.total || 0)), missingRequiredSignals: model.facts.filter((fact) => fact.confidence === "missing").map((fact) => fact.id), unsupportedInferenceCount: model.facts.filter((fact) => fact.confidence === "inferred").length },
  };
}
