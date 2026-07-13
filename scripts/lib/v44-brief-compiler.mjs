import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(root, "config/expression-strategies.json"), "utf8"));

export function decideConfidence(planningResult, config = defaultConfig) {
  const candidates = planningResult.candidates || [];
  const topScore = candidates[0]?.scoreBreakdown?.total || 0;
  const margin = planningResult.confidenceEvidence?.scoreMargin ?? Math.max(0, topScore - (candidates[1]?.scoreBreakdown?.total || 0));
  const missing = planningResult.confidenceEvidence?.missingRequiredSignals?.length || 0;
  const inferred = planningResult.confidenceEvidence?.unsupportedInferenceCount || 0;
  let level = "low";
  if (topScore >= config.confidence.highScore && margin >= config.confidence.highMargin && missing === 0 && inferred <= 1) level = "high";
  else if (topScore >= config.confidence.highScore && missing === 0 && inferred <= 1) level = "medium";
  else if (topScore >= config.confidence.mediumScore && margin >= config.confidence.mediumMargin && missing <= 1 && inferred <= 2) level = "medium";
  return { level, topScore, scoreMargin: margin, missingRequiredSignals: missing, unsupportedInferenceCount: inferred, thresholds: config.confidence };
}

function clip(value, max) {
  const text = String(value || "").trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

function factMap(model) {
  return new Map(model.facts.map((fact) => [fact.id, fact]));
}

function splitFactText(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(.{2,24}?)[：:]\s*(.{2,})$/);
  if (match) return { label: `${match[1].trim()}${text.includes("：") ? "：" : ":"}`, note: match[2].trim() };
  if (text.length <= 40) return { label: text };
  const punctuation = [...text.matchAll(/[，；。]/g)].map((entry) => entry.index + 1).find((index) => index >= 18 && index <= 38);
  const splitAt = punctuation || 32;
  return { label: text.slice(0, splitAt), note: text.slice(splitAt) };
}

function item(fact) {
  const parts = splitFactText(fact.text);
  return {
    label: clip(parts.label, 40),
    ...(fact.value !== undefined ? { value: clip(fact.value, 12) } : {}),
    ...(parts.note && parts.note !== parts.label ? { note: clip(parts.note, 72) } : {}),
    status: fact.type === "risk" ? "risk" : fact.confidence === "missing" ? "neutral" : "good",
  };
}

function metricValue(fact) {
  return clip(fact?.value || fact?.measure?.display || fact?.text.match(/[<>≤≥+~-]?\d+(?:\.\d+)?(?:[-~至]\d+(?:\.\d+)?)?\s*(?:%|小时|分钟|秒|人|次|项|类|个|级|万|亿|h|min|s)?/)?.[0] || "待观察", 12);
}

function metricTitle(fact) {
  const value = metricValue(fact);
  const withoutValue = String(fact?.text || "")
    .replace(value, "")
    .replace(/[<>≤≥+~-]?\d+(?:\.\d+)?(?:[-~至]\d+(?:\.\d+)?)?\s*(?:%|小时|分钟|秒|人|次|项|类|个|级|万|亿|h|min|s)?/i, "")
    .replace(/[，,：:]\s*$/, "")
    .trim();
  return clip(withoutValue || "核心指标", 24);
}

function visibleStatement(facts, max = 80) {
  if (!facts.length) return { text: "", facts: [] };
  const selected = [];
  let text = "";
  for (const fact of facts) {
    const candidate = text ? `${text}；${fact.text}` : String(fact.text || "");
    if (candidate.length > max) break;
    selected.push(fact);
    text = candidate;
  }
  if (!selected.length) return { text: clip(facts[0].text, max), facts: [facts[0]] };
  return { text, facts: selected };
}

function purposeTitle(purpose) {
  const types = new Set(purpose.split("-"));
  if (types.has("risk") || types.has("constraint")) return "风险与约束";
  if (types.has("action") || types.has("unresolved")) return "下一步行动";
  if (types.has("evidence")) return "关键证据";
  if (types.has("capability")) return "核心能力";
  if (types.has("stage")) return "阶段路径";
  if (types.has("option")) return "方案比较";
  if (types.has("metric")) return "核心指标";
  return "结构化信息";
}

function expressionMode(candidate, model) {
  const percentageMetrics = model.facts.filter((fact) => fact.type === "metric" && /%/.test(String(fact.value || fact.text)));
  if (candidate.narrativeType === "result-driven" && model.facts.filter((fact) => fact.type === "metric").length >= 3 && percentageMetrics.length >= 2) return "dashboard-onepage";
  if (["comparison-driven", "causal", "problem-driven"].includes(candidate.narrativeType)) return "narrative-map";
  return "modular-canvas";
}

