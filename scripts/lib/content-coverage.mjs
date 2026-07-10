const sourceTypes = new Set(["text", "report", "document", "webpage", "meeting", "spreadsheet", "mixed"]);
const factTypes = new Set(["conclusion", "constraint", "risk", "metric", "evidence", "action", "process", "comparison", "timeline", "hierarchy", "context"]);
const importanceLevels = new Set(["critical", "high", "medium", "low"]);
const relations = new Set(["cause", "effect", "sequence", "dependency", "parallel", "contrast", "part-of", "supports", "owns"]);
const omissionReasons = new Set(["duplicate", "low-value-context", "deferred-to-detail", "user-excluded", "formatting-noise"]);
const idPattern = /^[A-Za-z][A-Za-z0-9._-]*$/;

export function validateInventory(inventory) {
  const issues = [];
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) return ["Inventory must be an object"];
  if (!inventory.inventoryId || typeof inventory.inventoryId !== "string") issues.push("inventoryId is required");
  if (!inventory.title || typeof inventory.title !== "string") issues.push("title is required");
  if (!sourceTypes.has(inventory.sourceType)) issues.push(`Unsupported sourceType: ${inventory.sourceType}`);
  if (!Array.isArray(inventory.facts) || inventory.facts.length === 0) return [...issues, "facts must contain at least one item"];

  const ids = new Set();
  for (const [index, fact] of inventory.facts.entries()) {
    const prefix = `facts[${index}]`;
    if (!fact?.id || !idPattern.test(fact.id)) issues.push(`${prefix}.id is invalid`);
    if (ids.has(fact?.id)) issues.push(`Duplicate fact id: ${fact.id}`);
    ids.add(fact?.id);
    if (!factTypes.has(fact?.type)) issues.push(`${prefix}.type is unsupported`);
    if (!importanceLevels.has(fact?.importance)) issues.push(`${prefix}.importance is unsupported`);
    if (!fact?.text || typeof fact.text !== "string" || fact.text.length > 240) issues.push(`${prefix}.text must contain 1-240 characters`);
    if (fact?.relation !== undefined && !relations.has(fact.relation)) issues.push(`${prefix}.relation is unsupported`);
    if (fact?.relatedFactIds !== undefined && !Array.isArray(fact.relatedFactIds)) issues.push(`${prefix}.relatedFactIds must be an array`);
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
