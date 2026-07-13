import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertCapability, loadCapabilities } from "./lib/capabilities.mjs";

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
  "progress-wall",
  "ranked-bars",
  "variance-bridge",
  "expression-canvas",
  "flow-canvas",
]);
const supportedRenderTargets = new Set(["svg", "dsl"]);
const supportedEngines = new Set(["v3", "v4"]);
const supportedStyles = new Set([
  "professional-blue",
  "dark-emphasis",
  "warm-editorial",
  "feishu-neutral",
  "feishu-status",
  "feishu-decision-dark",
  "apple-studio",
  "linear-command",
  "apple-report",
  "linear-system",
  "stripe-data",
  "vercel-precision",
  "neo-grid-bold",
  "riptide-cobalt",
]);
const supportedSectionTypes = new Set(["overview", "background", "modules", "roadmap", "metrics-evidence", "risks", "actions"]);
const supportedExpressionModes = new Set(["dashboard-onepage", "narrative-map", "modular-canvas"]);
const supportedFlowModes = new Set(["linear-flow", "swimlane-flow"]);
const supportedFlowNodeTypes = new Set(["start", "action", "decision", "system", "result", "risk"]);
const supportedFlowStatuses = new Set(["good", "neutral", "risk"]);
const supportedFlowEdgeTypes = new Set(["primary", "fallback", "exception"]);
const supportedOmissionReasons = new Set(["duplicate", "low-value-context", "deferred-to-detail", "user-excluded", "formatting-noise"]);
const supportedExpressionBlockTypes = new Set([
  "statement",
  "metric-card",
  "progress-bar",
  "ranked-bar",
  "risk-list",
  "action-list",
  "evidence-list",
  "narrative-chain",
  "mini-roadmap",
  "comparison-summary",
  "status-board",
  "trend-sparkline",
  "decision-matrix",
  "variance-bridge-v2",
]);

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
  metricCardNote: 24,
  progressLabel: 14,
  progressValue: 10,
  progressNote: 24,
  rankedLabel: 14,
  rankedValue: 10,
  rankedNote: 30,
  bridgeLabel: 14,
  bridgeValue: 12,
  bridgeNote: 28,
  expressionTitle: 32,
  expressionLine: 80,
  expressionValue: 12,
  expressionLabel: 12,
  expressionNote: 50,
  expressionItemLabel: 40,
  expressionItemNote: 64,
  flowId: 18,
  flowLaneId: 16,
  flowLaneTitle: 12,
  flowNodeTitle: 28,
  flowNodeLine: 48,
  flowEdgeLabel: 12,
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

function validatePlanning(brief) {
  if (brief.pipelineVersion === undefined && brief.planning === undefined) return;
  if (!["4.3", "4.4"].includes(brief.pipelineVersion)) fail('pipelineVersion must be "4.3" or "4.4"');
  const planning = brief.planning;
  if (!planning || typeof planning !== "object" || Array.isArray(planning)) fail("planning is required for pipelineVersion 4.3 or 4.4");
  assertString(planning.inventoryId, "planning.inventoryId", 64, true);
  assertString(planning.routeDecisionId, "planning.routeDecisionId", 80, true);
  if (!Array.isArray(planning.selectedFactIds) || planning.selectedFactIds.length === 0) fail("planning.selectedFactIds must contain at least one fact id");
  const selected = new Set();
  planning.selectedFactIds.forEach((id, index) => {
    assertString(id, `planning.selectedFactIds[${index}]`, 48, true);
    if (selected.has(id)) fail(`planning.selectedFactIds contains duplicate id: ${id}`);
    selected.add(id);
  });
  if (!Array.isArray(planning.omittedFacts)) fail("planning.omittedFacts must be an array");
  const omitted = new Set();
  planning.omittedFacts.forEach((item, index) => {
    assertString(item?.id, `planning.omittedFacts[${index}].id`, 48, true);
    if (!supportedOmissionReasons.has(item?.reason)) fail(`planning.omittedFacts[${index}].reason is unsupported`);
    if (omitted.has(item.id)) fail(`planning.omittedFacts contains duplicate id: ${item.id}`);
    if (selected.has(item.id)) fail(`fact cannot be selected and omitted: ${item.id}`);
    omitted.add(item.id);
  });
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
    assertString(metric.note, `metricCards[${index}].note`, limits.metricCardNote);
    if (metric.status !== undefined && !["good", "neutral", "risk"].includes(metric.status)) fail(`metricCards[${index}].status is unsupported`);
  });
  validateProgressBars(brief);
  assertString(brief.insight, "insight", limits.insight);
}

