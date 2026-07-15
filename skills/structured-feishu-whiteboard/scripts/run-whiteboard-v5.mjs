import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

if (option("--input") || args.includes("--allow-semantic-fixture")) {
  console.error("archived V5 semantic-fixture runner is disabled; use dedicated renderer tests instead");
  process.exit(2);
}

const source = option("--source");
const inventory = option("--inventory");
const outputDir = option("--output-dir");
if (!source || !inventory || !outputDir) {
  console.error("deprecated entry; use scripts/run-structured-whiteboard.mjs --source <file> --inventory <file> --output-dir <dir>");
  process.exit(2);
}

const runner = path.join(path.dirname(fileURLToPath(import.meta.url)), "run-structured-whiteboard.mjs");
const forwarded = ["--source", source, "--inventory", inventory, "--output-dir", outputDir];
for (const name of ["--title", "--style"]) {
  const value = option(name);
  if (value) forwarded.push(name, value);
}
if (args.includes("--skip-whiteboard-cli")) forwarded.push("--skip-whiteboard-cli");

console.error("deprecated entry redirected to scripts/run-structured-whiteboard.mjs");
const result = spawnSync(process.execPath, [runner, ...forwarded], { stdio: "inherit" });
process.exit(result.status ?? 1);
