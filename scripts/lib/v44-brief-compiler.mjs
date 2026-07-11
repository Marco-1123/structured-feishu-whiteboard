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

function item(fact) {
  return { label: clip(fact.text, 16), ...(fact.value !== undefined ? { value: clip(fact.value, 12) } : {}), note: clip(fact.text, 24), status: fact.type === "risk" ? "risk" : fact.confidence === "missing" ? "neutral" : "good" };
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
  if (candidate.narrativeType === "result-driven" && model.facts.filter((fact) => fact.type === "metric").length >= 3) return "dashboard-onepage";
  if (["comparison-driven", "causal", "problem-driven"].includes(candidate.narrativeType)) return "narrative-map";
  return "modular-canvas";
}

function expressionBlock(region, facts) {
  const regionFacts = region.factIds.map((id) => facts.get(id)).filter(Boolean);
  const type = region.preferredComponent;
  if (type === "statement") return { type, title: "核心判断", body: [clip(regionFacts.map((fact) => fact.text).join("；"), 30)], sourceFactIds: region.factIds };
  if (type === "metric-card") {
    return regionFacts.map((fact) => ({ type, title: clip(fact?.text || "核心指标", 18), value: clip(fact?.value || fact?.text.match(/[-+]?\d+(?:\.\d+)?%?/)?.[0] || "待观察", 12), label: "阶段结果", note: clip(fact?.text, 24), status: "neutral", sourceFactIds: [fact.id] }));
  }
  const supported = new Set(["risk-list", "action-list", "evidence-list", "narrative-chain", "mini-roadmap", "status-board", "trend-sparkline", "decision-matrix", "variance-bridge-v2", "progress-bar", "ranked-bar"]);
  const safeType = supported.has(type) ? type : "evidence-list";
  const items = regionFacts.slice(0, 5).map((fact) => {
    const result = item(fact);
    if (safeType === "status-board") { result.label = clip(fact.text, 7); result.note = clip(fact.text, 8); }
    return result;
  });
  return { type: safeType, title: purposeTitle(region.purpose), note: clip(regionFacts.map((fact) => fact.text).join("；"), 28), items, sourceFactIds: region.factIds };
}

function ensureExpressionRequirements(blocks, model) {
  const facts = factMap(model);
  const statement = blocks.find((block) => block.type === "statement") || { type: "statement", title: "核心判断", body: [clip(model.facts[0]?.text, 30)], sourceFactIds: [model.facts[0]?.id].filter(Boolean) };
  const out = [statement, ...blocks.filter((block) => block !== statement)];
  const appendList = (type, factType, title) => {
    if (out.some((block) => block.type === type)) return;
    const selected = model.facts.filter((fact) => fact.type === factType).slice(0, 4);
    if (selected.length) {
      const items = selected.map(item);
      out.push({ type, title, items, sourceFactIds: selected.map((fact) => fact.id) });
    }
  };
  appendList("risk-list", "risk", "关键风险");
  appendList("action-list", "action", "下一步行动");
  appendList("evidence-list", "evidence", "关键证据");
  const signalTypes = new Set(["metric-card", "progress-bar", "ranked-bar", "evidence-list", "status-board", "trend-sparkline", "variance-bridge-v2"]);
  if (!out.some((block) => signalTypes.has(block.type))) {
    const signalFacts = model.facts.filter((fact) => ["stage", "capability", "option", "metric"].includes(fact.type)).slice(0, 4);
    if (signalFacts.length) {
      const items = signalFacts.map(item);
      out.push({ type: "evidence-list", title: "结构化信息", items, sourceFactIds: signalFacts.map((fact) => fact.id) });
    }
  }
  if (!out.some((block) => block.type === "narrative-chain")) {
    const chainFacts = model.facts.filter((fact) => ["conclusion", "evidence", "action", "cause"].includes(fact.type)).slice(0, 4);
    if (chainFacts.length >= 2) out.push({ type: "narrative-chain", title: "判断链路", items: chainFacts.map(item), sourceFactIds: chainFacts.map((fact) => fact.id) });
  }
  while (out.length < 4) {
    const unused = model.facts.filter((fact) => !out.flatMap((block) => block.sourceFactIds || []).includes(fact.id)).slice(0, 4);
    if (!unused.length) break;
    out.push({ type: "evidence-list", title: `补充信息 ${out.length}`, items: unused.map(item), sourceFactIds: unused.map((fact) => fact.id) });
  }
  return out.slice(0, 9);
}