function expressionBlock(region, facts) {
  const regionFacts = region.factIds.map((id) => facts.get(id)).filter(Boolean);
  let type = region.preferredComponent;
  if (["mini-roadmap", "narrative-chain", "trend-sparkline", "decision-matrix", "variance-bridge-v2"].includes(type) && regionFacts.length < 2) {
    type = region.purpose.includes("action") ? "action-list" : "evidence-list";
  }
  if (type === "statement") {
    const statementFacts = regionFacts.filter((fact) => fact.type !== "metric");
    const metricFacts = regionFacts.filter((fact) => fact.type === "metric");
    const primaryFacts = statementFacts.length ? statementFacts : regionFacts.slice(0, 1);
    const visible = visibleStatement(primaryFacts);
    const statement = { type, title: "核心判断", body: [visible.text], sourceFactIds: visible.facts.map((fact) => fact.id) };
    const metricCards = metricFacts.map((fact) => ({
      type: "metric-card",
      title: metricTitle(fact),
      value: metricValue(fact),
      label: "阶段结果",
      ...(metricTitle(fact) !== fact.text ? { note: clip(fact.text, 50) } : {}),
      status: "neutral",
      sourceFactIds: [fact.id],
    }));
    return [statement, ...metricCards];
  }
  if (type === "metric-card") {
    return regionFacts.map((fact) => ({ type, title: metricTitle(fact), value: metricValue(fact), label: "阶段结果", ...(metricTitle(fact) !== fact.text ? { note: clip(fact?.text, 48) } : {}), status: "neutral", sourceFactIds: [fact.id] }));
  }
  const supported = new Set(["risk-list", "action-list", "evidence-list", "narrative-chain", "mini-roadmap", "status-board", "trend-sparkline", "decision-matrix", "variance-bridge-v2", "progress-bar", "ranked-bar"]);
  const safeType = supported.has(type) ? type : "evidence-list";
  const renderedFacts = regionFacts.slice(0, 5);
  const items = renderedFacts.map(item);
  return { type: safeType, title: purposeTitle(region.purpose), items, sourceFactIds: renderedFacts.map((fact) => fact.id) };
}

function ensureExpressionRequirements(blocks, model, narrativeType) {
  const statement = blocks.find((block) => block.type === "statement") || { type: "statement", title: "核心判断", body: [clip(model.facts[0]?.text, 80)], sourceFactIds: [model.facts[0]?.id].filter(Boolean) };
  const seenFacts = new Set();
  const out = [statement, ...blocks.filter((block) => block !== statement)].filter((block) => {
    const ids = block.sourceFactIds || [];
    const unique = ids.some((id) => !seenFacts.has(id));
    ids.forEach((id) => seenFacts.add(id));
    return block === statement || unique;
  });
  const signalTypes = new Set(["metric-card", "progress-bar", "ranked-bar", "evidence-list", "status-board", "trend-sparkline", "variance-bridge-v2"]);
  if (!out.some((block) => signalTypes.has(block.type))) {
    const signalFacts = model.facts.filter((fact) => ["stage", "capability", "option", "metric"].includes(fact.type) && !seenFacts.has(fact.id)).slice(0, 4);
    if (signalFacts.length) {
      const items = signalFacts.map(item);
      out.push({ type: "status-board", title: "结构化信息", items, sourceFactIds: signalFacts.map((fact) => fact.id) });
    }
  }
  if (["causal", "temporal", "hierarchical"].includes(narrativeType) && !out.some((block) => block.type === "narrative-chain" || block.type === "mini-roadmap")) {
    const chainFacts = model.facts.filter((fact) => ["conclusion", "stage", "action", "cause"].includes(fact.type)).slice(0, 4);
    if (chainFacts.length >= 2) out.push({ type: "narrative-chain", title: "判断链路", items: chainFacts.map(item), sourceFactIds: chainFacts.map((fact) => fact.id) });
  }
  return out.slice(0, 8);
}

export function compileV44Brief({ semanticModel, planningResult, style = "linear-system", title }) {
  const decision = decideConfidence(planningResult);
  const selected = planningResult.candidates?.[0];
  if (!selected || decision.level === "low") return { decision, requiresUserChoice: true, alternatives: planningResult.candidates || [], fallback: { version: "4.3", reason: !selected ? "no-valid-candidate" : "low-confidence" } };
  const facts = factMap(semanticModel);
  if (selected.layout === "flow-canvas") return { decision, requiresUserChoice: false, selectedPlanId: selected.planId, fallback: { version: "4.3", reason: "on-failure" }, brief: compileFlowBrief(semanticModel, selected, style, title) };
  const blocks = ensureExpressionRequirements(selected.regions.flatMap((region) => expressionBlock(region, facts)), semanticModel, selected.narrativeType);
  const mode = expressionMode(selected, semanticModel);
  const visibleBlocks = blocks;
  const selectedFactIds = [...new Set(visibleBlocks.flatMap((block) => block.sourceFactIds || []))];
  const omittedFacts = semanticModel.facts.filter((fact) => !selectedFactIds.includes(fact.id)).map((fact) => ({ id: fact.id, reason: fact.importance === "low" ? "low-value-context" : "deferred-to-detail" }));
  const summaryFact = semanticModel.facts.find((fact) => fact.type === "conclusion" || fact.type === "result") || semanticModel.facts[0];
  return { decision, requiresUserChoice: false, selectedPlanId: selected.planId, alternatives: decision.level === "medium" ? planningResult.candidates.slice(1) : [], fallback: { version: "4.3", reason: "on-failure" }, brief: {
    pipelineVersion: "4.4", engine: "v4", renderTarget: "svg", layout: "expression-canvas", style,
    title: clip(title || summaryFact.text, 32), subtitle: scenarioSubtitle(semanticModel.scenario.primary, selected.narrativeType), summaryLabel: "核心判断", summary: clip(summaryFact.text, 90), expressionMode: mode, pageSkeleton: selected.pageSkeleton, expressionBlocks: visibleBlocks,
    planning: { inventoryId: semanticModel.inventoryId, selectedFactIds, omittedFacts, routeDecisionId: selected.planId },
  } };
}

