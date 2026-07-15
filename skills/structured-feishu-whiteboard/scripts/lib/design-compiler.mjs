import { planExpressions } from "./expression-planner.mjs";
import { compileCandidateBrief } from "./v44-brief-compiler.mjs";
import { planSceneV5 } from "./v5-scene-planner.mjs";

const STYLE_BY_SCENARIO = {
  "review-update": "linear-system",
  "strategy-proposal": "apple-report",
  "project-plan": "professional-blue",
  "research-decision": "apple-report",
  "product-capability": "linear-system",
  "process-collaboration": "professional-blue",
};

export function selectProductionStyle(model, requested = "auto") {
  if (requested && requested !== "auto") return requested;
  return STYLE_BY_SCENARIO[model.scenario.primary] || "professional-blue";
}

function signature(candidate) {
  return [
    candidate.layout,
    candidate.pageSkeleton,
    candidate.narrativeType,
    [...new Set(candidate.componentMix || [])].sort().join(","),
  ].join("|");
}

export function compileDesignCandidates({ semanticModel, title, style = "auto", maximum = 3 }) {
  const planning = planExpressions(semanticModel);
  const resolvedStyle = selectProductionStyle(semanticModel, style);
  const seen = new Set();
  const candidates = [];

  for (const candidate of planning.candidates || []) {
    const key = signature(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    const brief = compileCandidateBrief({ semanticModel, candidate, style: resolvedStyle, title });
    candidates.push({
      id: `candidate-${candidates.length + 1}`,
      planId: candidate.planId,
      narrativeType: candidate.narrativeType,
      pageSkeleton: candidate.pageSkeleton,
      semanticScore: candidate.scoreBreakdown?.total || 0,
      componentMix: [...new Set(brief.expressionBlocks?.map((block) => block.type) || [brief.flowMode || "flow"])],
      brief,
    });
    if (candidates.length >= maximum) break;
  }

  const sceneDecision = planSceneV5(semanticModel, { style: resolvedStyle, title });
  if (sceneDecision.selected) {
    candidates.push({
      id: `candidate-${candidates.length + 1}`,
      kind: "scene",
      planId: `${semanticModel.modelId}-${sceneDecision.selected.scene}`,
      narrativeType: sceneDecision.selected.scene,
      pageSkeleton: sceneDecision.selected.scene,
      semanticScore: sceneDecision.selected.confidence?.score || 0,
      componentMix: [`scene:${sceneDecision.selected.scene}`, "relationship-graph"],
      scenePlan: sceneDecision.selected,
    });
  }

  return {
    style: resolvedStyle,
    planning,
    sceneDecision,
    candidates,
  };
}