function validateProgressBars(brief) {
  if (!Array.isArray(brief.progressBars)) fail("progressBars must be an array");
  if (brief.progressBars.length < 2 || brief.progressBars.length > 4) fail("progressBars must contain 2 to 4 items");
  brief.progressBars.forEach((bar, index) => {
    assertString(bar.label, `progressBars[${index}].label`, limits.progressLabel, true);
    assertString(bar.value, `progressBars[${index}].value`, limits.progressValue, true);
    assertString(bar.note, `progressBars[${index}].note`, limits.progressNote);
  });
}

function validateProgressWall(brief) {
  validateProgressBars(brief);
  assertString(brief.insight, "insight", limits.insight);
}

function validateRankedBars(brief) {
  if (!Array.isArray(brief.rankedBars)) fail("rankedBars must be an array");
  if (brief.rankedBars.length < 3 || brief.rankedBars.length > 6) fail("rankedBars must contain 3 to 6 items");
  brief.rankedBars.forEach((bar, index) => {
    assertString(bar.label, `rankedBars[${index}].label`, limits.rankedLabel, true);
    assertString(bar.value, `rankedBars[${index}].value`, limits.rankedValue, true);
    assertString(bar.note, `rankedBars[${index}].note`, limits.rankedNote);
    if (bar.status !== undefined && !["good", "neutral", "risk"].includes(bar.status)) fail(`rankedBars[${index}].status is unsupported`);
  });
  assertString(brief.insight, "insight", limits.insight);
}

function validateVarianceBridge(brief) {
  if (!Array.isArray(brief.bridgeSteps)) fail("bridgeSteps must be an array");
  if (brief.bridgeSteps.length < 4 || brief.bridgeSteps.length > 6) fail("bridgeSteps must contain 4 to 6 items");
  let startCount = 0;
  let endCount = 0;
  brief.bridgeSteps.forEach((step, index) => {
    assertString(step.label, `bridgeSteps[${index}].label`, limits.bridgeLabel, true);
    assertString(step.value, `bridgeSteps[${index}].value`, limits.bridgeValue, true);
    assertString(step.note, `bridgeSteps[${index}].note`, limits.bridgeNote);
    if (!["start", "increase", "decrease", "end"].includes(step.type)) fail(`bridgeSteps[${index}].type is unsupported`);
    if (step.type === "start") startCount += 1;
    if (step.type === "end") endCount += 1;
  });
  if (startCount !== 1) fail("variance-bridge requires exactly one start step");
  if (endCount !== 1) fail("variance-bridge requires exactly one end step");
  assertString(brief.insight, "insight", limits.insight);
}

