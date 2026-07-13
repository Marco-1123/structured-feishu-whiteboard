import assert from "node:assert/strict";
import { compileV44Brief, decideConfidence } from "./lib/v44-brief-compiler.mjs";

const semanticModel = {
  schemaVersion: "1.0", modelId: "semantic-review", inventoryId: "review-1",
  scenario: { primary: "review-update" }, audienceIntent: "quick-understanding",
  facts: [
    { id: "conclusion-1", type: "conclusion", text: "Q2 主线整体达到预期", importance: "critical", sourceRef: "conclusion-1", confidence: "supported" },
    { id: "metric-1", type: "metric", text: "目标完成率 82%", value: "82%", importance: "high", sourceRef: "metric-1", confidence: "supported" },
    { id: "risk-1", type: "risk", text: "数据口径仍需统一", importance: "high", sourceRef: "risk-1", confidence: "supported" },
    { id: "action-1", type: "action", text: "Q3 统一指标字典", importance: "high", sourceRef: "action-1", confidence: "draft" },
  ], relationships: [], readingLayers: { first: ["conclusion-1", "metric-1"], second: ["risk-1", "action-1"] }, completenessLedger: { selected: ["conclusion-1", "metric-1", "risk-1", "action-1"], merged: [], downgraded: [], omitted: [] },
};

function candidate(id, total, narrativeType = "result-driven") {
  return { planId: id, scenario: "review-update", narrativeType, pageSkeleton: "overview-detail", layout: "expression-canvas", regions: [
    { id: "r1", purpose: "conclusion", factIds: ["conclusion-1"], preferredComponent: "statement", visualPriority: "primary", widthIntent: "full" },
    { id: "r2", purpose: "metric", factIds: ["metric-1"], preferredComponent: "metric-card", visualPriority: "secondary", widthIntent: "adaptive" },
    { id: "r3", purpose: "risk", factIds: ["risk-1"], preferredComponent: "risk-list", visualPriority: "secondary", widthIntent: "adaptive" },
    { id: "r4", purpose: "action", factIds: ["action-1"], preferredComponent: "action-list", visualPriority: "secondary", widthIntent: "adaptive" },
  ], componentMix: ["statement", "metric-card", "risk-list", "action-list"], fallbackLayout: "large-canvas", scoreBreakdown: { total, criticalCoverage: 1, highCoverage: 1, semanticMatch: 1, coherence: 1, rendererCompatibility: 1 } };
}

