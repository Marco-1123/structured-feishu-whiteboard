import { inspectV43VisualQuality } from "./v43-visual-quality.mjs";

const important = new Set(["critical", "high", "medium"]);
const dataComponents = new Set(["metric-card", "progress-bar", "ranked-bar", "trend-sparkline", "variance-bridge-v2"]);

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function scoreBottomBalance(bottomMargin, height) {
  if (!Number.isFinite(bottomMargin) || !Number.isFinite(height) || height <= 0) return 0;
  const ratio = bottomMargin / height;
  if (ratio < 0.07) return clamp(100 - (0.07 - ratio) * 1200);
  if (ratio > 0.22) return clamp(100 - (ratio - 0.22) * 700);
  return 100;
}

function componentScore(mix, factCount) {
  const unique = new Set(mix);
  if ([...unique].some((type) => type === "flow" || type.includes("flow") || type.startsWith("scene:"))) return 100;
  if (factCount < 5) return 100;
  if (unique.size >= 4) return 100;
  if (unique.size === 3) return 86;
  if (unique.size === 2) return 62;
  return 30;
}

function decodeText(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function normalized(value) {
  return decodeText(value).toLowerCase().replace(/[^\p{L}\p{N}%+<>=.-]+/gu, "");
}

function bigrams(value) {
  const clean = normalized(value);
  return new Set([...clean].slice(0, -1).map((char, index) => `${char}${[...clean][index + 1]}`));
}

export function visibleSvgText(svg) {
  return parseVisibleSvg(svg).chunks.map((chunk) => chunk.text).join(" ");
}

function parseAttributes(source) {
  return Object.fromEntries([...String(source || "").matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

function parseFactIds(value) {
  return String(value || "").split(",").map((id) => id.trim()).filter(Boolean);
}

function hiddenAttributes(attributes) {
  const style = String(attributes.style || "").replace(/\s+/g, "").toLowerCase();
  return attributes.display === "none"
    || attributes.visibility === "hidden"
    || Number(attributes.opacity) === 0
    || style.includes("display:none")
    || style.includes("visibility:hidden")
    || style.includes("opacity:0");
}

function parseVisibleSvg(svg) {
  const rootSource = svg.match(/<svg\b([^>]*)>/)?.[1] || "";
  const root = parseAttributes(rootSource);
  const viewBox = String(root.viewBox || "").split(/\s+/).map(Number);
  const width = Number(root.width || viewBox[2] || 0);
  const height = Number(root.height || viewBox[3] || 0);
  const stack = [];
  const chunks = [];
  const carriers = [];
  const tokenPattern = /<\/?([\w:-]+)\b([^>]*)>|([^<]+)/g;
  for (const token of svg.matchAll(tokenPattern)) {
    if (token[3] !== undefined) {
      const textNode = [...stack].reverse().find((node) => node.tag === "tspan" || node.tag === "text");
      const value = decodeText(token[3].replace(/\s+/g, " ").trim());
      if (!textNode || !value || textNode.hidden) continue;
      const textParent = [...stack].reverse().find((node) => node.tag === "text");
      const x = Number(textNode.attrs.x ?? textParent?.attrs.x);
      const y = Number(textNode.attrs.y ?? textParent?.attrs.y);
      const positioned = Number.isFinite(x) && Number.isFinite(y);
      if (positioned && width && height && (x < 0 || y < 0 || x > width || y > height)) continue;
      chunks.push({ text: value, x, y, positioned, factIds: [...textNode.factIds] });
      continue;
    }
    const raw = token[0];
    const tag = token[1];
    const closing = raw.startsWith("</");
    if (closing) {
      while (stack.length) {
        const popped = stack.pop();
        if (popped.tag === tag) break;
      }
      continue;
    }
    const attrs = parseAttributes(token[2]);
    const parent = stack.at(-1);
    const ownFacts = parseFactIds(attrs["data-source-fact-ids"]);
    const node = {
      tag,
      attrs,
      hidden: Boolean(parent?.hidden) || hiddenAttributes(attrs),
      factIds: new Set([...(parent?.factIds || []), ...ownFacts]),
    };
    if (ownFacts.length && tag === "rect" && !node.hidden) {
      carriers.push({
        factIds: ownFacts,
        x: Number(attrs.x),
        y: Number(attrs.y),
        w: Number(attrs.width),
        h: Number(attrs.height),
      });
    }
    if (!raw.endsWith("/>")) stack.push(node);
  }
  for (const chunk of chunks) {
    if (chunk.factIds.length || !chunk.positioned) continue;
    const spatial = carriers
      .filter((carrier) => Number.isFinite(carrier.x) && Number.isFinite(carrier.y) && Number.isFinite(carrier.w) && Number.isFinite(carrier.h)
        && chunk.x >= carrier.x && chunk.x <= carrier.x + carrier.w
        && chunk.y >= carrier.y && chunk.y <= carrier.y + carrier.h)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (spatial) chunk.factIds = [...spatial.factIds];
  }
  return { chunks, width, height };
}

function factTextIsVisible(fact, visibleText) {
  const visible = normalized(visibleText);
  const sourceVariants = [...new Set([fact?.text, fact?.sourceQuote].map(normalized).filter(Boolean))];
  return sourceVariants.some((source) => {
    if (visible.includes(source)) return true;
    const sourcePairs = bigrams(source);
    const visiblePairs = bigrams(visible);
    const overlap = [...sourcePairs].filter((pair) => visiblePairs.has(pair)).length;
    const lexicalCoverage = sourcePairs.size ? overlap / sourcePairs.size : 0;
    const sourceNumbers = source.match(/\d+(?:\.\d+)?/g) || [];
    const numbersPreserved = sourceNumbers.every((number) => visible.includes(number));
    if ((fact?.type === "metric" || fact?.visualType === "metric") && sourceNumbers.length && numbersPreserved) return true;
    return lexicalCoverage >= 0.55 && numbersPreserved;
  });
}

export function visibleFactIds(svg, facts = []) {
  const parsed = parseVisibleSvg(svg);
  const claimed = new Set(parsed.chunks.flatMap((chunk) => chunk.factIds));
  if (!facts.length) return claimed;
  const factById = new Map(facts.map((fact) => [fact.id, fact]));
  const textByFact = new Map();
  for (const chunk of parsed.chunks) {
    for (const id of chunk.factIds) textByFact.set(id, `${textByFact.get(id) || ""} ${chunk.text}`.trim());
  }
  return new Set([...claimed].filter((id) => factById.has(id) && factTextIsVisible(factById.get(id), textByFact.get(id) || "")));
}

export function structureSignature(svg) {
  const root = svg.match(/<svg\b([^>]*)>/)?.[1] || "";
  const attr = (source, name) => source.match(new RegExp(`${name}="([^"]*)"`))?.[1] || "";
  const rootShape = [attr(root, "data-layout"), attr(root, "data-scene"), attr(root, "width"), attr(root, "height")];
  const blocks = [...svg.matchAll(/<g\b([^>]*)data-v43-block="([^"]+)"([^>]*)>/g)].map((match) => {
    const source = `${match[1]} data-v43-block="${match[2]}" ${match[3]}`;
    return ["data-block-type", "data-width", "data-height", "data-row", "data-span", "data-item-layout"].map((name) => attr(source, name)).join(":");
  });
  const sceneShapes = [
    ...svg.matchAll(/data-scene-(?:node|layer|lane)="[^"]+"/g),
    ...svg.matchAll(/data-flow-node="[^"]+"/g),
  ].map((match) => match[0].replace(/="[^"]+"/, ""));
  return [...rootShape, ...blocks, ...sceneShapes].join("|");
}

export function evaluateCandidate({ svg, candidate, semanticModel }) {
  if (candidate.kind === "scene") return evaluateSceneCandidate({ svg, candidate, semanticModel });
  const visual = inspectV43VisualQuality(svg);
  const visible = visibleFactIds(svg, semanticModel.facts);
  const requiredFacts = semanticModel.facts.filter((fact) => important.has(fact.importance));
  const missingFacts = requiredFacts.filter((fact) => !visible.has(fact.id));
  const metricFacts = semanticModel.facts.filter((fact) => fact.type === "metric" || fact.visualType === "metric");
  const hasDataExpression = candidate.componentMix.some((type) => dataComponents.has(type));
  const diversity = componentScore(candidate.componentMix, requiredFacts.length);
  const metrics = visual.metrics || {};

  const aspectScore = clamp(100 - Math.abs((metrics.aspectRatio || 0) - 1.72) * 72);
  const densityScore = metrics.occupiedRatio
    ? clamp(100 - Math.abs(metrics.occupiedRatio - 0.48) * 190)
    : 0;
  const contentUseScore = Number.isFinite(metrics.effectiveContentDensity)
    ? clamp(55 + Math.min(45, metrics.effectiveContentDensity * 15))
    : 0;
  const bottomScore = scoreBottomBalance(metrics.bottomMargin, metrics.height);
  const rowScore = clamp(100 - Math.max(0, (metrics.bodyRowCount || 0) - 2) * 18);
  const semanticCoverage = requiredFacts.length
    ? ((requiredFacts.length - missingFacts.length) / requiredFacts.length) * 100
    : 100;
  const dataScore = metricFacts.length >= 2 ? (hasDataExpression ? 100 : 25) : 100;

  const hardIssues = [...visual.issues];
  if (missingFacts.length) hardIssues.push(`Missing important facts: ${missingFacts.map((fact) => fact.id).join(", ")}`);
  if (metricFacts.length >= 2 && !hasDataExpression) hardIssues.push("Quantified material was rendered without a data component");
  if (requiredFacts.length >= 7 && diversity < 60) hardIssues.push("Complex material collapsed into a single repeated component language");

  const total = Math.round(
    semanticCoverage * 0.26
    + candidate.semanticScore * 0.14
    + aspectScore * 0.15
    + densityScore * 0.08
    + contentUseScore * 0.08
    + bottomScore * 0.1
    + rowScore * 0.06
    + diversity * 0.07
    + dataScore * 0.06,
  );

  return {
    accepted: hardIssues.length === 0 && total >= 76,
    total,
    hardIssues,
    scores: {
      semanticCoverage: Math.round(semanticCoverage),
      semanticFit: candidate.semanticScore,
      aspect: Math.round(aspectScore),
      density: Math.round(densityScore),
      contentUtilization: Math.round(contentUseScore),
      bottomBalance: Math.round(bottomScore),
      rowBalance: Math.round(rowScore),
      expressionDiversity: diversity,
      dataExpression: dataScore,
    },
    visual: metrics,
    missingFactIds: missingFacts.map((fact) => fact.id),
  };
}

function svgRootMetrics(svg) {
  const root = svg.match(/<svg\b([^>]*)>/)?.[1] || "";
  const attr = (name) => root.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  const width = Number(attr("width") || String(attr("viewBox") || "").split(/\s+/)[2] || 0);
  const height = Number(attr("height") || String(attr("viewBox") || "").split(/\s+/)[3] || 0);
  const contentBottom = Number(attr("data-content-bottom") || 0);
  return { width, height, aspectRatio: height ? width / height : 0, bottomMargin: contentBottom ? height - contentBottom : 0 };
}

function evaluateSceneCandidate({ svg, candidate, semanticModel }) {
  const metrics = svgRootMetrics(svg);
  const visible = visibleFactIds(svg, semanticModel.facts);
  const requiredFacts = semanticModel.facts.filter((fact) => important.has(fact.importance));
  const missingFacts = requiredFacts.filter((fact) => !visible.has(fact.id));
  const aspectScore = clamp(100 - Math.abs(metrics.aspectRatio - 1.78) * 65);
  const bottomTarget = Math.max(64, metrics.height * 0.075);
  const bottomScore = clamp(100 - Math.abs(metrics.bottomMargin - bottomTarget) * 0.55);
  const semanticCoverage = requiredFacts.length ? ((requiredFacts.length - missingFacts.length) / requiredFacts.length) * 100 : 100;
  const topologyScore = Math.min(100, 68 + (candidate.scenePlan.edges?.length || 0) * 4 + (candidate.scenePlan.layers?.length || candidate.scenePlan.lanes?.length || 0) * 5);
  const sceneNodes = [...svg.matchAll(/<rect\b([^>]*)data-scene-node="[^"]+"([^>]*)\/>/g)].map((match) => {
    const source = `${match[1]} ${match[2]}`;
    const value = (name) => Number(source.match(new RegExp(`${name}="([^"]+)"`))?.[1] || 0);
    return { x: value("x"), y: value("y"), w: value("width"), h: value("height") };
  });
  const overlaps = sceneNodes.some((a, index) => sceneNodes.slice(index + 1).some((b) => a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1));
  const visibleCharacters = normalized(visibleSvgText(svg)).length;
  const effectiveDensity = metrics.width && metrics.height ? visibleCharacters / ((metrics.width * metrics.height) / 10000) : 0;
  metrics.sceneNodeCount = sceneNodes.length;
  metrics.effectiveContentDensity = effectiveDensity;
  const hardIssues = [];
  if (missingFacts.length) hardIssues.push(`Missing important facts: ${missingFacts.map((fact) => fact.id).join(", ")}`);
  if (metrics.aspectRatio < 1.5 || metrics.aspectRatio > 2.2) hardIssues.push(`Scene aspect ratio is outside 1.50-2.20: ${metrics.aspectRatio.toFixed(2)}`);
  if (metrics.bottomMargin < 44 || metrics.bottomMargin > Math.max(240, metrics.height * 0.2)) hardIssues.push(`Scene bottom balance is invalid: ${metrics.bottomMargin}`);
  if (overlaps) hardIssues.push("Scene nodes overlap");
  if (effectiveDensity < 0.45) hardIssues.push(`Scene content density is too low: ${effectiveDensity.toFixed(2)}`);
  const total = Math.round(semanticCoverage * 0.34 + candidate.semanticScore * 0.18 + aspectScore * 0.18 + bottomScore * 0.12 + topologyScore * 0.18);
  return {
    accepted: hardIssues.length === 0 && total >= 78,
    total,
    hardIssues,
    scores: {
      semanticCoverage: Math.round(semanticCoverage),
      semanticFit: candidate.semanticScore,
      aspect: Math.round(aspectScore),
      bottomBalance: Math.round(bottomScore),
      topologyExpression: topologyScore,
    },
    visual: metrics,
    missingFactIds: missingFacts.map((fact) => fact.id),
  };
}
