import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(root, "config/scene-topologies-v5.json"), "utf8"));

const SCENE_ORDER = ["layered-architecture", "swimlane-process", "flywheel-loop"];
const importanceWeight = { critical: 4, high: 3, medium: 2, low: 1 };

function byId(model) {
  return new Map(model.facts.map((fact) => [fact.id, fact]));
}

function relationCount(model, types) {
  const allowed = new Set(types);
  return model.relationships.filter((edge) => allowed.has(edge.type)).length;
}

function cleanTitle(value, max = 40) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const split = [...text.matchAll(/[，。；：:]/g)].map((entry) => entry.index).find((index) => index >= 8 && index <= max);
  return `${text.slice(0, split || max - 1).replace(/[，。；：:]$/, "")}…`;
}

function nodeFromFact(fact, extra = {}) {
  const full = String(fact.text || "").trim();
  const match = full.match(/^(.{2,28}?)[：:，,。]\s*(.{2,})$/);
  return {
    id: fact.id,
    title: cleanTitle(match?.[1] || full, 32),
    ...(match?.[2] ? { note: cleanTitle(match[2], 72) } : {}),
    kind: extra.kind || (fact.type === "result" || fact.type === "output" ? "result" : fact.type === "stage" ? "stage" : "action"),
    status: fact.type === "risk" ? "risk" : /完成|达成|上线|成功/.test(full) ? "good" : "neutral",
    sourceFactIds: [fact.id],
    ...extra,
  };
}

function explicitGroups(model) {
  const groups = new Map();
  for (const fact of model.facts) {
    const key = fact.layer || fact.group || fact.category;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fact);
  }
  return groups;
}

function architectureCandidate(model, sceneConfig) {
  const facts = byId(model);
  const belongs = model.relationships.filter((edge) => edge.type === "belongs-to");
  const grouped = explicitGroups(model);
  const parentGroups = new Map();
  for (const edge of belongs) {
    if (!facts.has(edge.from) || !facts.has(edge.to)) continue;
    if (!parentGroups.has(edge.to)) parentGroups.set(edge.to, []);
    parentGroups.get(edge.to).push(facts.get(edge.from));
  }
  const groups = grouped.size >= 2 ? grouped : parentGroups;
  const capabilityCount = model.facts.filter((fact) => ["capability", "constraint", "input", "output"].includes(fact.type)).length;
  const scenarioBonus = ["product-capability", "strategy-proposal"].includes(model.scenario.primary) ? 26 : 0;
  const qualified = belongs.length >= 2 && groups.size >= 2 && capabilityCount >= sceneConfig.minNodes;
  const score = qualified ? Math.min(100, scenarioBonus + Math.min(30, belongs.length * 7) + Math.min(24, capabilityCount * 3) + 20) : 0;
  const reasons = [];
  if (scenarioBonus) reasons.push("场景适合分层结构");
  if (belongs.length) reasons.push(`${belongs.length} 条归属关系`);
  if (groups.size >= 2) reasons.push(`${groups.size} 个可见层级`);
  if (!qualified) reasons.push("未满足分层架构硬资格：至少 2 个层级、4 个能力节点和显式归属关系");
  return { scene: "layered-architecture", score, reasons, groups, qualified };
}

function actorAssignments(model) {
  const facts = byId(model);
  const actorFacts = new Map(model.facts.filter((fact) => fact.type === "actor").map((fact) => [fact.id, fact]));
  const assignments = new Map();
  for (const fact of model.facts) if (fact.actor) assignments.set(fact.id, String(fact.actor));
  for (const edge of model.relationships.filter((item) => item.type === "owned-by")) {
    const actor = actorFacts.get(edge.to) || facts.get(edge.to);
    if (actor) assignments.set(edge.from, actor.text);
  }
  return assignments;
}

function swimlaneCandidate(model, sceneConfig) {
  const assignments = actorAssignments(model);
  const orderedEdges = model.relationships.filter((edge) => edge.type === "precedes");
  const actors = [...new Set(assignments.values())];
  const ownedSteps = [...assignments.keys()].length;
  const scenarioBonus = ["process-collaboration", "project-plan"].includes(model.scenario.primary) ? 26 : 0;
  let handoffs = 0;
  for (const edge of orderedEdges) {
    const fromActor = assignments.get(edge.from);
    const toActor = assignments.get(edge.to);
    if (fromActor && toActor && fromActor !== toActor) handoffs += 1;
  }
  const orderedNodes = [...new Set(orderedEdges.flatMap((edge) => [edge.from, edge.to]))];
  const undirected = new Map();
  for (const edge of orderedEdges) {
    if (!undirected.has(edge.from)) undirected.set(edge.from, new Set());
    if (!undirected.has(edge.to)) undirected.set(edge.to, new Set());
    undirected.get(edge.from).add(edge.to);
    undirected.get(edge.to).add(edge.from);
  }
  const reached = new Set();
  if (orderedNodes[0]) {
    const queue = [orderedNodes[0]];
    while (queue.length) {
      const id = queue.shift();
      if (reached.has(id)) continue;
      reached.add(id);
      queue.push(...(undirected.get(id) || []));
    }
  }
  const connected = orderedNodes.length > 0 && reached.size === orderedNodes.length;
  const qualified = orderedEdges.length >= 3 && ownedSteps >= sceneConfig.minNodes && actors.length >= 2 && handoffs >= 1 && connected && orderedNodes.length <= sceneConfig.maxNodes;
  const score = qualified ? Math.min(100, scenarioBonus + Math.min(28, orderedEdges.length * 5) + Math.min(20, ownedSteps * 3) + 14 + Math.min(12, handoffs * 4)) : 0;
  const reasons = [];
  if (scenarioBonus) reasons.push("场景适合责任流转");
  if (orderedEdges.length) reasons.push(`${orderedEdges.length} 条顺序关系`);
  if (actors.length >= 2) reasons.push(`${actors.length} 个责任角色、${handoffs} 次交接`);
  if (!qualified) reasons.push("未满足泳道硬资格：单一连通流程、4-10 步、至少 2 个角色和 1 次交接");
  return { scene: "swimlane-process", score, reasons, assignments, actors, qualified };
}

