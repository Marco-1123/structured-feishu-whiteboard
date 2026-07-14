import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSemanticModel, validateSemanticModel } from "./semantic-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(root, "config/semantic-archetypes.json"), "utf8"));

function typeCount(facts, type) {
  return facts.filter((fact) => fact.type === type).length;
}

function scoreArchetypes(inventory, config) {
  const title = `${inventory.title || ""}`;
  const lanes = new Set(inventory.facts.map((fact) => fact.lane).filter(Boolean));
  return Object.entries(config.archetypes).map(([scenario, rule]) => {
    const titleHits = rule.titleTerms.filter((term) => title.toLowerCase().includes(term.toLowerCase()));
    const typeHits = rule.factTypes.reduce((sum, type) => sum + Math.min(2, typeCount(inventory.facts, type)), 0);
    const laneBonus = scenario === "process-collaboration" && lanes.size >= 2 ? 4 + Math.min(8, typeCount(inventory.facts, "process") * 2) : 0;
    const timeBonus = scenario === "review-update" && /较|同比|环比|完成率|提升|下降|复盘|总结/.test(title) ? 3 : 0;
    const futureBonus = scenario === "project-plan" && /计划|阶段|里程碑|交付|上线/.test(title) ? 2 : 0;
    return { scenario, score: titleHits.length * 3 + typeHits + laneBonus + timeBonus + futureBonus, evidence: { titleTerms: titleHits, factTypeHits: typeHits, laneBonus, timeBonus, futureBonus } };
  }).sort((a, b) => b.score - a.score || a.scenario.localeCompare(b.scenario));
}

function semanticType(fact, scenario, index, total) {
  const direct = { metric: "metric", risk: "risk", evidence: "evidence", action: "action", constraint: "constraint", timeline: "stage", hierarchy: "capability", comparison: "option" };
  if (direct[fact.type]) return direct[fact.type];
  if (fact.type === "conclusion") return scenario === "project-plan" ? "objective" : "conclusion";
  if (fact.type === "process") {
    if (scenario === "process-collaboration") return index === 0 ? "input" : index === total - 1 ? "output" : /判断|审核|确认|决策/.test(fact.text) ? "constraint" : "action";
    return "stage";
  }
  if (fact.type === "context") return scenario === "research-decision" ? "unresolved" : "conclusion";
  return "evidence";
}

function measurableSignal(fact) {
  const text = `${fact.value ?? ""} ${fact.text || ""}`.trim();
  if (!text || ["timeline", "process", "risk", "constraint", "action"].includes(fact.type)) return null;
  const normalized = text.replace(/,/g, "");
  const hasExplicitValue = fact.value !== undefined && fact.value !== null && String(fact.value).trim() !== "";
  const pattern = /(小于|低于|少于|大于|高于|超过|不低于|不高于|[<>≤≥约近超达至+]?)\s*(-?\d+(?:\.\d+)?(?:\s*[-~至]\s*\d+(?:\.\d+)?)?)\s*(%|小时|分钟|秒|人|次|项|类|个|级|万|亿|h|hr|hrs|min|s)?/gi;
  for (const match of normalized.matchAll(pattern)) {
    const unit = match[3] || "";
    const prefix = normalized.slice(Math.max(0, match.index - 8), match.index);
    if (!hasExplicitValue && !unit && !/[<>≤≥+]/.test(match[1] || "")) continue;
    if (!hasExplicitValue && /(?:19|20)\d{2}\s*年?$/.test(`${prefix}${match[0]}`)) continue;
    if (!hasExplicitValue && unit === "级" && /审批|等级|机制/.test(`${prefix}${match[0]}${normalized.slice(match.index + match[0].length, match.index + match[0].length + 6)}`)) continue;
    if (!hasExplicitValue && unit === "人" && /(?:仍需|需要|采用)\s*$/.test(prefix)) continue;
    const qualifier = ({ 小于: "<", 低于: "<", 少于: "<", 大于: ">", 高于: ">", 超过: ">", 不低于: ">=", 不高于: "<=", "≤": "<=", "≥": ">=", "约": "~", "近": "~", "超": ">", "达": ">=", "至": "~" })[match[1]] || match[1] || "";
    return {
      value: match[2].replace(/\s+/g, ""),
      ...(unit ? { unit } : {}),
      ...(qualifier ? { qualifier } : {}),
      display: `${qualifier}${match[2].replace(/\s+/g, "")}${unit}`,
    };
  }
  return null;
}

