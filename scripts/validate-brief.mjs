import fs from "node:fs";

const supportedLayouts = new Set(["conclusion-first", "problem-breakdown"]);
const supportedStyles = new Set(["professional-blue", "dark-emphasis", "warm-editorial"]);

const limits = {
  title: 32,
  subtitle: 48,
  summary: 90,
  summaryLabel: 8,
  moduleTitle: 14,
  moduleLine: 24,
  tag: 8,
  metric: 18,
  footer: 80,
};

const forbiddenStandaloneMetricPattern = /^\s*(TBD|--)\s*$/i;

function fail(message) {
  console.error(`invalid brief: ${message}`);
  process.exit(1);
}

function assertString(value, field, max, required = false) {
  if (value === undefined || value === null) {
    if (required) fail(`${field} is required`);
    return;
  }
  if (typeof value !== "string") fail(`${field} must be a string`);
  if (required && value.trim().length === 0) fail(`${field} cannot be empty`);
  if (value.length > max) fail(`${field} exceeds ${max} characters`);
  if (/[\u0000-\u001F\u007F]/.test(value)) fail(`${field} contains control characters`);
  if (/https?:\/\//i.test(value)) fail(`${field} contains a URL; summarize it instead`);
  if (forbiddenStandaloneMetricPattern.test(value)) fail(`${field} contains a standalone placeholder; add business meaning or remove it`);
}

const input = process.argv[2];
if (!input) fail("usage: node scripts/validate-brief.mjs <brief.json>");

let brief;
try {
  brief = JSON.parse(fs.readFileSync(input, "utf8"));
} catch (error) {
  fail(`cannot read JSON: ${error.message}`);
}

if (!supportedLayouts.has(brief.layout)) fail(`unsupported layout: ${brief.layout}`);
if (!supportedStyles.has(brief.style)) fail(`unsupported style: ${brief.style}`);
assertString(brief.title, "title", limits.title, true);
assertString(brief.subtitle, "subtitle", limits.subtitle);
assertString(brief.summary, "summary", limits.summary, true);
assertString(brief.summaryLabel, "summaryLabel", limits.summaryLabel);
assertString(brief.footer, "footer", limits.footer);

if (!Array.isArray(brief.modules)) fail("modules must be an array");
if (brief.modules.length < 3 || brief.modules.length > 5) fail("modules must contain 3 to 5 items");

brief.modules.forEach((module, index) => {
  assertString(module.title, `modules[${index}].title`, limits.moduleTitle, true);
  assertString(module.tag, `modules[${index}].tag`, limits.tag);
  assertString(module.metric, `modules[${index}].metric`, limits.metric);
  if (!Array.isArray(module.body)) fail(`modules[${index}].body must be an array`);
  if (module.body.length < 1 || module.body.length > 3) fail(`modules[${index}].body must contain 1 to 3 lines`);
  module.body.forEach((line, lineIndex) => {
    assertString(line, `modules[${index}].body[${lineIndex}]`, limits.moduleLine, true);
  });
});

console.log("ok: brief is valid");
