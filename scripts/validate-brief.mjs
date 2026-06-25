import fs from "node:fs";

const supportedLayouts = new Set(["conclusion-first", "problem-breakdown", "large-canvas"]);
const supportedStyles = new Set(["professional-blue", "dark-emphasis", "warm-editorial"]);
const supportedSectionTypes = new Set(["overview", "background", "modules", "roadmap", "metrics-evidence", "risks", "actions"]);

const limits = {
  title: 32,
  subtitle: 48,
  summary: 90,
  summaryLabel: 8,
  moduleTitle: 14,
  moduleLine: 24,
  tag: 8,
  metric: 18,
  metricKey: 16,
  sectionTitle: 18,
  sectionSummary: 70,
  sectionMetric: 20,
  sectionLine: 28,
  footer: 80,
};

const forbiddenStandaloneMetricPattern = /^\s*(TBD|--)\s*$/i;
const standaloneDraftMetricPattern = /^\s*(x{2,}%|xx|待补|待定)\s*$/i;

const metricKeyPatterns = [
  ["coverage", /覆盖率|覆盖|渗透率|覆盖面/],
  ["efficiency", /提效|效率|耗时|时长|人力|自动化/],
  ["risk", /风险|漏出|合规|缺陷|事故/],
  ["cost", /成本|CPO|ROI|费用|降幅/iu],
  ["case", /case|案例|工单|单量|数量/iu],
  ["quality", /质量|准确率|召回率|满意度|通过率/],
];

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

function normalizeMetricKey(module, index) {
  if (!module.metric) return null;
  assertString(module.metricKey, `modules[${index}].metricKey`, limits.metricKey);
  if (module.metricKey) {
    if (!/^[a-z][a-z0-9-]*$/i.test(module.metricKey)) fail(`modules[${index}].metricKey must use letters, numbers, or hyphen`);
    return module.metricKey.toLowerCase();
  }
  if (standaloneDraftMetricPattern.test(module.metric)) fail(`modules[${index}].metric is only a placeholder; add metric name or business meaning`);
  const compact = module.metric.replace(/\s+/g, "");
  const matched = metricKeyPatterns.find(([, pattern]) => pattern.test(compact));
  return matched ? matched[0] : compact.toLowerCase();
}

function assertStringArray(value, field, maxItems, maxLength) {
  if (value === undefined || value === null) return 0;
  if (!Array.isArray(value)) fail(`${field} must be an array`);
  if (value.length > maxItems) fail(`${field} must contain at most ${maxItems} items`);
  value.forEach((item, index) => assertString(item, `${field}[${index}]`, maxLength, true));
  return value.length;
}

function validateModules(brief) {
  if (!Array.isArray(brief.modules)) fail("modules must be an array");
  if (brief.modules.length < 3 || brief.modules.length > 5) fail("modules must contain 3 to 5 items");

  const seenMetrics = new Set();
  brief.modules.forEach((module, index) => {
    assertString(module.title, `modules[${index}].title`, limits.moduleTitle, true);
    assertString(module.tag, `modules[${index}].tag`, limits.tag);
    assertString(module.metric, `modules[${index}].metric`, limits.metric);
    const metricKey = normalizeMetricKey(module, index);
    if (metricKey) {
      if (seenMetrics.has(metricKey)) fail(`modules[${index}].metric duplicates another metric`);
      seenMetrics.add(metricKey);
    }
    if (!Array.isArray(module.body)) fail(`modules[${index}].body must be an array`);
    if (module.body.length < 1 || module.body.length > 3) fail(`modules[${index}].body must contain 1 to 3 lines`);
    module.body.forEach((line, lineIndex) => {
      assertString(line, `modules[${index}].body[${lineIndex}]`, limits.moduleLine, true);
    });
  });
}

function validateLargeCanvas(brief) {
  if (!Array.isArray(brief.sections)) fail("sections must be an array");
  if (brief.sections.length < 3 || brief.sections.length > 7) fail("sections must contain 3 to 7 items");
  const sectionTypes = new Set();
  let hasEvidence = false;
  let hasRisk = false;
  let hasAction = false;
  let hasMetric = false;

  brief.sections.forEach((section, index) => {
    if (!supportedSectionTypes.has(section.type)) fail(`sections[${index}].type is unsupported`);
    sectionTypes.add(section.type);
    assertString(section.title, `sections[${index}].title`, limits.sectionTitle, true);
    assertString(section.summary, `sections[${index}].summary`, limits.sectionSummary);

    if (section.items !== undefined) {
      if (!Array.isArray(section.items)) fail(`sections[${index}].items must be an array`);
      if (section.items.length > 4) fail(`sections[${index}].items must contain at most 4 items`);
      if (section.type === "overview" && section.items.length < 3) fail("overview section must contain at least 3 items");
      section.items.forEach((item, itemIndex) => {
        assertString(item.title, `sections[${index}].items[${itemIndex}].title`, limits.moduleTitle, true);
        if (!Array.isArray(item.body)) fail(`sections[${index}].items[${itemIndex}].body must be an array`);
        if (item.body.length < 1 || item.body.length > 3) fail(`sections[${index}].items[${itemIndex}].body must contain 1 to 3 lines`);
        item.body.forEach((line, lineIndex) => {
          assertString(line, `sections[${index}].items[${itemIndex}].body[${lineIndex}]`, limits.moduleLine, true);
        });
      });
    }

    const metricCount = assertStringArray(section.metrics, `sections[${index}].metrics`, 4, limits.sectionMetric);
    const riskCount = assertStringArray(section.risks, `sections[${index}].risks`, 4, limits.sectionLine);
    const actionCount = assertStringArray(section.actions, `sections[${index}].actions`, 4, limits.sectionLine);
    hasMetric ||= metricCount > 0;
    hasRisk ||= riskCount > 0 || section.type === "risks";
    hasAction ||= actionCount > 0 || section.type === "actions";
    hasEvidence ||= section.type === "metrics-evidence";
  });

  if (!sectionTypes.has("overview")) fail("large-canvas requires an overview section");
  const overview = brief.sections.find((section) => section.type === "overview");
  if (!overview.items || overview.items.length < 3) fail("large-canvas overview section requires 3 to 4 items");
  if (!hasEvidence) fail("large-canvas requires a metrics-evidence section for important evidence");
  if (!hasRisk) fail("large-canvas requires risk coverage");
  if (!hasAction) fail("large-canvas requires action coverage");
  if (!hasMetric) fail("large-canvas requires metric coverage");
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

if (brief.layout === "large-canvas") validateLargeCanvas(brief);
else validateModules(brief);

console.log("ok: brief is valid");
