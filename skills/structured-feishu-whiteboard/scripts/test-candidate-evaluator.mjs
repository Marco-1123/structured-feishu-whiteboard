import assert from "node:assert/strict";
import { scoreBottomBalance, structureSignature, visibleFactIds } from "./lib/candidate-evaluator.mjs";

assert.equal(scoreBottomBalance(120, 1000), 100, "intentional onepage breathing room must not be penalized");
assert.equal(scoreBottomBalance(210, 1000), 100, "a balanced wide composition may retain a larger lower margin");
assert.ok(scoreBottomBalance(30, 1000) < 60, "content that nearly touches the canvas bottom must be penalized");
assert.ok(scoreBottomBalance(300, 1000) < 60, "excessive unused lower canvas must still be penalized");
assert.equal(scoreBottomBalance(Number.NaN, 1000), 0);
const facts = [
  { id: "f1", text: "目标完成率达到 82%" },
  { id: "f2", text: "权限边界仍需验证" },
];
assert.deepEqual([...visibleFactIds('<svg><g data-source-fact-ids="f1,f2"></g></svg>', facts)], [], "fact ids without visible copy must not count as coverage");
assert.deepEqual([...visibleFactIds('<svg><g data-source-fact-ids="f1"><text><tspan>目标完成率达到 82%</tspan></text></g></svg>', facts)], ["f1"]);
assert.deepEqual([...visibleFactIds('<svg width="400" height="200"><g data-source-fact-ids="f1" display="none"><text x="20" y="40"><tspan>目标完成率达到 82%</tspan></text></g></svg>', facts)], [], "hidden copy must not count as coverage");
assert.deepEqual([...visibleFactIds('<svg width="400" height="200"><g data-source-fact-ids="f1"><text x="900" y="40"><tspan>目标完成率达到 82%</tspan></text></g></svg>', facts)], [], "off-canvas copy must not count as coverage");
assert.deepEqual([...visibleFactIds('<svg width="400" height="200"><rect x="10" y="10" width="300" height="100" data-source-fact-ids="f1"/><text x="30" y="60"><tspan>目标完成率达到 82%</tspan></text></svg>', facts)], ["f1"], "visible text inside a marked spatial component must count");
const structureA = '<svg width="1800" height="900" data-layout="expression-canvas"><g data-v43-block="a" data-block-type="status-board" data-width="800" data-height="200" data-row="0" data-span="6" data-item-layout="rows"></g></svg>';
const structureB = structureA.replace('data-v43-block="a"', 'data-v43-block="b"').replace("旧内容", "新内容");
assert.equal(structureSignature(structureA), structureSignature(structureB), "candidate identity must ignore labels and compare actual geometry");

console.log("ok: candidate evaluator tests passed");
