import assert from "node:assert/strict";
import { compileSemanticModel } from "./lib/semantic-compiler.mjs";
import { validateSemanticModel } from "./lib/semantic-model.mjs";

function inventory(id, title, facts) {
  return { inventoryId: id, title, sourceType: "report", sourceRef: `inline:${id}`, facts: facts.map((fact, index) => ({ importance: index === 0 ? "critical" : "high", ...fact })) };
}

const cases = [
  ["review-update", inventory("review-1", "Q2 复盘与 Q3 规划", [
    { id: "result-1", type: "metric", text: "Q2 目标完成率 82%，较 Q1 提升 12%。", value: "82%" },
    { id: "cause-1", type: "evidence", text: "提升主要来自渠道转化改善。", relation: "cause", relatedFactIds: ["result-1"] },
    { id: "action-1", type: "action", text: "Q3 统一数据口径并扩大试点。" },
  ])],
  ["strategy-proposal", inventory("strategy-1", "增长战略方案", [
    { id: "conclusion-1", type: "conclusion", text: "未来半年聚焦企业客户与生态渠道。" },
    { id: "constraint-1", type: "constraint", text: "资源只能支持两条战略主线。" },
    { id: "action-1", type: "action", text: "分阶段建设渠道和交付能力。" },
  ])],
  ["project-plan", inventory("plan-1", "新产品上线计划", [
    { id: "objective-1", type: "conclusion", text: "目标是在九月完成产品上线。" },
    { id: "stage-1", type: "timeline", text: "七月完成方案，八月完成试点。", order: 1 },
    { id: "risk-1", type: "risk", text: "依赖数据接口按期交付。" },
  ])],
  ["research-decision", inventory("research-1", "知识库方案调研", [
    { id: "question-1", type: "context", text: "需要选择长期知识承载方案。" },
    { id: "comparison-1", type: "comparison", text: "Wiki 稳定性强，文档展示性强。" },
    { id: "evidence-1", type: "evidence", text: "三个团队试用结果支持分层承载。" },
  ])],
  ["product-capability", inventory("product-1", "审核智能助手能力介绍", [
    { id: "value-1", type: "conclusion", text: "帮助审核团队快速定位异常并形成结论。" },
    { id: "capability-1", type: "hierarchy", text: "具备量级、延时和任务链分析能力。" },
    { id: "process-1", type: "process", text: "用户输入队列后自动查询、诊断和输出。" },
  ])],
  ["process-collaboration", inventory("flow-1", "跨角色审批流程", [
    { id: "trigger-1", type: "process", text: "业务提交申请。", order: 1, lane: "业务" },
    { id: "decision-1", type: "process", text: "负责人判断是否通过。", order: 2, lane: "负责人" },
    { id: "output-1", type: "process", text: "系统归档结果。", order: 3, lane: "系统" },
  ])],
];

for (const [expected, source] of cases) {
  const model = compileSemanticModel({ inventory: source });
  assert.equal(model.scenario.primary, expected, `${source.inventoryId} should compile as ${expected}`);
  assert.deepEqual(validateSemanticModel(model), [], `${source.inventoryId} semantic model must be valid`);
  assert.ok(model.archetypeEvidence.find((entry) => entry.scenario === expected)?.score > 0);
  assert.ok(model.readingLayers.first.length >= 1);
}

const incompleteReview = compileSemanticModel({ inventory: inventory("review-2", "阶段总结", [
  { id: "result-1", type: "conclusion", text: "核心能力已经上线。" },
  { id: "risk-1", type: "risk", text: "数据口径仍需统一。" },
]) });
assert.equal(incompleteReview.scenario.primary, "review-update");
assert.ok(incompleteReview.facts.some((fact) => fact.type === "unresolved" && fact.confidence === "missing"), "incomplete review should mark missing next action instead of inventing it");

const governanceStrategy = compileSemanticModel({ inventory: inventory("strategy-ambiguous", "Agent 治理方向材料", [
  { id: "c1", type: "conclusion", text: "可信 Agent 需要自主性与控制能力共同设计。" },
  { id: "k1", type: "constraint", text: "跨应用执行会扩大意图误读影响。" },
  { id: "k2", type: "constraint", text: "提示注入会放大权限风险。" },
  { id: "a1", type: "action", text: "先建立控制面再扩大自主范围。" },
]) });
assert.equal(governanceStrategy.scenario.primary, "strategy-proposal", "incidental product words in body text must not override the strategy fact structure");

const openQuestionResearch = compileSemanticModel({ inventory: inventory("open-question-research", "关于模型福利的开放问题材料", [
  { id: "q1", type: "context", text: "模型是否具有体验仍是开放问题。" },
  { id: "e1", type: "evidence", text: "现有研究只提供有限证据。" },
  { id: "r1", type: "risk", text: "目前缺少可靠测量方法。" },
  { id: "a1", type: "action", text: "继续开展跨学科研究。" },
]) });
assert.equal(openQuestionResearch.scenario.primary, "research-decision", "an explicit open question with evidence must route to research-decision");

const measurableCapability = compileSemanticModel({ inventory: inventory("product-measures", "审核智能助手能力概览", [
  { id: "c1", type: "conclusion", text: "审核智能助手已经形成稳定能力闭环。" },
  { id: "h1", type: "hierarchy", text: "覆盖 5 类核心分析能力。" },
  { id: "e1", type: "evidence", text: "日均节省 3-4 小时人工分析时间。" },
  { id: "e2", type: "evidence", text: "关键问题响应时间小于 30 秒。" },
]) });
assert.equal(measurableCapability.facts.find((fact) => fact.id === "h1")?.visualType, "metric", "measurable capability counts must be available to visual planning as metrics");
assert.equal(measurableCapability.facts.find((fact) => fact.id === "e1")?.visualType, "metric", "measurable evidence must not degrade into a text-only list");
assert.equal(measurableCapability.facts.find((fact) => fact.id === "e2")?.measure?.qualifier, "<", "metric qualifiers must be preserved");

const metricBoundaries = compileSemanticModel({ inventory: inventory("metric-boundaries", "指标边界材料", [
  { id: "dated", type: "evidence", text: "2025 年覆盖 5 个业务场景。" },
  { id: "staffing", type: "evidence", text: "异常结果仍需 2 人复核。" },
  { id: "approval", type: "evidence", text: "采用 3 级审批机制。" },
]) });
assert.equal(metricBoundaries.facts.find((fact) => fact.id === "dated")?.measure?.display, "5个", "the compiler must continue past a year prefix to find the real business metric");
assert.notEqual(metricBoundaries.facts.find((fact) => fact.id === "staffing")?.visualType, "metric", "a staffing constraint is not automatically a result metric");
assert.notEqual(metricBoundaries.facts.find((fact) => fact.id === "approval")?.visualType, "metric", "an approval level is not automatically a result metric");

console.log("ok: semantic compiler tests passed");
