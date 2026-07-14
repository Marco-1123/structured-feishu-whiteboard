const sourceTypes = new Set(["text", "report", "document", "webpage", "meeting", "spreadsheet", "mixed"]);
const factTypes = new Set(["conclusion", "constraint", "risk", "metric", "evidence", "action", "process", "comparison", "timeline", "hierarchy", "context"]);
const importanceLevels = new Set(["critical", "high", "medium", "low"]);
const relations = new Set(["cause", "effect", "sequence", "dependency", "parallel", "contrast", "part-of", "supports", "owns"]);
const omissionReasons = new Set(["duplicate", "low-value-context", "deferred-to-detail", "user-excluded", "formatting-noise"]);
const idPattern = /^[A-Za-z][A-Za-z0-9._-]*$/;
const inventoryIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const inventoryKeys = new Set(["inventoryId", "title", "sourceType", "sourceRef", "facts"]);
const factKeys = new Set(["id", "type", "importance", "text", "sourceQuote", "relation", "relatedFactIds", "lane", "order", "value"]);

function unexpectedKeys(value, allowed, prefix) {
  return Object.keys(value || {})
    .filter((key) => !allowed.has(key))
    .map((key) => `${prefix} contains unsupported property: ${key}`);
}

export function validateInventory(inventory) {
  const issues = [];
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) return ["Inventory must be an object"];
  issues.push(...unexpectedKeys(inventory, inventoryKeys, "inventory"));
  if (!inventory.inventoryId || typeof inventory.inventoryId !== "string" || inventory.inventoryId.length > 64 || !inventoryIdPattern.test(inventory.inventoryId)) issues.push("inventoryId must contain 1-64 safe characters");
  if (!inventory.title || typeof inventory.title !== "string" || inventory.title.length > 80) issues.push("title must contain 1-80 characters");
  if (!sourceTypes.has(inventory.sourceType)) issues.push(`Unsupported sourceType: ${inventory.sourceType}`);
  if (!inventory.sourceRef || typeof inventory.sourceRef !== "string" || inventory.sourceRef.length > 240) issues.push("sourceRef must contain 1-240 characters");
  if (!Array.isArray(inventory.facts) || inventory.facts.length === 0) return [...issues, "facts must contain at least one item"];
  if (inventory.facts.length > 120) issues.push("facts must contain at most 120 items");

  const ids = new Set();
  for (const [index, fact] of inventory.facts.entries()) {
    const prefix = `facts[${index}]`;
    if (!fact || typeof fact !== "object" || Array.isArray(fact)) {
      issues.push(`${prefix} must be an object`);
      continue;
    }
    issues.push(...unexpectedKeys(fact, factKeys, prefix));
    if (!fact?.id || !idPattern.test(fact.id)) issues.push(`${prefix}.id is invalid`);
    if (typeof fact?.id === "string" && fact.id.length > 48) issues.push(`${prefix}.id exceeds 48 characters`);
    if (ids.has(fact?.id)) issues.push(`Duplicate fact id: ${fact.id}`);
    ids.add(fact?.id);
    if (!factTypes.has(fact?.type)) issues.push(`${prefix}.type is unsupported`);
    if (!importanceLevels.has(fact?.importance)) issues.push(`${prefix}.importance is unsupported`);
    if (!fact?.text || typeof fact.text !== "string" || fact.text.length > 240) issues.push(`${prefix}.text must contain 1-240 characters`);
    if (fact?.sourceQuote !== undefined && (typeof fact.sourceQuote !== "string" || fact.sourceQuote.length < 4 || fact.sourceQuote.length > 320)) issues.push(`${prefix}.sourceQuote must contain 4-320 characters`);
    if (fact?.relation !== undefined && !relations.has(fact.relation)) issues.push(`${prefix}.relation is unsupported`);
    if (fact?.relatedFactIds !== undefined && !Array.isArray(fact.relatedFactIds)) issues.push(`${prefix}.relatedFactIds must be an array`);
    if (Array.isArray(fact?.relatedFactIds)) {
      if (fact.relatedFactIds.length > 12) issues.push(`${prefix}.relatedFactIds must contain at most 12 items`);
      if (new Set(fact.relatedFactIds).size !== fact.relatedFactIds.length) issues.push(`${prefix}.relatedFactIds must be unique`);
      for (const relatedId of fact.relatedFactIds) if (typeof relatedId !== "string" || relatedId.length > 48) issues.push(`${prefix}.relatedFactIds contains an invalid id`);
    }
    if (fact?.lane !== undefined && (typeof fact.lane !== "string" || fact.lane.length > 24)) issues.push(`${prefix}.lane must contain at most 24 characters`);
    if (fact?.order !== undefined && (typeof fact.order !== "number" || !Number.isFinite(fact.order))) issues.push(`${prefix}.order must be a finite number`);
    if (fact?.value !== undefined && !["string", "number"].includes(typeof fact.value)) issues.push(`${prefix}.value must be a string or number`);
  }

  for (const fact of inventory.facts) {
    for (const relatedId of fact.relatedFactIds || []) {
      if (!ids.has(relatedId)) issues.push(`Fact ${fact.id} references unknown related fact: ${relatedId}`);
    }
  }
  return issues;
}

