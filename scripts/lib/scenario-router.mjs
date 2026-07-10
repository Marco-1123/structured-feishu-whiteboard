import crypto from "node:crypto";
import { resolveCapability } from "./capabilities.mjs";
import { validateInventory } from "./content-coverage.mjs";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function has(counts, key) {
  return (counts[key] || 0) > 0;
}

function createSignals(inventory) {
  const typeCounts = countBy(inventory.facts, "type");
  const relationCounts = countBy(inventory.facts, "relation");
  const lanes = new Set(inventory.facts.map((fact) => fact.lane).filter(Boolean));
  const signedMetrics = inventory.facts.filter((fact) => fact.type === "metric" && typeof fact.value === "number" && fact.value !== 0 && Math.abs(fact.value) < 1000).length;
  return {
    factCount: inventory.facts.length,
    typeCounts,
    relationCounts,
    typeDiversity: Object.keys(typeCounts).length,
    laneCount: lanes.size,
    orderedCount: inventory.facts.filter((fact) => Number.isFinite(fact.order)).length,
    signedMetrics,
    mixedSource: inventory.sourceType === "mixed",
  };
}

function reason(label, condition) {
  return condition ? label : null;
}

function rawCandidates(signals) {
  const t = signals.typeCounts;
  const r = signals.relationCounts;
  const processCount = t.process || 0;
  const timelineCount = t.timeline || 0;
  const metricCount = t.metric || 0;
  const comparisonCount = t.comparison || 0;
  const hierarchyCount = t.hierarchy || 0;
  const sequence = (r.sequence || 0) + signals.orderedCount;
  const cause = (r.cause || 0) + (r.effect || 0);

  return [
    {
      layout: "flow-canvas", mode: "swimlane-flow", engine: "v4", renderTarget: "svg", style: "feishu-status",
      score: clamp(processCount * 0.12 + Math.min(0.48, signals.laneCount * 0.16) + (r.dependency ? 0.16 : 0)),
      reasons: [reason(`${processCount} 个流程事实`, processCount > 0), reason(`${signals.laneCount} 个责任角色`, signals.laneCount >= 2), reason("存在跨角色依赖", r.dependency)].filter(Boolean),
    },
    {
      layout: "flow-canvas", mode: "linear-flow", engine: "v4", renderTarget: "svg", style: "linear-system",
      score: clamp(processCount * 0.15 + (sequence ? 0.16 : 0) - (signals.laneCount >= 2 ? 0.18 : 0)),
      reasons: [reason(`${processCount} 个流程事实`, processCount > 0), reason("存在明确顺序", sequence > 0), reason("单主链表达", signals.laneCount < 2)].filter(Boolean),
    },
    {
      layout: "process-chain", engine: "v3", renderTarget: "svg", style: "professional-blue",
      score: clamp(processCount * 0.13 + (sequence ? 0.12 : 0) + (signals.laneCount < 2 ? 0.08 : 0)),
      reasons: [reason("输入包含连续处理节点", processCount >= 3), reason("无需泳道", signals.laneCount < 2)].filter(Boolean),
    },
    {
      layout: "milestone-timeline", engine: "v3", renderTarget: "dsl", style: "professional-blue",
      score: clamp(timelineCount * 0.16 + (sequence ? 0.16 : 0) + (signals.orderedCount >= 3 ? 0.12 : 0)),
      reasons: [reason(`${timelineCount} 个时间节点`, timelineCount > 0), reason("存在明确时间顺序", sequence > 0)].filter(Boolean),
    },
    {
      layout: "roadmap", engine: "v3", renderTarget: "svg", style: "professional-blue",
      score: clamp(timelineCount * 0.12 + processCount * 0.05 + (t.action ? 0.12 : 0) + (sequence ? 0.08 : 0)),
      reasons: [reason("材料按阶段推进", timelineCount >= 2 || processCount >= 3), reason("包含落地行动", has(t, "action"))].filter(Boolean),
    },
    {
      layout: "pyramid", engine: "v3", renderTarget: "dsl", style: "professional-blue",
      score: clamp(hierarchyCount * 0.2 + (r["part-of"] ? 0.18 : 0)),
      reasons: [reason(`${hierarchyCount} 个层级事实`, hierarchyCount > 0), reason("存在上下承接关系", r["part-of"])].filter(Boolean),
    },
    {
      layout: "comparison-matrix", engine: "v3", renderTarget: "svg", style: "linear-command",
      score: clamp(comparisonCount * 0.2 + (r.contrast ? 0.18 : 0) + (has(t, "conclusion") ? 0.08 : 0)),
      reasons: [reason(`${comparisonCount} 个对比事实`, comparisonCount > 0), reason("存在明确对照关系", r.contrast)].filter(Boolean),
    },
    {
      layout: "variance-bridge", engine: "v3", renderTarget: "dsl", style: "professional-blue",
      score: clamp(metricCount * 0.08 + signals.signedMetrics * 0.15 + (r.effect ? 0.16 : 0) + (metricCount >= 4 ? 0.12 : 0)),
      reasons: [reason(`${metricCount} 个数值事实`, metricCount > 0), reason(`${signals.signedMetrics} 个增减项`, signals.signedMetrics >= 2), reason("变化项解释结果差异", r.effect)].filter(Boolean),
    },
    {
      layout: "metric-dashboard", engine: "v3", renderTarget: "dsl", style: "professional-blue",
      score: clamp(metricCount * 0.18 + (has(t, "risk") ? 0.08 : 0) + (has(t, "action") ? 0.06 : 0)),
      reasons: [reason(`${metricCount} 个并列指标`, metricCount >= 2), reason("同时包含风险状态", has(t, "risk"))].filter(Boolean),
    },
    {
      layout: "expression-canvas", mode: "dashboard-onepage", engine: "v4", renderTarget: "svg", style: "stripe-data",
      score: clamp(0.08 + Math.min(0.45, metricCount * 0.15) + (has(t, "risk") ? 0.12 : 0) + (has(t, "action") ? 0.12 : 0) + (has(t, "conclusion") ? 0.1 : 0)),
      reasons: [reason("指标、风险和行动需要联合判断", metricCount >= 2 && has(t, "risk") && has(t, "action")), reason(`${metricCount} 个核心指标`, metricCount > 0)].filter(Boolean),
    },
    {
      layout: "expression-canvas", mode: "narrative-map", engine: "v4", renderTarget: "svg", style: "linear-system",
      score: clamp((has(t, "conclusion") ? 0.18 : 0) + (has(t, "risk") ? 0.16 : 0) + (has(t, "evidence") ? 0.16 : 0) + (has(t, "action") ? 0.14 : 0) + (cause ? 0.16 : 0) + comparisonCount * 0.04),
      reasons: [reason("存在结论、证据和行动论证链", has(t, "conclusion") && has(t, "evidence") && has(t, "action")), reason("存在因果或影响关系", cause > 0)].filter(Boolean),
    },
    {
      layout: "problem-breakdown", engine: "v3", renderTarget: "svg", style: "professional-blue",
      score: clamp((has(t, "risk") ? 0.2 : 0) + (has(t, "constraint") ? 0.12 : 0) + (has(t, "evidence") ? 0.14 : 0) + (has(t, "action") ? 0.14 : 0) + (cause ? 0.16 : 0) + (has(t, "conclusion") ? 0.08 : 0)),
      reasons: [reason("问题、证据和治理动作可形成闭环", has(t, "risk") && has(t, "action")), reason("存在因果关系", cause > 0)].filter(Boolean),
    },
    {
      layout: "expression-canvas", mode: "modular-canvas", engine: "v4", renderTarget: "svg", style: "apple-report",
      score: clamp(signals.typeDiversity * 0.08 + Math.min(0.18, signals.factCount * 0.015) + (has(t, "conclusion") ? 0.08 : 0) + (signals.mixedSource ? 0.08 : 0) + (signals.typeDiversity >= 5 ? 0.12 : 0)),
      reasons: [reason(`${signals.typeDiversity} 类信息关系需要组合表达`, signals.typeDiversity >= 4), reason("混合材料需要模块化画布", signals.mixedSource)].filter(Boolean),
    },
    {
      layout: "large-canvas", engine: "v3", renderTarget: "svg", style: "professional-blue",
      score: clamp(0.24 + Math.min(0.36, signals.typeDiversity * 0.045) + Math.min(0.12, signals.factCount * 0.01)),
      reasons: ["作为复杂材料的稳定 onepage 回退", reason(`${signals.factCount} 个信息点需要完整承载`, signals.factCount >= 7)].filter(Boolean),
    },
    {
      layout: "conclusion-first", engine: "v3", renderTarget: "svg", style: "professional-blue",
      score: clamp((has(t, "conclusion") ? 0.42 : 0.08) + (signals.factCount <= 6 ? 0.18 : 0)),
      reasons: [reason("存在明确主结论", has(t, "conclusion")), reason("材料规模适合简洁总览", signals.factCount <= 6)].filter(Boolean),
    },
  ];
}