function findCycles(model) {
  const allowed = new Set(["precedes", "produces", "supports"]);
  const edges = model.relationships.filter((edge) => allowed.has(edge.type));
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  }
  const cycles = [];
  const visit = (start, current, path, seen) => {
    if (path.length > 6) return;
    for (const next of adjacency.get(current) || []) {
      if (next === start && path.length >= 4) cycles.push([...path]);
      else if (!seen.has(next)) visit(start, next, [...path, next], new Set([...seen, next]));
    }
  };
  for (const start of adjacency.keys()) visit(start, start, [start], new Set([start]));
  return cycles.sort((a, b) => a.length - b.length);
}

function flywheelCandidate(model, sceneConfig) {
  const cycles = findCycles(model);
  const relationTypes = new Map();
  for (const edge of model.relationships) {
    const key = `${edge.from}->${edge.to}`;
    if (!relationTypes.has(key)) relationTypes.set(key, new Set());
    relationTypes.get(key).add(edge.type);
  }
  const cycle = cycles.find((item) => {
    if (item.length < sceneConfig.minNodes || item.length > sceneConfig.maxNodes) return false;
    const types = new Set();
    item.forEach((from, index) => {
      const to = item[(index + 1) % item.length];
      for (const type of relationTypes.get(`${from}->${to}`) || []) types.add(type);
    });
    return types.has("precedes") && types.has("produces");
  });
  const scenarioBonus = ["review-update", "strategy-proposal", "product-capability"].includes(model.scenario.primary) ? 12 : 0;
  const closureEdges = relationCount(model, ["produces", "supports"]);
  const qualified = Boolean(cycle);
  const score = qualified ? Math.min(100, 55 + scenarioBonus + cycle.length * 4 + Math.min(12, closureEdges * 3)) : 0;
  const reasons = cycle ? [`检测到 ${cycle.length} 阶段闭环`, `${closureEdges} 条产出或支撑关系`] : ["未检测到显式闭环"];
  if (!qualified) reasons.push("未满足飞轮硬资格：4-6 阶段且闭环中同时存在顺序与产出关系");
  return { scene: "flywheel-loop", score, reasons, cycle, qualified };
}

function confidence(candidates, config) {
  const top = candidates[0];
  const margin = Math.max(0, top.score - (candidates[1]?.score || 0));
  const level = top.score >= config.confidence.highScore && margin >= config.confidence.minimumMargin
    ? "high"
    : top.score >= config.confidence.mediumScore && margin >= config.confidence.minimumMargin
      ? "medium"
      : "low";
  return { level, score: top.score, margin, reasons: top.reasons };
}

function layerPlan(model, candidate, meta) {
  const facts = byId(model);
  const groups = [...candidate.groups.entries()].slice(0, 4);
  const nodes = [];
  const layers = groups.map(([groupId, members], index) => {
    const groupFact = facts.get(groupId);
    const selected = members.sort((a, b) => (importanceWeight[b.importance] || 0) - (importanceWeight[a.importance] || 0)).slice(0, 6);
    nodes.push(...selected.map((fact) => nodeFromFact(fact, { layerId: `layer-${index + 1}`, kind: "entity" })));
    return {
      id: `layer-${index + 1}`,
      title: cleanTitle(groupFact?.text || groupId, 22),
      nodeIds: selected.map((fact) => fact.id),
      ...(groupFact ? { sourceFactIds: [groupFact.id] } : {}),
    };
  });
  const visible = new Set(nodes.map((node) => node.id));
  const edges = model.relationships.filter((edge) => visible.has(edge.from) && visible.has(edge.to) && ["supports", "depends-on", "produces"].includes(edge.type));
  return { ...meta, layers, nodes, edges };
}

function orderedStepIds(model) {
  const outgoing = new Map();
  const incoming = new Map();
  const edges = model.relationships.filter((edge) => edge.type === "precedes");
  for (const edge of edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from).push(edge.to);
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
  }
  const nodes = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))];
  const queue = nodes.filter((id) => !incoming.get(id));
  const output = [];
  while (queue.length) {
    const id = queue.shift();
    output.push(id);
    for (const next of outgoing.get(id) || []) {
      incoming.set(next, incoming.get(next) - 1);
      if (incoming.get(next) === 0) queue.push(next);
    }
  }
  return output.length === nodes.length ? output : nodes;
}