function validateExpressionCanvas(brief) {
  if (!supportedExpressionModes.has(brief.expressionMode)) fail("expressionMode is unsupported");
  if (!Array.isArray(brief.expressionBlocks)) fail("expressionBlocks must be an array");
  if (brief.expressionBlocks.length < 2 || brief.expressionBlocks.length > 9) fail("expressionBlocks must contain 2 to 9 blocks");

  const counts = new Map();
  brief.expressionBlocks.forEach((block, index) => {
    if (!supportedExpressionBlockTypes.has(block.type)) fail(`expressionBlocks[${index}].type is unsupported`);
    counts.set(block.type, (counts.get(block.type) || 0) + 1);
    assertString(block.title, `expressionBlocks[${index}].title`, limits.expressionTitle, true);
    assertString(block.value, `expressionBlocks[${index}].value`, limits.expressionValue);
    assertString(block.label, `expressionBlocks[${index}].label`, limits.expressionLabel);
    assertString(block.note, `expressionBlocks[${index}].note`, limits.expressionNote);
    if (block.status !== undefined && !["good", "neutral", "risk"].includes(block.status)) fail(`expressionBlocks[${index}].status is unsupported`);

    assertStringArray(block.body, `expressionBlocks[${index}].body`, block.type === "statement" ? 3 : 4, limits.expressionLine);

    if (block.items !== undefined) {
      if (!Array.isArray(block.items)) fail(`expressionBlocks[${index}].items must be an array`);
      if (block.items.length > 5) fail(`expressionBlocks[${index}].items must contain at most 5 items`);
      block.items.forEach((item, itemIndex) => {
        assertString(item.label, `expressionBlocks[${index}].items[${itemIndex}].label`, limits.expressionItemLabel, true);
        assertString(item.value, `expressionBlocks[${index}].items[${itemIndex}].value`, limits.expressionValue);
        assertString(item.note, `expressionBlocks[${index}].items[${itemIndex}].note`, limits.expressionItemNote);
        if (item.status !== undefined && !["good", "neutral", "risk"].includes(item.status)) fail(`expressionBlocks[${index}].items[${itemIndex}].status is unsupported`);
      });
    }

    if (block.type === "metric-card" && !block.value) fail(`expressionBlocks[${index}].metric-card requires value`);
    if (["progress-bar", "ranked-bar", "risk-list", "action-list", "evidence-list", "narrative-chain", "mini-roadmap", "comparison-summary", "status-board", "trend-sparkline", "decision-matrix", "variance-bridge-v2"].includes(block.type)) {
      const v44SingleItemTypes = new Set(["risk-list", "action-list", "evidence-list", "status-board"]);
      const minimum = brief.pipelineVersion === "4.4" && v44SingleItemTypes.has(block.type) ? 1 : 2;
      if (!block.items || block.items.length < minimum) fail(`expressionBlocks[${index}].${block.type} requires at least ${minimum} item${minimum > 1 ? "s" : ""}`);
    }
  });

  if ((counts.get("statement") || 0) !== 1) fail("expression-canvas requires exactly one statement block");
  if (brief.expressionMode === "dashboard-onepage") {
    const quantitativeBlocks = ["metric-card", "progress-bar", "ranked-bar", "trend-sparkline", "variance-bridge-v2"]
      .reduce((total, type) => total + (counts.get(type) || 0), 0);
    if (quantitativeBlocks < 2) fail("dashboard-onepage requires at least 2 quantitative blocks");
  }
  if (brief.expressionMode === "narrative-map") {
    const hasNarrativeModule = [...counts.entries()].some(([type, count]) => type !== "statement" && count > 0);
    if (!hasNarrativeModule) fail("narrative-map requires at least one narrative content module");
  }
  if (brief.expressionMode === "modular-canvas") {
    const hasContentModule = [...counts.entries()].some(([type, count]) => type !== "statement" && count > 0);
    if (!hasContentModule) fail("modular-canvas requires at least one content module");
  }
}

function assertId(value, field, max, required = false) {
  assertString(value, field, max, required);
  if (value !== undefined && !/^[a-z][a-z0-9-]*$/i.test(value)) fail(`${field} must use letters, numbers, or hyphen`);
}

function validateFlowCanvas(brief) {
  if (!supportedFlowModes.has(brief.flowMode)) fail("flowMode is unsupported");
  if (!Array.isArray(brief.flowNodes)) fail("flowNodes must be an array");
  if (brief.flowNodes.length < 4 || brief.flowNodes.length > 8) fail("flowNodes must contain 4 to 8 items");
  if (!Array.isArray(brief.flowEdges)) fail("flowEdges must be an array");
  if (brief.flowEdges.length < 3 || brief.flowEdges.length > 9) fail("flowEdges must contain 3 to 9 items");

  const laneIds = new Set();
  if (brief.flowMode === "swimlane-flow") {
    if (!Array.isArray(brief.lanes)) fail("swimlane-flow requires lanes");
    if (brief.lanes.length < 2 || brief.lanes.length > 4) fail("lanes must contain 2 to 4 items");
    brief.lanes.forEach((lane, index) => {
      assertId(lane.id, `lanes[${index}].id`, limits.flowLaneId, true);
      if (laneIds.has(lane.id)) fail(`lanes[${index}].id duplicates another lane`);
      laneIds.add(lane.id);
      assertString(lane.title, `lanes[${index}].title`, limits.flowLaneTitle, true);
    });
  }

  const nodeIds = new Set();
  let startCount = 0;
  let resultCount = 0;
  brief.flowNodes.forEach((node, index) => {
    assertId(node.id, `flowNodes[${index}].id`, limits.flowId, true);
    if (nodeIds.has(node.id)) fail(`flowNodes[${index}].id duplicates another node`);
    nodeIds.add(node.id);
    assertString(node.title, `flowNodes[${index}].title`, limits.flowNodeTitle, true);
    if (!Array.isArray(node.body)) fail(`flowNodes[${index}].body must be an array`);
    if (node.body.length < 1 || node.body.length > 2) fail(`flowNodes[${index}].body must contain 1 to 2 lines`);
    node.body.forEach((line, lineIndex) => assertString(line, `flowNodes[${index}].body[${lineIndex}]`, limits.flowNodeLine, true));
    if (!supportedFlowNodeTypes.has(node.type)) fail(`flowNodes[${index}].type is unsupported`);
    if (node.status !== undefined && !supportedFlowStatuses.has(node.status)) fail(`flowNodes[${index}].status is unsupported`);
    if (node.type === "start") startCount += 1;
    if (node.type === "result") resultCount += 1;

    if (brief.flowMode === "swimlane-flow") {
      assertId(node.lane, `flowNodes[${index}].lane`, limits.flowLaneId, true);
      if (!laneIds.has(node.lane)) fail(`flowNodes[${index}].lane does not match lanes`);
      if (!Number.isInteger(node.step) || node.step < 1 || node.step > 8) fail(`flowNodes[${index}].step must be an integer from 1 to 8`);
    } else {
      if (node.lane !== undefined) fail(`flowNodes[${index}].lane is only allowed for swimlane-flow`);
      if (node.step !== undefined) fail(`flowNodes[${index}].step is only allowed for swimlane-flow`);
    }
  });
  if (startCount !== 1) fail("flow-canvas requires exactly one start node");
  if (resultCount < 1) fail("flow-canvas requires at least one result node");

  const incoming = new Map();
  const outgoing = new Map();
  brief.flowEdges.forEach((edge, index) => {
    assertId(edge.from, `flowEdges[${index}].from`, limits.flowId, true);
    assertId(edge.to, `flowEdges[${index}].to`, limits.flowId, true);
    assertString(edge.label, `flowEdges[${index}].label`, limits.flowEdgeLabel);
    if (edge.type !== undefined && !supportedFlowEdgeTypes.has(edge.type)) fail(`flowEdges[${index}].type is unsupported`);
    if (!nodeIds.has(edge.from)) fail(`flowEdges[${index}].from does not match flowNodes`);
    if (!nodeIds.has(edge.to)) fail(`flowEdges[${index}].to does not match flowNodes`);
    if (edge.from === edge.to) fail(`flowEdges[${index}] cannot connect a node to itself`);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
  });

  brief.flowNodes.forEach((node, index) => {
    if (node.type !== "start" && !incoming.has(node.id)) fail(`flowNodes[${index}].id has no incoming edge`);
    if (node.type !== "result" && !outgoing.has(node.id)) fail(`flowNodes[${index}].id has no outgoing edge`);
  });
}