assert.equal(decideConfidence({ candidates: [candidate("a", 92), candidate("b", 76)], confidenceEvidence: { scoreMargin: 16, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }).level, "high");
assert.equal(decideConfidence({ candidates: [candidate("a", 92), candidate("b", 91)], confidenceEvidence: { scoreMargin: 1, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }).level, "medium", "two strong expression plans are a deterministic medium-confidence choice, not a semantic failure");
assert.equal(decideConfidence({ candidates: [candidate("a", 76), candidate("b", 70)], confidenceEvidence: { scoreMargin: 6, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }).level, "medium");
assert.equal(decideConfidence({ candidates: [candidate("a", 54), candidate("b", 52)], confidenceEvidence: { scoreMargin: 2, missingRequiredSignals: ["action"], unsupportedInferenceCount: 1 } }).level, "low");

const compiled = compileV44Brief({ semanticModel, planningResult: { candidates: [candidate("a", 92), candidate("b", 76)], confidenceEvidence: { scoreMargin: 16, missingRequiredSignals: [], unsupportedInferenceCount: 0 } }, style: "linear-system", title: "Q2 阶段复盘" });
assert.equal(compiled.brief.pipelineVersion, "4.4");
assert.equal(compiled.brief.layout, "expression-canvas");
assert.equal(compiled.brief.engine, "v4");
assert.equal(compiled.brief.pageSkeleton, "overview-detail", "the selected page skeleton must reach the renderer brief");
assert.equal(compiled.decision.level, "high");
assert.deepEqual(compiled.brief.planning.selectedFactIds.sort(), semanticModel.facts.map((fact) => fact.id).sort());
assert.ok(compiled.brief.expressionBlocks.some((block) => block.type === "metric-card"));
assert.equal(compiled.brief.subtitle, "结果与变化、风险边界、后续行动");
assert.ok(!compiled.brief.subtitle.includes("review-update"), "internal routing ids must not leak into the board");

const groupedMetricModel = {
  ...semanticModel,
  inventoryId: "review-grouped-metrics",
  facts: [
    semanticModel.facts[0],
    { id: "metric-coverage", type: "metric", text: "研究覆盖约 40 万次交互会话和约 23.5 万名用户", value: "400K", importance: "high", sourceRef: "metric-coverage", confidence: "supported" },
    { id: "metric-growth", type: "metric", text: "七个月内典型任务估算价值平均提高约 25%", value: "+25%", importance: "high", sourceRef: "metric-growth", confidence: "supported" },
  ],
};
const groupedMetricCandidate = {
  ...candidate("grouped", 94),
  regions: [{ id: "statement-with-metrics", purpose: "conclusion-metric", factIds: ["conclusion-1", "metric-coverage", "metric-growth"], preferredComponent: "statement", visualPriority: "primary", widthIntent: "full" }],
};
const groupedMetricBrief = compileV44Brief({ semanticModel: groupedMetricModel, planningResult: { candidates: [groupedMetricCandidate, candidate("b", 70)], confidenceEvidence: { scoreMargin: 24, missingRequiredSignals: [], unsupportedInferenceCount: 0 } } }).brief;
const groupedMetricText = JSON.stringify(groupedMetricBrief.expressionBlocks);
assert.match(groupedMetricText, /七个月内典型任务估算价值平均提高约 25%/, "high-importance metrics grouped with a statement must remain fully visible");
assert.ok(groupedMetricBrief.expressionBlocks.filter((block) => block.type === "metric-card").length >= 2, "grouped metrics should become metric cards instead of being clipped into the statement");

const longConclusionModel = {
  ...semanticModel,
  inventoryId: "long-conclusions",
  facts: [
    { id: "long-1", type: "conclusion", text: "第一条核心判断需要完整说明业务背景、当前结果、关键边界以及后续需要持续验证的方向，因此自身已经接近结论区的可见容量上限。", importance: "critical", sourceRef: "long-1", confidence: "supported" },
    { id: "long-2", type: "result", text: "第二条结果不能在未显示时被计入事实覆盖。", importance: "high", sourceRef: "long-2", confidence: "supported" },
  ],
};
const longConclusionCandidate = {
  ...candidate("long-conclusions", 94),
  regions: [{ id: "long-statement", purpose: "conclusion", factIds: ["long-1", "long-2"], preferredComponent: "statement", visualPriority: "primary", widthIntent: "full" }],
};
const longConclusionBrief = compileV44Brief({ semanticModel: longConclusionModel, planningResult: { candidates: [longConclusionCandidate, candidate("b", 70)], confidenceEvidence: { scoreMargin: 24, missingRequiredSignals: [], unsupportedInferenceCount: 0 } } }).brief;
assert.deepEqual(longConclusionBrief.planning.selectedFactIds, ["long-1"], "a clipped statement must not claim facts that never became visible");
assert.ok(longConclusionBrief.planning.omittedFacts.some((fact) => fact.id === "long-2"));

const embeddedChainModel = {
  ...semanticModel,
  inventoryId: "embedded-chain-evidence",
  facts: [
    semanticModel.facts[0],
    { id: "process-1", type: "process-chain", text: "自动查询并完成诊断", importance: "high", sourceRef: "process-1", confidence: "supported" },
    { id: "evidence-long", type: "evidence", text: "知识库沉淀场景导航、通用决策约定、概念解释、错误原因与日志。", importance: "high", sourceRef: "evidence-long", confidence: "supported" },
  ],
};
const embeddedChainCandidate = {
  ...candidate("embedded-chain", 94, "hierarchical"),
  pageSkeleton: "centered-system",
  regions: [
    { id: "statement", purpose: "conclusion", factIds: ["conclusion-1"], preferredComponent: "statement", visualPriority: "primary", widthIntent: "full" },
    { id: "chain", purpose: "process-chain-evidence", factIds: ["process-1", "evidence-long"], preferredComponent: "narrative-chain", visualPriority: "secondary", widthIntent: "adaptive" },
  ],
};
const embeddedChainBrief = compileV44Brief({ semanticModel: embeddedChainModel, planningResult: { candidates: [embeddedChainCandidate, candidate("b", 70)], confidenceEvidence: { scoreMargin: 24, missingRequiredSignals: [], unsupportedInferenceCount: 0 } } }).brief;
const embeddedEvidenceItem = embeddedChainBrief.expressionBlocks.find((block) => block.type === "narrative-chain").items.at(-1);
assert.ok(embeddedEvidenceItem.note, "long evidence embedded in a directional component must split into a short label and visible secondary text");
assert.equal(`${embeddedEvidenceItem.label}${embeddedEvidenceItem.note}`, embeddedChainModel.facts.at(-1).text);

const low = compileV44Brief({ semanticModel, planningResult: { candidates: [candidate("a", 54), candidate("b", 52)], confidenceEvidence: { scoreMargin: 2, missingRequiredSignals: ["action"], unsupportedInferenceCount: 1 } }, style: "linear-system", title: "混合材料" });
assert.equal(low.decision.level, "low");
assert.equal(low.requiresUserChoice, true);
assert.equal(low.fallback.version, "4.3");

const flowModel = {
  ...semanticModel,
  modelId: "semantic-flow",
  scenario: { primary: "process-collaboration" },
  facts: [
    { id: "p1", type: "input", text: "业务提交申请", importance: "critical", sourceRef: "p1", confidence: "supported", actor: "业务", order: 1 },
    { id: "p2", type: "action", text: "系统校验材料", importance: "high", sourceRef: "p2", confidence: "supported", actor: "系统", order: 2 },
    { id: "p3", type: "output", text: "结果回传归档", importance: "high", sourceRef: "p3", confidence: "supported", actor: "系统", order: 3 },
    { id: "risk-1", type: "risk", text: "异常材料转人工复核", importance: "high", sourceRef: "risk-1", confidence: "supported" },
  ],
};
const flowCandidate = { planId: "flow-plan", scenario: "process-collaboration", narrativeType: "flow-driven", pageSkeleton: "swimlane", layout: "flow-canvas", regions: [{ id: "flow", purpose: "flow", factIds: ["p1", "p2", "p3"], preferredComponent: "flow-node", visualPriority: "primary", widthIntent: "full" }], componentMix: ["flow-node", "flow-edge", "lane"], fallbackLayout: "large-canvas", scoreBreakdown: { total: 94, criticalCoverage: 1, highCoverage: 1, semanticMatch: 1, coherence: 1, rendererCompatibility: 1 } };
const flowCompiled = compileV44Brief({ semanticModel: flowModel, planningResult: { candidates: [flowCandidate, candidate("b", 70)], confidenceEvidence: { scoreMargin: 24, missingRequiredSignals: [], unsupportedInferenceCount: 0 } } });
assert.ok(flowCompiled.brief.planning.selectedFactIds.includes("risk-1"));
assert.ok(flowCompiled.brief.flowNodes.some((node) => node.type === "risk"));
assert.ok(flowCompiled.brief.flowEdges.some((edge) => edge.label === "边界与保障"));
assert.ok(!flowCompiled.brief.flowEdges.some((edge) => edge.type === "fallback"), "a risk fact must not become an inferred exception branch without an explicit relationship");
assert.ok(flowCompiled.brief.flowNodes.findIndex((node) => node.type === "risk") < flowCompiled.brief.flowNodes.findIndex((node) => node.type === "result"));

console.log("ok: V4.4 brief compiler tests passed");
