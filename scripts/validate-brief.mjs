import fs from "node:fs";

const supportedLayouts = new Set([
  "conclusion-first",
  "problem-breakdown",
  "large-canvas",
  "roadmap",
  "process-chain",
  "comparison-matrix",
  "milestone-timeline",
  "funnel",
  "pyramid",
  "metric-dashboard",
]);
const supportedRenderTargets = new Set(["svg", "dsl"]);
const supportedStyles = new Set([
  "professional-blue",
  "dark-emphasis",
  "warm-editorial",
  "feishu-neutral",
  "feishu-status",
  "feishu-decision-dark",
  "apple-studio",
  "linear-command",
]);
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
  nodeTitle: 12,
  nodeLine: 22,
  nodeMeta: 14,
  matrixColumn: 10,
  matrixCell: 14,
  timelineDate: 10,
  timelineTitle: 14,
  timelineBody: 32,
  funnelLabel: 14,
  funnelValue: 10,
  funnelNote: 30,
  layerTitle: 14,
  layerBody: 28,
  metricCardLabel: 14,
  metricCardValue: 12,
  metricCardDelta: 18,
  progressLabel: 14,
  progressValue: 10,
  progressNote: 24,
  insight: 90,
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

function validateStages(brief) {
  if (!Array.isArray(brief.stages)) fail("stages must be an array");
  if (brief.stages.length < 3 || brief.stages.length > 5) fail("stages must contain 3 to 5 items");
  brief.stages.forEach((stage, index) => {
    assertString(stage.title, `stages[${index}].title`, limits.moduleTitle, true);
    assertString(stage.tag, `stages[${index}].tag`, limits.tag);
    if (!Array.isArray(stage.body)) fail(`stages[${index}].body must be an array`);
    if (stage.body.length < 1 || stage.body.length > 3) fail(`stages[${index}].body must contain 1 to 3 lines`);
    stage.body.forEach((line, lineIndex) => {
      assertString(line, `stages[${index}].body[${lineIndex}]`, limits.moduleLine, true);
    });
  });
}

function validateNodes(brief) {
  if (!Array.isArray(brief.nodes)) fail("nodes must be an array");
  if (brief.nodes.length < 4 || brief.nodes.length > 7) fail("nodes must contain 4 to 7 items");
  brief.nodes.forEach((node, index) => {
    assertString(node.title, `nodes[${index}].title`, limits.nodeTitle, true);
    assertString(node.input, `nodes[${index}].input`, limits.nodeMeta);
    assertString(node.output, `nodes[${index}].output`, limits.nodeMeta);
    if (!Array.isArray(node.body)) fail(`nodes[${index}].body must be an array`);
    if (node.body.length < 1 || node.body.length > 2) fail(`nodes[${index}].body must contain 1 to 2 lines`);
    node.body.forEach((line, lineIndex) => {
      assertString(line, `nodes[${index}].body[${lineIndex}]`, limits.nodeLine, true);
    });
  });
}

function validateMatrix(brief) {
  if (!brief.matrix || typeof brief.matrix !== "object" || Array.isArray(brief.matrix)) fail("matrix must be an object");
  const { columns, rows } = brief.matrix;
  if (!Array.isArray(columns)) fail("matrix.columns must be an array");
  if (columns.length < 3 || columns.length > 5) fail("matrix.columns must contain 3 to 5 items");
  columns.forEach((column, index) => assertString(column, `matrix.columns[${index}]`, limits.matrixColumn, true));
  if (!Array.isArray(rows)) fail("matrix.rows must be an array");
  if (rows.length < 3 || rows.length > 6) fail("matrix.rows must contain 3 to 6 items");
  let recommendedCount = 0;
  rows.forEach((row, index) => {
    assertString(row.name, `matrix.rows[${index}].name`, limits.moduleTitle, true);
    if (row.recommended !== undefined && typeof row.recommended !== "boolean") fail(`matrix.rows[${index}].recommended must be a boolean`);
    if (row.recommended) recommendedCount += 1;
    if (!Array.isArray(row.cells)) fail(`matrix.rows[${index}].cells must be an array`);
    if (row.cells.length !== columns.length) fail(`matrix.rows[${index}].cells must match matrix.columns length`);
    row.cells.forEach((cell, cellIndex) => {
      assertString(cell, `matrix.rows[${index}].cells[${cellIndex}]`, limits.matrixCell, true);
    });
  });
  if (recommendedCount > 1) fail("matrix can mark at most one row as recommended");
}

