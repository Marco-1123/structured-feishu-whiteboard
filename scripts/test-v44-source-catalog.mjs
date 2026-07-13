import assert from "node:assert/strict";
import fs from "node:fs";
import { validateSourceCatalog } from "./validate-v44-source-catalog.mjs";

const catalog = JSON.parse(fs.readFileSync("examples/evals/v44-internal/source-catalog.json", "utf8"));
assert.deepEqual(validateSourceCatalog(catalog), []);
assert.equal(new Set(catalog.cases.map((testCase) => testCase.source.publisher)).size >= 2, true);
assert.equal(catalog.cases.filter((testCase) => testCase.stress).length, 6);
console.log("ok: V4.4 source catalog tests passed");