export function routeInventory(inventory, registry) {
  const inventoryIssues = validateInventory(inventory);
  if (inventoryIssues.length) throw new Error(`Cannot route invalid inventory: ${inventoryIssues.join("; ")}`);
  const signals = createSignals(inventory);
  const candidates = rawCandidates(signals)
    .filter((candidate) => candidate.score > 0.12)
    .filter((candidate) => resolveCapability(registry, candidate).ok)
    .map((candidate) => ({ ...candidate, reasons: candidate.reasons.length ? candidate.reasons : ["满足该场景的最低结构条件"] }))
    .sort((a, b) => b.score - a.score || a.layout.localeCompare(b.layout))
    .slice(0, 3);

  if (candidates.length < 2) {
    const fallbackCandidates = rawCandidates(signals)
      .filter((candidate) => ["large-canvas", "conclusion-first"].includes(candidate.layout))
      .filter((candidate) => resolveCapability(registry, candidate).ok);
    for (const candidate of fallbackCandidates) {
      if (!candidates.some((existing) => existing.layout === candidate.layout)) candidates.push(candidate);
    }
  }

  const gap = candidates.length > 1 ? candidates[0].score - candidates[1].score : candidates[0]?.score || 0;
  const confidence = candidates[0]?.score >= 0.82 && gap >= 0.12 ? "high" : candidates[0]?.score >= 0.58 && gap >= 0.05 ? "medium" : "low";
  const digest = crypto.createHash("sha256").update(JSON.stringify(inventory)).digest("hex").slice(0, 12);
  return {
    decisionId: `route-${digest}`,
    inventoryId: inventory.inventoryId,
    candidates,
    confidence,
    fallback: { layout: "large-canvas", engine: "v3", renderTarget: "svg", style: "professional-blue" },
    signals,
  };
}
