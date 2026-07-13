import fs from "node:fs";
import path from "node:path";

export function buildBenchmarkInventory(testCase) {
  return {
    inventoryId: testCase.id,
    title: testCase.title,
    sourceType: String(testCase.sourceType || "").startsWith("mixed") ? "mixed" : "report",
    facts: testCase.facts.map((fact) => ({ ...fact })),
  };
}

export function buildBenchmarkCases(catalog, outputRoot) {
  const outputs = [];
  for (const testCase of catalog.cases) {
    const caseDir = path.join(outputRoot, "cases", testCase.id);
    fs.mkdirSync(caseDir, { recursive: true });
    const inventory = buildBenchmarkInventory(testCase);
    fs.writeFileSync(path.join(caseDir, "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
    fs.writeFileSync(path.join(caseDir, "expected.json"), `${JSON.stringify({
      caseId: testCase.id,
      source: testCase.source,
      stress: Boolean(testCase.stress),
      expected: testCase.expected,
    }, null, 2)}\n`);
    outputs.push({ caseId: testCase.id, caseDir, inventory, expected: testCase.expected });
  }
  return outputs;
}
