import assert from "node:assert/strict";
import { auditSourceExtraction } from "./lib/source-audit.mjs";

const source = `# 审核助手阶段汇报

系统已覆盖量级异常、延时分析、RR 调整、任务池查询和知识库问答五类能力。核心目标是把数据分析、异常发现、配置查询和业务问答统一到对话入口。

量级异常支持快速归因，延时分析可在分钟级定位，RR 调整支持空间回溯，任务池查询可以追踪链路，知识库用于沉淀高频解释。每日节省 3-4 小时人工分析时间，关键问题响应低于 30 秒。

当前仍需统一关键指标口径，固定双周复盘节奏，并把高频能力沉淀为可复用模块。执行链路包括任务触发、检索定位、智能总结和规则复用。代码与配置已经沉淀为稳定约束，Skill 与 Wiki 分层承载执行规则和长期知识，真实样本持续用于回归。`;

const sparse = {
  facts: [
    { id: "c1", type: "conclusion", importance: "critical", text: "能力已上线。" },
    { id: "e1", type: "evidence", importance: "high", text: "规则已经沉淀。" },
    { id: "a1", type: "action", importance: "high", text: "继续优化。" },
  ],
};
const sparseAudit = auditSourceExtraction({ sourceText: source, inventory: sparse });
assert.equal(sparseAudit.ok, false);
assert.match(sparseAudit.issues.join(" "), /too sparse|numeric evidence recall/);

const rich = {
  facts: [
    { id: "c1", type: "conclusion", importance: "critical", text: "把数据分析、异常发现、配置查询和业务问答统一到对话入口。", sourceQuote: "把数据分析、异常发现、配置查询和业务问答统一到对话入口" },
    { id: "m1", type: "metric", importance: "high", text: "覆盖五类能力。", value: "5类", sourceQuote: "系统已覆盖量级异常、延时分析、RR 调整、任务池查询和知识库问答五类能力" },
    { id: "m2", type: "metric", importance: "high", text: "每日节省 3-4 小时。", value: "3-4小时", sourceQuote: "每日节省 3-4 小时人工分析时间" },
    { id: "m3", type: "metric", importance: "high", text: "响应低于 30 秒。", value: "30秒", sourceQuote: "关键问题响应低于 30 秒" },
    { id: "h1", type: "hierarchy", importance: "high", text: "量级异常支持快速归因。", sourceQuote: "量级异常支持快速归因" },
    { id: "h2", type: "hierarchy", importance: "high", text: "延时分析支持分钟级定位。", sourceQuote: "延时分析可在分钟级定位" },
    { id: "h3", type: "hierarchy", importance: "medium", text: "任务池查询支持链路回溯。", sourceQuote: "任务池查询可以追踪链路" },
    { id: "e1", type: "evidence", importance: "high", text: "代码与配置已沉淀为稳定约束。", sourceQuote: "代码与配置已经沉淀为稳定约束" },
    { id: "e2", type: "evidence", importance: "medium", text: "真实样本持续用于回归。", sourceQuote: "真实样本持续用于回归" },
    { id: "a1", type: "action", importance: "high", text: "统一关键指标口径。", sourceQuote: "统一关键指标口径" },
    { id: "a2", type: "action", importance: "high", text: "固定双周复盘节奏。", sourceQuote: "固定双周复盘节奏" },
    { id: "p1", type: "process", importance: "medium", text: "任务触发。", sourceQuote: "任务触发" },
  ],
};
const richAudit = auditSourceExtraction({ sourceText: source, inventory: rich });
assert.equal(richAudit.ok, true, richAudit.issues.join("; "));
assert.ok(richAudit.recalledNumericSignals.length >= 2);

const missingSemanticTypes = {
  facts: rich.facts.filter((fact) => !["risk", "action", "process"].includes(fact.type)),
};
const semanticAudit = auditSourceExtraction({ sourceText: `${source}\n\n当前风险是权限边界仍未闭环，下一步行动是建立异常升级机制并按周复盘。`, inventory: missingSemanticTypes });
assert.equal(semanticAudit.ok, false);
assert.match(semanticAudit.issues.join(" "), /risk|action|process/i);

const sectionSource = [
  "第一部分给出总体判断与阶段结论，说明项目已经从试点进入稳定运行。",
  "第二部分记录三项业务指标，目标完成率 82%，效率提升 16%，风险数量为 3。",
  "第三部分展开关键证据，包括连续六周改善、真实用户复用和自动化覆盖扩大。",
  "第四部分说明主要风险和下一步行动，需要统一口径并建立双周复盘机制。",
].join("\n\n");
const sectionSparseAudit = auditSourceExtraction({
  sourceText: sectionSource,
  inventory: { facts: [{ id: "c1", type: "conclusion", importance: "critical", text: "项目进入稳定运行。", sourceQuote: "项目已经从试点进入稳定运行" }] },
});
assert.equal(sectionSparseAudit.ok, false);
assert.match(sectionSparseAudit.issues.join(" "), /section recall|numeric evidence recall/i);

console.log("ok: source extraction audit tests passed");
