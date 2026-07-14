import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { planSceneV5 } from "./lib/v5-scene-planner.mjs";

function model({ id, scenario, facts, relationships }) {
  return {
    schemaVersion: "1.0",
    modelId: id,
    inventoryId: `${id}-inventory`,
    scenario: { primary: scenario },
    audienceIntent: "quick-understanding",
    facts,
    relationships,
    readingLayers: { first: facts.filter((fact) => fact.importance === "critical").map((fact) => fact.id), second: facts.filter((fact) => fact.importance !== "critical").map((fact) => fact.id) },
    completenessLedger: { selected: facts.map((fact) => fact.id), merged: [], downgraded: [], omitted: [] },
  };
}

const fact = (id, type, text, extra = {}) => ({ id, type, text, importance: extra.importance || "high", sourceRef: "fixture", confidence: "supported", ...extra });

export const architectureModel = model({
  id: "capability-system",
  scenario: "product-capability",
  facts: [
    fact("conclusion", "conclusion", "能力体系由入口层和执行层共同构成", { importance: "critical" }),
    fact("layer1", "actor", "业务入口层"),
    fact("layer2", "actor", "智能执行层"),
    fact("layer3", "actor", "治理保障层"),
    fact("a1", "capability", "统一入口：一句话发起任务"),
    fact("a2", "capability", "身份上下文：识别用户和项目"),
    fact("a3", "capability", "场景路由：根据意图选择能力"),
    fact("b1", "capability", "任务编排：拆解步骤并调度工具"),
    fact("b2", "capability", "结果校验：检查证据和交付质量"),
    fact("b3", "capability", "工具执行：调用稳定业务接口"),
    fact("c1", "constraint", "权限治理：按身份控制读写范围"),
    fact("c2", "constraint", "审计追踪：保留关键操作证据"),
    fact("c3", "capability", "经验沉淀：将稳定流程封装复用")
  ],
  relationships: [
    { id: "r1", type: "belongs-to", from: "a1", to: "layer1" },
    { id: "r2", type: "belongs-to", from: "a2", to: "layer1" },
    { id: "r3", type: "belongs-to", from: "a3", to: "layer1" },
    { id: "r4", type: "belongs-to", from: "b1", to: "layer2" },
    { id: "r5", type: "belongs-to", from: "b2", to: "layer2" },
    { id: "r6", type: "belongs-to", from: "b3", to: "layer2" },
    { id: "r7", type: "belongs-to", from: "c1", to: "layer3" },
    { id: "r8", type: "belongs-to", from: "c2", to: "layer3" },
    { id: "r9", type: "belongs-to", from: "c3", to: "layer3" },
    { id: "r10", type: "supports", from: "a1", to: "b1" },
    { id: "r11", type: "supports", from: "a2", to: "b2" },
    { id: "r12", type: "supports", from: "b3", to: "c2" }
  ]
});

export const swimlaneModel = model({
  id: "approval-flow",
  scenario: "process-collaboration",
  facts: [
    fact("conclusion", "conclusion", "从需求提交到复盘形成跨角色闭环", { importance: "critical" }),
    fact("owner1", "actor", "业务负责人"),
    fact("owner2", "actor", "数据团队"),
    fact("owner3", "actor", "治理与平台团队"),
    fact("s1", "input", "提交分析需求：明确目标和口径"),
    fact("s2", "action", "确认数据范围：校验来源和权限"),
    fact("s3", "action", "权限核验：确认数据使用边界"),
    fact("s4", "action", "执行分析：输出结论和证据"),
    fact("s5", "output", "业务验收：确认结论和行动"),
    fact("s6", "action", "沉淀复盘：将有效方法转成规范")
  ],
  relationships: [
    { id: "o1", type: "owned-by", from: "s1", to: "owner1" },
    { id: "o2", type: "owned-by", from: "s2", to: "owner2" },
    { id: "o3", type: "owned-by", from: "s3", to: "owner3" },
    { id: "o4", type: "owned-by", from: "s4", to: "owner2" },
    { id: "o5", type: "owned-by", from: "s5", to: "owner1" },
    { id: "o6", type: "owned-by", from: "s6", to: "owner3" },
    { id: "p1", type: "precedes", from: "s1", to: "s2" },
    { id: "p2", type: "precedes", from: "s2", to: "s3" },
    { id: "p3", type: "precedes", from: "s3", to: "s4" },
    { id: "p4", type: "precedes", from: "s4", to: "s5" },
    { id: "p5", type: "precedes", from: "s5", to: "s6" }
  ]
});