function swimlanePlan(model, candidate, meta) {
  const facts = byId(model);
  const actorTitles = candidate.actors.slice(0, 4);
  const lanes = actorTitles.map((title, index) => {
    const actorFact = model.facts.find((fact) => fact.type === "actor" && fact.text === title);
    return {
      id: `lane-${index + 1}`,
      title: cleanTitle(title, 18),
      ...(actorFact ? { sourceFactIds: [actorFact.id] } : {}),
    };
  });
  const laneByTitle = new Map(lanes.map((lane) => [lane.title, lane.id]));
  const ordered = orderedStepIds(model).filter((id) => candidate.assignments.has(id)).slice(0, 10);
  const nodes = ordered.map((id, index) => {
    const actor = cleanTitle(candidate.assignments.get(id), 18);
    return nodeFromFact(facts.get(id), { laneId: laneByTitle.get(actor), order: index + 1, kind: facts.get(id).type === "constraint" ? "decision" : undefined });
  });
  const visible = new Set(nodes.map((node) => node.id));
  const edges = model.relationships.filter((edge) => edge.type === "precedes" && visible.has(edge.from) && visible.has(edge.to));
  return { ...meta, lanes, nodes, edges };
}

function flywheelPlan(model, candidate, meta) {
  const facts = byId(model);
  const nodes = candidate.cycle.map((id, index) => nodeFromFact(facts.get(id), { order: index + 1, kind: "stage" }));
  const visible = new Set(nodes.map((node) => node.id));
  const edges = model.relationships.filter((edge) => visible.has(edge.from) && visible.has(edge.to) && ["precedes", "produces", "supports"].includes(edge.type));
  const objective = model.facts.find((fact) => fact.type === "objective");
  const centerTitle = objective && objective.text.length <= 12
    ? objective.text
    : "持续改进闭环";
  return { ...meta, centerTitle, nodes, edges };
}

export function planSceneV5(model, { style = "linear-system", title, config = defaultConfig } = {}) {
  const candidates = [
    architectureCandidate(model, config.scenes["layered-architecture"]),
    swimlaneCandidate(model, config.scenes["swimlane-process"]),
    flywheelCandidate(model, config.scenes["flywheel-loop"]),
  ]
    .sort((a, b) => b.score - a.score || SCENE_ORDER.indexOf(a.scene) - SCENE_ORDER.indexOf(b.scene));
  const sceneConfidence = confidence(candidates, config);
  if (sceneConfidence.level === "low") return { selected: null, candidates: candidates.map(({ scene, score, reasons }) => ({ scene, score, reasons })), confidence: sceneConfidence };
  const selected = candidates[0];
  const summaryFact = model.facts.find((fact) => fact.type === "conclusion") || model.facts.find((fact) => fact.importance === "critical") || model.facts[0];
  const meta = {
    schemaVersion: "5.0-alpha.1",
    engine: "v5",
    scene: selected.scene,
    style,
    title: cleanTitle(title || model.modelId.replace(/[-_]/g, " "), 72),
    subtitle: `${model.scenario.primary} · ${selected.scene}`,
    summary: cleanTitle(summaryFact.text, 150),
    summarySourceFactIds: [summaryFact.id],
    confidence: sceneConfidence,
    sourceFactIds: [],
  };
  const plan = selected.scene === "layered-architecture"
    ? layerPlan(model, selected, meta)
    : selected.scene === "swimlane-process"
      ? swimlanePlan(model, selected, meta)
      : flywheelPlan(model, selected, meta);
  plan.sourceFactIds = [...new Set([
    ...plan.summarySourceFactIds,
    ...plan.nodes.flatMap((node) => node.sourceFactIds),
    ...(plan.layers || []).flatMap((layer) => layer.sourceFactIds || []),
    ...(plan.lanes || []).flatMap((lane) => lane.sourceFactIds || []),
  ])];
  const covered = new Set(plan.sourceFactIds);
  const missingImportant = model.facts
    .filter((fact) => ["critical", "high", "medium"].includes(fact.importance) && !covered.has(fact.id))
    .map((fact) => fact.id);
  const coverage = {
    visibleFactIds: plan.sourceFactIds,
    missingImportantFactIds: missingImportant,
    passed: missingImportant.length === 0,
  };
  if (!coverage.passed) {
    return {
      selected: null,
      rejectedPlan: plan,
      candidates: candidates.map(({ scene, score, reasons }) => ({ scene, score, reasons })),
      confidence: { ...sceneConfidence, level: "low", reasons: [...sceneConfidence.reasons, `场景无法承载重要事实：${missingImportant.join(", ")}`] },
      coverage,
    };
  }
  return { selected: plan, candidates: candidates.map(({ scene, score, reasons }) => ({ scene, score, reasons })), confidence: sceneConfidence, coverage };
}