export function verifyCoverage(inventory, planning) {
  const issues = [...validateInventory(inventory)];
  if (!planning || typeof planning !== "object") {
    return { ok: false, criticalCoverage: 0, highAccounting: 0, selectedIds: [], omittedIds: [], issues: [...issues, "planning is required"] };
  }
  if (planning.inventoryId !== inventory.inventoryId) issues.push(`planning.inventoryId must equal ${inventory.inventoryId}`);
  if (!planning.routeDecisionId) issues.push("planning.routeDecisionId is required");

  const factsById = new Map(inventory.facts.map((fact) => [fact.id, fact]));
  const selected = Array.isArray(planning.selectedFactIds) ? planning.selectedFactIds : [];
  const omissions = Array.isArray(planning.omittedFacts) ? planning.omittedFacts : [];
  const selectedIds = new Set();
  const omittedIds = new Set();

  for (const id of selected) {
    if (selectedIds.has(id)) issues.push(`Duplicate selected fact id: ${id}`);
    selectedIds.add(id);
    if (!factsById.has(id)) issues.push(`Unknown selected fact id: ${id}`);
  }
  for (const omission of omissions) {
    if (!omission?.id || !factsById.has(omission.id)) issues.push(`Unknown omitted fact id: ${omission?.id}`);
    if (omittedIds.has(omission?.id)) issues.push(`Duplicate omitted fact id: ${omission?.id}`);
    omittedIds.add(omission?.id);
    if (!omissionReasons.has(omission?.reason)) issues.push(`Unsupported omission reason for ${omission?.id}: ${omission?.reason}`);
    if (selectedIds.has(omission?.id)) issues.push(`Fact cannot be selected and omitted: ${omission?.id}`);
  }

  const criticalFacts = inventory.facts.filter((fact) => fact.importance === "critical");
  const highFacts = inventory.facts.filter((fact) => fact.importance === "high");
  for (const fact of criticalFacts) {
    if (!selectedIds.has(fact.id)) issues.push(`Critical fact must be selected: ${fact.id}`);
  }
  for (const fact of highFacts) {
    if (!selectedIds.has(fact.id) && !omittedIds.has(fact.id)) issues.push(`High-priority fact is unaccounted: ${fact.id}`);
  }

  const criticalSelected = criticalFacts.filter((fact) => selectedIds.has(fact.id)).length;
  const highAccounted = highFacts.filter((fact) => selectedIds.has(fact.id) || omittedIds.has(fact.id)).length;
  return {
    ok: issues.length === 0,
    criticalCoverage: criticalFacts.length ? criticalSelected / criticalFacts.length : 1,
    highAccounting: highFacts.length ? highAccounted / highFacts.length : 1,
    selectedIds: [...selectedIds],
    omittedIds: [...omittedIds],
    issues,
  };
}

export const contentInventoryEnums = {
  sourceTypes: [...sourceTypes],
  factTypes: [...factTypes],
  importanceLevels: [...importanceLevels],
  relations: [...relations],
  omissionReasons: [...omissionReasons],
};