export const flywheelModel = model({
  id: "growth-loop",
  scenario: "strategy-proposal",
  facts: [
    fact("conclusion", "objective", "以用户反馈驱动能力持续复用", { importance: "critical" }),
    fact("f1", "stage", "场景接入：收集高频需求"),
    fact("f2", "stage", "能力沉淀：封装稳定流程"),
    fact("f3", "stage", "试点验证：确认效果与边界"),
    fact("f4", "stage", "规模复用：覆盖更多团队"),
    fact("f5", "stage", "反馈评估：识别下一轮优化")
  ],
  relationships: [
    { id: "c1", type: "precedes", from: "f1", to: "f2" },
    { id: "c2", type: "precedes", from: "f2", to: "f3" },
    { id: "c3", type: "precedes", from: "f3", to: "f4" },
    { id: "c4", type: "produces", from: "f4", to: "f5" },
    { id: "c5", type: "supports", from: "f5", to: "f1" }
  ]
});

export const decisionModel = model({
  id: "platform-selection",
  scenario: "research-decision",
  facts: [
    fact("conclusion", "conclusion", "方案 A 更适合作为长期知识底座", { importance: "critical" }),
    fact("optionA", "option", "方案 A：结构化知识平台"),
    fact("optionB", "option", "方案 B：通用文档空间"),
    fact("criterion1", "evidence", "长期可读：Agent 可以稳定检索与引用"),
    fact("criterion2", "constraint", "维护成本：需要控制多人协作复杂度"),
    fact("criterion3", "evidence", "执行衔接：规则可以直接进入 Skill")
  ],
  relationships: [
    { id: "d1", type: "supports", from: "criterion1", to: "optionA" },
    { id: "d2", type: "supports", from: "criterion3", to: "optionA" },
    { id: "d3", type: "conflicts-with", from: "criterion2", to: "optionB" },
    { id: "d4", type: "contrasts", from: "optionA", to: "optionB" }
  ]
});

export const evidenceModel = model({
  id: "growth-thesis",
  scenario: "strategy-proposal",
  facts: [
    fact("thesis", "conclusion", "增长放缓的核心原因是转化链路断点，而不是流量不足", { importance: "critical" }),
    fact("e1", "evidence", "流量供给：近三个月访问量保持稳定"),
    fact("e2", "cause", "首轮激活：新用户在配置环节流失"),
    fact("e3", "evidence", "用户访谈：关键价值出现时间晚于预期"),
    fact("e4", "result", "试点结果：缩短配置后转化率提升 18%")
  ],
  relationships: [
    { id: "e-r1", type: "supports", from: "e1", to: "thesis" },
    { id: "e-r2", type: "causes", from: "e2", to: "thesis" },
    { id: "e-r3", type: "supports", from: "e3", to: "thesis" },
    { id: "e-r4", type: "supports", from: "e4", to: "thesis" }
  ]
});

export const dashboardModel = model({
  id: "quarterly-review",
  scenario: "review-update",
  facts: [
    fact("conclusion", "conclusion", "季度主线整体达成，但转化和风险闭环仍需加强", { importance: "critical" }),
    fact("m1", "metric", "目标完成率：78%"),
    fact("m2", "result", "新增客户：126个"),
    fact("m3", "variance", "成本变化：-12%"),
    fact("m4", "metric", "重点项目覆盖率：64%"),
    fact("risk1", "risk", "数据口径：跨团队指标定义仍不一致"),
    fact("action1", "action", "下阶段行动：建立统一指标字典"),
    fact("cause1", "cause", "转化瓶颈：试点到规模化缺少标准路径")
  ],
  relationships: [
    { id: "q1", type: "causes", from: "cause1", to: "m1" },
    { id: "q2", type: "mitigates", from: "action1", to: "risk1" }
  ]
});

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [semanticModel, expected] of [[architectureModel, "layered-architecture"], [swimlaneModel, "swimlane-process"], [flywheelModel, "flywheel-loop"], [decisionModel, "decision-comparison"], [evidenceModel, "evidence-argument"], [dashboardModel, "operating-dashboard"]]) {
    const result = planSceneV5(semanticModel);
    assert.equal(result.selected?.scene, expected);
    assert.notEqual(result.confidence.level, "low");
    assert.ok(result.selected.nodes.length >= 4);
    assert.equal(result.coverage.passed, true);
    assert.equal(new Set(result.selected.sourceFactIds).size, result.selected.sourceFactIds.length);
  }

  assert.equal(planSceneV5(architectureModel).selected.layers.length, 3);
  assert.equal(planSceneV5(swimlaneModel).selected.lanes.length, 3);
  assert.equal(planSceneV5(flywheelModel).selected.nodes.length, 5);
  assert.equal(planSceneV5(decisionModel).selected.optionNodeIds.length, 2);
  assert.equal(planSceneV5(evidenceModel).selected.evidenceNodeIds.length, 4);
  assert.equal(planSceneV5(dashboardModel).selected.metricNodeIds.length, 4);

  console.log("ok: V5 scene planner tests passed");
}