export function compileV44Brief({ semanticModel, planningResult, style = "linear-system", title }) {
  const decision = decideConfidence(planningResult);
  const selected = planningResult.candidates?.[0];
  if (!selected || decision.level === "low") return { decision, requiresUserChoice: true, alternatives: planningResult.candidates || [], fallback: { version: "4.3", reason: !selected ? "no-valid-candidate" : "low-confidence" } };
  const facts = factMap(semanticModel);
  if (selected.layout === "flow-canvas") return { decision, requiresUserChoice: false, selectedPlanId: selected.planId, fallback: { version: "4.3", reason: "on-failure" }, brief: compileFlowBrief(semanticModel, selected, style, title) };
  const blocks = ensureExpressionRequirements(selected.regions.flatMap((region) => expressionBlock(region, facts)), semanticModel);
  const mode = expressionMode(selected, semanticModel);
  if (mode === "narrative-map" && !blocks.some((block) => block.type === "action-list")) blocks.push({ type: "action-list", title: "待确认行动", items: [{ label: "下一步待确认", note: "材料未提供", status: "neutral" }], sourceFactIds: [] });
  const selectedFactIds = [...new Set(blocks.flatMap((block) => block.sourceFactIds || []))];
  const omittedFacts = semanticModel.facts.filter((fact) => !selectedFactIds.includes(fact.id)).map((fact) => ({ id: fact.id, reason: fact.importance === "low" ? "low-value-context" : "deferred-to-detail" }));
  const summaryFact = semanticModel.facts.find((fact) => fact.type === "conclusion" || fact.type === "result") || semanticModel.facts[0];
  return { decision, requiresUserChoice: false, selectedPlanId: selected.planId, alternatives: decision.level === "medium" ? planningResult.candidates.slice(1) : [], fallback: { version: "4.3", reason: "on-failure" }, brief: {
    pipelineVersion: "4.4", engine: "v4", renderTarget: "svg", layout: "expression-canvas", style,
    title: clip(title || summaryFact.text, 32), subtitle: clip(`${semanticModel.scenario.primary} · ${selected.narrativeType}`, 48), summaryLabel: "核心判断", summary: clip(summaryFact.text, 90), expressionMode: mode, expressionBlocks: blocks,
    planning: { inventoryId: semanticModel.inventoryId, selectedFactIds, omittedFacts, routeDecisionId: selected.planId },
  } };
}

function compileFlowBrief(model, candidate, style, title) {
  const ordered = [...model.facts].filter((fact) => ["input", "action", "constraint", "output", "stage"].includes(fact.type)).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8);
  const actors = [...new Set(ordered.map((fact) => fact.actor).filter(Boolean))].slice(0, 4);
  const swimlane = actors.length >= 2;
  const laneIds = new Map(actors.map((actor, index) => [actor, `lane-${index + 1}`]));
  const nodes = ordered.map((fact, index) => ({ id: `node-${index + 1}`, title: clip(fact.text, 14), body: [clip(fact.text, 24)], type: index === 0 ? "start" : index === ordered.length - 1 ? "result" : fact.type === "constraint" ? "decision" : "action", ...(swimlane ? { step: index + 1, lane: laneIds.get(fact.actor) || "lane-1" } : {}), status: fact.type === "constraint" ? "risk" : "neutral", sourceFactIds: [fact.id] }));
  const edges = nodes.slice(0, -1).map((node, index) => ({ from: node.id, to: nodes[index + 1].id, label: "进入下一步" }));
  return { pipelineVersion: "4.4", engine: "v4", renderTarget: "svg", layout: "flow-canvas", style, flowMode: swimlane ? "swimlane-flow" : "linear-flow", ...(swimlane ? { lanes: actors.map((actor) => ({ id: laneIds.get(actor), title: clip(actor, 12) })) } : {}), title: clip(title || model.facts[0].text, 32), subtitle: "按输入、动作、判断和输出组织流程", summaryLabel: "流程判断", summary: clip(model.facts[0].text, 90), flowNodes: nodes, flowEdges: edges, planning: { inventoryId: model.inventoryId, selectedFactIds: ordered.map((fact) => fact.id), omittedFacts: model.facts.filter((fact) => !ordered.includes(fact)).map((fact) => ({ id: fact.id, reason: "deferred-to-detail" })), routeDecisionId: candidate.planId } };
}