function validateTimeline(brief) {
  if (!Array.isArray(brief.timeline)) fail("timeline must be an array");
  if (brief.timeline.length < 3 || brief.timeline.length > 6) fail("timeline must contain 3 to 6 items");
  brief.timeline.forEach((item, index) => {
    assertString(item.date, `timeline[${index}].date`, limits.timelineDate, true);
    assertString(item.title, `timeline[${index}].title`, limits.timelineTitle, true);
    assertString(item.body, `timeline[${index}].body`, limits.timelineBody, true);
  });
}

function validateFunnel(brief) {
  if (!Array.isArray(brief.funnelStages)) fail("funnelStages must be an array");
  if (brief.funnelStages.length < 3 || brief.funnelStages.length > 6) fail("funnelStages must contain 3 to 6 items");
  brief.funnelStages.forEach((stage, index) => {
    assertString(stage.label, `funnelStages[${index}].label`, limits.funnelLabel, true);
    assertString(stage.value, `funnelStages[${index}].value`, limits.funnelValue, true);
    assertString(stage.note, `funnelStages[${index}].note`, limits.funnelNote);
  });
}

function validatePyramid(brief) {
  if (!Array.isArray(brief.layers)) fail("layers must be an array");
  if (brief.layers.length < 3 || brief.layers.length > 6) fail("layers must contain 3 to 6 items");
  brief.layers.forEach((layer, index) => {
    assertString(layer.title, `layers[${index}].title`, limits.layerTitle, true);
    assertString(layer.body, `layers[${index}].body`, limits.layerBody);
  });
}

function validateMetricDashboard(brief) {
  if (!Array.isArray(brief.metricCards)) fail("metricCards must be an array");
  if (brief.metricCards.length < 3 || brief.metricCards.length > 5) fail("metricCards must contain 3 to 5 items");
  brief.metricCards.forEach((metric, index) => {
    assertString(metric.label, `metricCards[${index}].label`, limits.metricCardLabel, true);
    assertString(metric.value, `metricCards[${index}].value`, limits.metricCardValue, true);
    assertString(metric.delta, `metricCards[${index}].delta`, limits.metricCardDelta);
    if (metric.status !== undefined && !["good", "neutral", "risk"].includes(metric.status)) fail(`metricCards[${index}].status is unsupported`);
  });
  if (!Array.isArray(brief.progressBars)) fail("progressBars must be an array");
  if (brief.progressBars.length < 2 || brief.progressBars.length > 4) fail("progressBars must contain 2 to 4 items");
  brief.progressBars.forEach((bar, index) => {
    assertString(bar.label, `progressBars[${index}].label`, limits.progressLabel, true);
    assertString(bar.value, `progressBars[${index}].value`, limits.progressValue, true);
    assertString(bar.note, `progressBars[${index}].note`, limits.progressNote);
  });
  assertString(brief.insight, "insight", limits.insight);
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
if (brief.renderTarget !== undefined && !supportedRenderTargets.has(brief.renderTarget)) fail("renderTarget must be svg or dsl");
assertString(brief.title, "title", limits.title, true);
assertString(brief.subtitle, "subtitle", limits.subtitle);
assertString(brief.summary, "summary", limits.summary, true);
assertString(brief.summaryLabel, "summaryLabel", limits.summaryLabel);
assertString(brief.footer, "footer", limits.footer);

if (brief.layout === "large-canvas") validateLargeCanvas(brief);
else if (brief.layout === "roadmap") validateStages(brief);
else if (brief.layout === "process-chain") validateNodes(brief);
else if (brief.layout === "comparison-matrix") validateMatrix(brief);
else if (brief.layout === "milestone-timeline") validateTimeline(brief);
else if (brief.layout === "funnel") validateFunnel(brief);
else if (brief.layout === "pyramid") validatePyramid(brief);
else if (brief.layout === "metric-dashboard") validateMetricDashboard(brief);
else validateModules(brief);

console.log("ok: brief is valid");
