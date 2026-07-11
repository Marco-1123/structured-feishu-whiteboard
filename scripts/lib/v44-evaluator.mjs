import { compileSemanticModel } from "./semantic-compiler.mjs";
import { planExpressions } from "./expression-planner.mjs";
import { compileV44Brief } from "./v44-brief-compiler.mjs";

export function evaluateV44(cases) {
  const results = cases.map((testCase) => {
    const semantic = compileSemanticModel({ inventory: testCase.inventory });
    const plans = planExpressions(semantic);
    const decision = compileV44Brief({ semanticModel: semantic, planningResult: plans, title: testCase.inventory.title });
    return { id: testCase.id, group: testCase.group, expectedScenario: testCase.expectedScenario, actualScenario: semantic.scenario.primary, scenarioMatch: semantic.scenario.primary === testCase.expectedScenario, narrativeType: plans.candidates[0]?.narrativeType || null, pageSkeleton: plans.candidates[0]?.pageSkeleton || null, componentMix: plans.candidates[0]?.componentMix || [], confidence: decision.decision.level, pipeline: decision.brief ? "v4.4" : "v4.3-fallback" };
  });
  const accuracy = results.filter((result) => result.scenarioMatch).length / results.length;
  const distinctNarratives = new Set(results.map((result) => result.narrativeType)).size;
  const distinctSkeletons = new Set(results.map((result) => result.pageSkeleton)).size;
  const distinctComponentMixes = new Set(results.map((result) => result.componentMix.join("|"))).size;
  const fallbackRate = results.filter((result) => result.pipeline === "v4.3-fallback").length / results.length;
  return { summary: { cases: results.length, scenarioAccuracy: accuracy, distinctNarratives, distinctSkeletons, distinctComponentMixes, fallbackRate, passed: results.length >= 42 && accuracy >= 0.85 && distinctNarratives >= 5 && distinctSkeletons >= 5 && distinctComponentMixes >= 5 }, results };
}
