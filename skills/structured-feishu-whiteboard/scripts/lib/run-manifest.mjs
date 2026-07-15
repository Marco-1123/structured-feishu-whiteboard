import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function currentCommit(root) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function gitDirty(root) {
  const result = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  return result.status === 0 ? Boolean(result.stdout.trim()) : null;
}

export function createRunManifest({ root, version, inventoryPath, routePath, briefPath }) {
  return {
    schemaVersion: 1,
    version,
    gitCommit: currentCommit(root),
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    inputs: {
      inventory: path.resolve(inventoryPath),
      route: path.resolve(routePath),
      brief: path.resolve(briefPath),
    },
    hashes: {
      inventory: hashFile(inventoryPath),
      route: hashFile(routePath),
      brief: hashFile(briefPath),
      output: null,
    },
    route: null,
    capability: null,
    coverage: null,
    checks: [],
    outputs: {},
    error: null,
  };
}

export function writeRunManifest(file, manifest) {
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}
