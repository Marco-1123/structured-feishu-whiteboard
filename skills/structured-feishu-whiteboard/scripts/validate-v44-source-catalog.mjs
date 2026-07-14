import fs from "node:fs";

export const PRIMARY_SCENARIOS = ["review-update", "strategy-proposal", "project-plan", "research-decision", "product-capability", "process-collaboration"];

export function validateSourceCatalog(catalog) {
  const issues = [];
  if (!catalog || typeof catalog !== "object") return ["catalog must be an object"];
  if (!Array.isArray(catalog.cases) || catalog.cases.length !== 24) issues.push("catalog must contain exactly 24 cases");
  const cases = catalog.cases || [];
  const ids = new Set();
  for (const testCase of cases) {
    if (!testCase.id || ids.has(testCase.id)) issues.push(`case id must be unique: ${testCase.id || "missing"}`);
    ids.add(testCase.id);
    if (!testCase.title) issues.push(`${testCase.id}: title is required`);
    if (!/^https:\/\//.test(testCase.source?.url || "")) issues.push(`${testCase.id}: source URL must use https`);
    if (!testCase.source?.publisher || !testCase.source?.title) issues.push(`${testCase.id}: source publisher and title are required`);
    if (!PRIMARY_SCENARIOS.includes(testCase.expected?.scenario)) issues.push(`${testCase.id}: invalid expected scenario`);
    if (!Array.isArray(testCase.expected?.requiredFactIds) || !testCase.expected.requiredFactIds.length) issues.push(`${testCase.id}: requiredFactIds are required`);
    if (!Array.isArray(testCase.expected?.structureSignals) || !testCase.expected.structureSignals.length) issues.push(`${testCase.id}: structureSignals are required`);
    if (!Array.isArray(testCase.facts) || testCase.facts.length < 4) issues.push(`${testCase.id}: at least four bounded facts are required`);
    const factIds = new Set((testCase.facts || []).map((fact) => fact.id));
    for (const factId of testCase.expected?.requiredFactIds || []) if (!factIds.has(factId)) issues.push(`${testCase.id}: required fact ${factId} is missing`);
    for (const fact of testCase.facts || []) {
      if (!fact.id || !fact.type || !fact.text || !fact.importance) issues.push(`${testCase.id}: every fact needs id, type, text, and importance`);
      if (String(fact.text || "").length > 120) issues.push(`${testCase.id}:${fact.id}: bounded fact exceeds 120 characters`);
    }
  }
  const stress = cases.filter((testCase) => testCase.stress === true);
  if (stress.length !== 6) issues.push("catalog must contain exactly six stress cases");
  for (const scenario of PRIMARY_SCENARIOS) {
    const count = cases.filter((testCase) => !testCase.stress && testCase.expected?.scenario === scenario).length;
    if (count !== 3) issues.push(`${scenario}: expected exactly three primary cases, got ${count}`);
  }
  return issues;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node scripts/validate-v44-source-catalog.mjs <catalog.json>"); process.exit(1); }
  const issues = validateSourceCatalog(JSON.parse(fs.readFileSync(file, "utf8")));
  if (issues.length) { console.error(issues.join("\n")); process.exit(1); }
  console.log("ok: V4.4 source catalog is valid");
}
