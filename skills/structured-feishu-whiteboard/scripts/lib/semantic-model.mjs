export const semanticModelEnums = {
  scenarios: ["review-update", "strategy-proposal", "project-plan", "research-decision", "product-capability", "process-collaboration"],
  audienceIntents: ["quick-understanding", "decision", "alignment", "selection"],
  factTypes: ["conclusion", "objective", "result", "metric", "trend", "variance", "cause", "risk", "evidence", "action", "stage", "actor", "capability", "option", "constraint", "input", "output", "unresolved"],
  importance: ["critical", "high", "medium", "low"],
  confidence: ["supported", "inferred", "draft", "missing"],
  relationships: ["causes", "supports", "contrasts", "precedes", "depends-on", "belongs-to", "conflicts-with", "mitigates", "produces", "owned-by"],
  ledgerReasons: ["duplicate", "low-value-context", "merged", "deferred-to-detail", "unsupported", "formatting-noise"],
};

const sets = Object.fromEntries(Object.entries(semanticModelEnums).map(([key, values]) => [key, new Set(values)]));
const idPattern = /^[A-Za-z][A-Za-z0-9._-]*$/;

function duplicateIds(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) || !seen.add(value));
}

export function validateSemanticModel(model) {
  const issues = [];
  if (!model || typeof model !== "object" || Array.isArray(model)) return ["Semantic model must be an object"];
  if (model.schemaVersion !== "1.0") issues.push("schemaVersion must be 1.0");
  if (!model.modelId || !idPattern.test(model.modelId)) issues.push("modelId is invalid");
  if (!model.inventoryId || !idPattern.test(model.inventoryId)) issues.push("inventoryId is invalid");
  if (!sets.scenarios.has(model.scenario?.primary)) issues.push(`Unsupported primary scenario: ${model.scenario?.primary}`);
  if (model.scenario?.secondary !== undefined && !sets.scenarios.has(model.scenario.secondary)) issues.push(`Unsupported secondary scenario: ${model.scenario.secondary}`);
  if (!sets.audienceIntents.has(model.audienceIntent)) issues.push(`Unsupported audienceIntent: ${model.audienceIntent}`);
  if (!Array.isArray(model.facts) || model.facts.length === 0) return [...issues, "facts must contain at least one item"];

  const factIds = new Set();
  for (const [index, fact] of model.facts.entries()) {
    const prefix = `facts[${index}]`;
    if (!fact?.id || !idPattern.test(fact.id)) issues.push(`${prefix}.id is invalid`);
    if (factIds.has(fact?.id)) issues.push(`Duplicate fact id: ${fact.id}`);
    factIds.add(fact?.id);
    if (!sets.factTypes.has(fact?.type)) issues.push(`${prefix}.type is unsupported`);
    if (!sets.importance.has(fact?.importance)) issues.push(`${prefix}.importance is unsupported`);
    if (!sets.confidence.has(fact?.confidence)) issues.push(`${prefix}.confidence is unsupported`);
    if (!fact?.sourceRef || typeof fact.sourceRef !== "string") issues.push(`${prefix}.sourceRef is required`);
    if (!fact?.text || typeof fact.text !== "string") issues.push(`${prefix}.text is required`);
  }

  for (const [index, relation] of (model.relationships || []).entries()) {
    if (!relation?.id || !idPattern.test(relation.id)) issues.push(`relationships[${index}].id is invalid`);
    if (!sets.relationships.has(relation?.type)) issues.push(`relationships[${index}].type is unsupported`);
    if (!factIds.has(relation?.from)) issues.push(`Relationship ${relation?.id} references unknown fact: ${relation?.from}`);
    if (!factIds.has(relation?.to)) issues.push(`Relationship ${relation?.id} references unknown fact: ${relation?.to}`);
  }

  const first = model.readingLayers?.first;
  const second = model.readingLayers?.second;
  if (!Array.isArray(first) || !Array.isArray(second)) issues.push("readingLayers.first and readingLayers.second are required arrays");
  const layered = new Set([...(first || []), ...(second || [])]);
  for (const id of layered) if (!factIds.has(id)) issues.push(`Reading layer references unknown fact: ${id}`);
  for (const fact of model.facts.filter((item) => item.importance === "critical")) {
    if (!layered.has(fact.id)) issues.push(`Critical fact ${fact.id} must appear in a reading layer`);
  }

  const ledger = model.completenessLedger;
  const ledgerLists = ["selected", "merged", "downgraded", "omitted"];
  if (!ledger || typeof ledger !== "object") issues.push("completenessLedger is required");
  const accounted = [];
  for (const key of ledgerLists) {
    const values = ledger?.[key];
    if (!Array.isArray(values)) {
      issues.push(`completenessLedger.${key} must be an array`);
      continue;
    }
    for (const value of values) {
      const id = typeof value === "string" ? value : value?.id;
      if (!factIds.has(id)) issues.push(`completenessLedger.${key} references unknown fact: ${id}`);
      if (typeof value === "object" && value?.reason !== undefined && !sets.ledgerReasons.has(value.reason)) issues.push(`Unsupported ledger reason for ${id}: ${value.reason}`);
      accounted.push(id);
    }
  }
  for (const id of duplicateIds(accounted)) issues.push(`Fact ${id} is accounted more than once`);
  const accountedSet = new Set(accounted);
  for (const fact of model.facts.filter((item) => item.importance === "critical" || item.importance === "high")) {
    if (!accountedSet.has(fact.id)) issues.push(`Fact ${fact.id} is unaccounted in completenessLedger`);
  }
  return issues;
}

export function normalizeSemanticModel(model) {
  const normalized = structuredClone(model);
  normalized.relationships ||= [];
  normalized.readingLayers ||= { first: [], second: [] };
  normalized.completenessLedger ||= { selected: [], merged: [], downgraded: [], omitted: [] };
  return normalized;
}
