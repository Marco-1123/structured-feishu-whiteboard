import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = [];
const fact = (id, type, text, importance = "high", extra = {}) => ({ id, type, text, importance, ...extra });
function add(id, scenario, title, facts, group = scenario) { cases.push({ id, group, expectedScenario: scenario, inventory: { inventoryId: id, title, sourceType: "report", facts } }); }

for (let i = 1; i <= 12; i += 1) add(`review-${i}`, "review-update", `${i % 3 === 0 ? "半年度总结" : i % 3 === 1 ? "季度复盘" : "项目阶段汇报"}：成果、问题与下一阶段规划`, [
  fact("c1", "conclusion", `阶段主线整体达成，第 ${i} 组试点进入稳定期`, "critical"),
  fact("m1", "metric", `目标完成率 ${76 + i}%`, "high", { value: `${76 + i}%` }),
  fact("m2", "metric", `效率提升 ${8 + i}%`, "high", { value: `+${8 + i}%` }),
  fact("r1", "risk", "跨团队数据口径仍需统一"), fact("a1", "action", "下一阶段建立统一复盘节奏"), fact("e1", "evidence", "连续四周核心指标改善", "medium")
]);

for (let i = 1; i <= 5; i += 1) add(`strategy-${i}`, "strategy-proposal", `业务增长策略方案 ${i}`, [fact("c1", "conclusion", "建议从高价值场景切入", "critical"), fact("e1", "evidence", "重点客户需求集中在效率和稳定性"), fact("r1", "risk", "资源投入与回报周期存在不确定性"), fact("a1", "action", "先完成小范围验证"), fact("x1", "constraint", "预算和人力必须控制在现有范围")]);
for (let i = 1; i <= 5; i += 1) add(`plan-${i}`, "project-plan", `项目实施计划与里程碑 ${i}`, [fact("c1", "conclusion", "项目分三阶段交付", "critical"), fact("p1", "process", "阶段一完成需求对齐", "high", { order: 1 }), fact("p2", "process", "阶段二完成试点上线", "high", { order: 2 }), fact("p3", "process", "阶段三完成规模推广", "high", { order: 3 }), fact("r1", "risk", "依赖接口交付时间"), fact("a1", "action", "本周确认里程碑责任人")]);
for (let i = 1; i <= 5; i += 1) add(`research-${i}`, "research-decision", `方案调研与选型决策 ${i}`, [fact("c1", "conclusion", "方案 A 更适合作为长期底座", "critical"), fact("o1", "comparison", "方案 A 稳定性强但实施成本中等"), fact("o2", "comparison", "方案 B 上线快但扩展性弱"), fact("e1", "evidence", "真实试点验证了读取稳定性"), fact("r1", "risk", "迁移成本需要单独评估"), fact("a1", "action", "补充两周压力测试")]);
for (let i = 1; i <= 5; i += 1) add(`product-${i}`, "product-capability", `智能助手产品能力介绍 ${i}`, [fact("c1", "conclusion", "产品提供从输入到结论的完整能力", "critical"), fact("h1", "hierarchy", "数据接入与权限控制"), fact("h2", "hierarchy", "智能分析与异常识别"), fact("h3", "hierarchy", "报告生成与团队复用"), fact("e1", "evidence", "已覆盖五类高频工作场景"), fact("a1", "action", "下一步扩展团队协作能力")]);
for (let i = 1; i <= 5; i += 1) add(`flow-${i}`, "process-collaboration", `跨团队审批协作流程 ${i}`, [fact("p1", "process", "业务提交申请", "high", { order: 1, lane: "业务" }), fact("p2", "process", "系统校验材料", "high", { order: 2, lane: "系统" }), fact("p3", "process", "负责人审批判断", "critical", { order: 3, lane: "审批人" }), fact("p4", "process", "结果回传并归档", "high", { order: 4, lane: "系统" }), fact("r1", "risk", "异常材料进入人工复核")]);

add("mixed-1", "review-update", "年度经营复盘与组织规划", [fact("c1", "conclusion", "年度目标基本达成", "critical"), fact("m1", "metric", "完成率 91%", "high", { value: "91%" }), fact("r1", "risk", "组织协同效率偏低"), fact("a1", "action", "明年优化协作机制")], "mixed");
add("mixed-2", "strategy-proposal", "新市场进入方案与试点计划", [fact("c1", "conclusion", "先试点再扩张", "critical"), fact("e1", "evidence", "目标市场需求明确"), fact("x1", "constraint", "首期预算有限"), fact("a1", "action", "选择两个城市试点")], "mixed");
add("mixed-3", "research-decision", "平台选型研究与迁移路线", [fact("c1", "conclusion", "选择开放架构方案", "critical"), fact("o1", "comparison", "A 方案扩展性更强"), fact("o2", "comparison", "B 方案迁移成本更低"), fact("e1", "evidence", "压测结果支持 A 方案"), fact("r1", "risk", "迁移窗口有限")], "mixed");
add("mixed-4", "product-capability", "平台能力全景与上线阶段", [fact("c1", "conclusion", "平台形成三层能力", "critical"), fact("h1", "hierarchy", "基础数据层"), fact("h2", "hierarchy", "智能分析层"), fact("h3", "hierarchy", "业务应用层"), fact("p1", "process", "先试点后推广", "medium", { order: 1 })], "mixed");
add("mixed-5", "process-collaboration", "客户问题闭环流程与阶段复盘", [fact("p1", "process", "客服受理", "high", { order: 1, lane: "客服" }), fact("p2", "process", "产品定位", "critical", { order: 2, lane: "产品" }), fact("p3", "process", "研发修复", "high", { order: 3, lane: "研发" }), fact("p4", "process", "客服回访", "high", { order: 4, lane: "客服" }), fact("r1", "risk", "超时问题升级")], "mixed");

if (cases.length !== 42) throw new Error(`expected 42 cases, received ${cases.length}`);
const output = path.join(root, "examples/evals/v44/cases.json"); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify({ version: "4.4-beta", cases }, null, 2)}\n`);
console.log(`ok: wrote ${cases.length} V4.4 evaluation cases`);