const input = process.argv[2];
if (!input) fail("usage: node scripts/validate-brief.mjs <brief.json>");

let brief;
try {
  brief = JSON.parse(fs.readFileSync(input, "utf8"));
} catch (error) {
  fail(`cannot read JSON: ${error.message}`);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capabilityRegistry = loadCapabilities(root);
try {
  assertCapability(capabilityRegistry, brief);
} catch (error) {
  fail(error.message);
}

if (!supportedLayouts.has(brief.layout)) fail(`unsupported layout: ${brief.layout}`);
if (!supportedStyles.has(brief.style)) fail(`unsupported style: ${brief.style}`);
if (brief.engine !== undefined && !supportedEngines.has(brief.engine)) fail("engine must be v3 or v4");
if (brief.renderTarget !== undefined && !supportedRenderTargets.has(brief.renderTarget)) fail("renderTarget must be svg or dsl");
if (brief.engine === "v4") {
  if (!["expression-canvas", "flow-canvas"].includes(brief.layout)) fail("engine v4 currently supports expression-canvas and flow-canvas only");
  if ((brief.renderTarget || "svg") !== "svg") fail("engine v4 currently supports SVG target only");
}
assertString(brief.title, "title", limits.title, true);
assertString(brief.subtitle, "subtitle", limits.subtitle);
assertString(brief.summary, "summary", limits.summary, true);
assertString(brief.summaryLabel, "summaryLabel", limits.summaryLabel);
assertString(brief.footer, "footer", limits.footer);
validatePlanning(brief);

if (brief.layout === "large-canvas") validateLargeCanvas(brief);
else if (brief.layout === "roadmap") validateStages(brief);
else if (brief.layout === "process-chain") validateNodes(brief);
else if (brief.layout === "comparison-matrix") validateMatrix(brief);
else if (brief.layout === "milestone-timeline") validateTimeline(brief);
else if (brief.layout === "funnel") validateFunnel(brief);
else if (brief.layout === "pyramid") validatePyramid(brief);
else if (brief.layout === "metric-dashboard") validateMetricDashboard(brief);
else if (brief.layout === "progress-wall") validateProgressWall(brief);
else if (brief.layout === "ranked-bars") validateRankedBars(brief);
else if (brief.layout === "variance-bridge") validateVarianceBridge(brief);
else if (brief.layout === "expression-canvas") validateExpressionCanvas(brief);
else if (brief.layout === "flow-canvas") validateFlowCanvas(brief);
else validateModules(brief);

console.log("ok: brief is valid");
