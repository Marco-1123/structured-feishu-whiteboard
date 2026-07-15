import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const runner = new URL("./run-whiteboard-v5.mjs", import.meta.url).pathname;
const archivedFixture = spawnSync(process.execPath, [runner, "--input", "fixture.json", "--allow-semantic-fixture", "--output-dir", "/tmp/disabled-v5-fixture"], { encoding: "utf8" });

assert.equal(archivedFixture.status, 2);
assert.match(archivedFixture.stderr, /semantic-fixture runner is disabled/);

console.log("ok: archived V5 runner cannot bypass the production pipeline");