function relationshipType(relation) {
  return ({ cause: "causes", effect: "produces", sequence: "precedes", dependency: "depends-on", parallel: "belongs-to", contrast: "contrasts", "part-of": "belongs-to", supports: "supports", owns: "owned-by" })[relation] || "supports";
}

function buildRelationships(inventory, facts) {
  const ids = new Set(facts.map((fact) => fact.id));
  const relationships = [];
  for (const source of inventory.facts) {
    for (const target of source.relatedFactIds || []) {
      if (!ids.has(source.id) || !ids.has(target)) continue;
      relationships.push({ id: `rel-${relationships.length + 1}`, type: relationshipType(source.relation), from: source.id, to: target });
    }
  }
  if (!relationships.length && inventory.facts.every((fact) => Number.isFinite(fact.order))) {
    const ordered = [...inventory.facts].sort((a, b) => a.order - b.order);
    for (let index = 0; index < ordered.length - 1; index += 1) relationships.push({ id: `rel-${index + 1}`, type: "precedes", from: ordered[index].id, to: ordered[index + 1].id });
  }
  return relationships;
}

export function compileSemanticModel({ inventory, hints = {}, config = defaultConfig }) {
  const evidence = scoreArchetypes(inventory, config);
  const primary = hints.scenario || evidence[0].scenario;
  const secondary = evidence[1]?.score > 0 && evidence[0].score - evidence[1].score <= 2 ? evidence[1].scenario : undefined;
  const facts = inventory.facts.map((fact, index) => {
    const measure = measurableSignal(fact);
    return {
      id: fact.id,
      type: semanticType(fact, primary, index, inventory.facts.length),
      text: fact.text,
      importance: fact.importance,
      sourceRef: fact.id,
      ...(fact.sourceQuote ? { sourceQuote: fact.sourceQuote } : {}),
      confidence: fact.value === "TBD" ? "draft" : "supported",
      ...(fact.value !== undefined ? { value: fact.value } : {}),
      ...(fact.type === "process" && primary === "product-capability"
        ? { visualType: "process-chain" }
        : measure ? { visualType: "metric", measure } : {}),
      ...(fact.lane ? { actor: fact.lane } : {}),
      ...(fact.order !== undefined ? { order: fact.order } : {}),
    };
  });

  if (primary === "review-update" && !facts.some((fact) => fact.type === "action")) {
    facts.push({ id: "unresolved-next-action", type: "unresolved", text: "材料未提供下一阶段行动", importance: "medium", sourceRef: "missing:next-action", confidence: "missing" });
  }

  const first = facts.filter((fact) => fact.importance === "critical").map((fact) => fact.id);
  if (!first.length) first.push(facts[0].id);
  const second = facts.filter((fact) => !first.includes(fact.id)).map((fact) => fact.id);
  const model = normalizeSemanticModel({
    schemaVersion: "1.0",
    modelId: `semantic-${inventory.inventoryId}`,
    inventoryId: inventory.inventoryId,
    scenario: { primary, ...(secondary && secondary !== primary ? { secondary } : {}) },
    audienceIntent: hints.audienceIntent || "quick-understanding",
    ...(hints.timeScope ? { timeScope: hints.timeScope } : {}),
    facts,
    relationships: buildRelationships(inventory, facts),
    readingLayers: { first, second },
    completenessLedger: { selected: facts.map((fact) => fact.id), merged: [], downgraded: [], omitted: [] },
  });
  model.archetypeEvidence = evidence;
  const issues = validateSemanticModel(model);
  if (issues.length) throw new Error(issues.join("\n"));
  return model;
}

export { scoreArchetypes };