function scenarioSubtitle(scenario, narrativeType) {
  const labels = {
    "review-update": "阶段结果、关键问题与下一阶段行动",
    "strategy-proposal": "从核心判断到证据、约束与验证动作",
    "project-plan": "目标、阶段、依赖与交付路径",
    "research-decision": "证据、方案差异与决策建议",
    "product-capability": "能力层级、应用场景与扩展方向",
    "process-collaboration": "角色、节点、判断与异常分支",
  };
  const narrativeFallback = {
    "result-driven": "结果、问题与行动",
    causal: "判断、原因与验证",
    hierarchical: "层级、能力与路径",
    temporal: "阶段、节奏与交付",
    "comparison-driven": "证据、差异与选择",
    "flow-driven": "节点、流转与异常",
  };
  return labels[scenario] || narrativeFallback[narrativeType] || "结构化信息一览";
}

function compileFlowBrief(model, candidate, style, title) {
  const ordered = [...model.facts].filter((fact) => ["input", "action", "constraint", "output", "stage"].includes(fact.type)).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8);
  const riskFacts = model.facts.filter((fact) => fact.type === "risk").slice(0, Math.max(0, 8 - ordered.length));
  const actors = [...new Set(ordered.map((fact) => fact.actor).filter(Boolean))].slice(0, 4);
  const swimlane = actors.length >= 2;
  const laneIds = new Map(actors.map((actor, index) => [actor, `lane-${index + 1}`]));
  const primaryNodes = ordered.map((fact, index) => ({ id: `node-${index + 1}`, title: clip(fact.text, 28), body: [clip(fact.text, 48)], type: index === 0 ? "start" : index === ordered.length - 1 ? "result" : fact.type === "constraint" ? "decision" : "action", ...(swimlane ? { step: index + 1, lane: laneIds.get(fact.actor) || "lane-1" } : {}), status: fact.type === "constraint" ? "risk" : "neutral", sourceFactIds: [fact.id] }));
  const resultNode = primaryNodes.at(-1);
  const riskNodes = riskFacts.map((fact, index) => ({ id: `risk-${index + 1}`, title: clip(fact.text, 28), body: [clip(fact.text, 48)], type: "risk", ...(swimlane ? { step: Math.min(8, Math.max(2, ordered.length + index)), lane: "lane-1" } : {}), status: "risk", sourceFactIds: [fact.id] }));
  if (swimlane && resultNode && riskNodes.length) resultNode.step = Math.min(8, resultNode.step + riskNodes.length);
  const nodes = resultNode && riskNodes.length ? [...primaryNodes.slice(0, -1), ...riskNodes, resultNode] : primaryNodes;
  const edges = nodes.slice(0, -1).map((node, index) => ({
    from: node.id,
    to: nodes[index + 1].id,
    label: nodes[index + 1].type === "risk" ? "边界与保障" : "进入下一步",
    type: "primary",
  }));
  const summaryFact = model.facts.find((fact) => ["conclusion", "objective", "result"].includes(fact.type)) || model.facts[0];
  const selectedFacts = [...new Set([summaryFact, ...ordered, ...riskFacts].filter(Boolean))];
  return { pipelineVersion: "4.4", engine: "v4", renderTarget: "svg", layout: "flow-canvas", style, flowMode: swimlane ? "swimlane-flow" : "linear-flow", ...(swimlane ? { lanes: actors.map((actor) => ({ id: laneIds.get(actor), title: clip(actor, 12) })) } : {}), title: clip(title || summaryFact.text, 32), subtitle: "按输入、动作、判断和输出组织流程", summaryLabel: "流程判断", summary: clip(summaryFact.text, 90), flowNodes: nodes, flowEdges: edges, planning: { inventoryId: model.inventoryId, selectedFactIds: selectedFacts.map((fact) => fact.id), omittedFacts: model.facts.filter((fact) => !selectedFacts.includes(fact)).map((fact) => ({ id: fact.id, reason: "deferred-to-detail" })), routeDecisionId: candidate.planId } };
}
