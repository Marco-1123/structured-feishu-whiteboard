import fs from "node:fs";

const styles = {
  "professional-blue": {
    canvas: "#F7FAFC",
    surface: "#FFFFFF",
    muted: "#EEF4FA",
    ink: "#172033",
    secondary: "#5C6B82",
    border: "#D8E2EF",
    accent: "#2563EB",
    soft: "#DBEAFE",
    success: "#0F766E",
  },
  "dark-emphasis": {
    canvas: "#101828",
    surface: "#182236",
    muted: "#22314A",
    ink: "#F8FAFC",
    secondary: "#B7C2D5",
    border: "#33445F",
    accent: "#38BDF8",
    soft: "#22314A",
    success: "#A3E635",
  },
  "warm-editorial": {
    canvas: "#F3EFE7",
    surface: "#FFFDF8",
    muted: "#E8E1D6",
    ink: "#22201C",
    secondary: "#6E675D",
    border: "#D6CABC",
    accent: "#B45309",
    soft: "#F7D9B4",
    success: "#6B7D3A",
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--output") args.output = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.input || !args.output) throw new Error("usage: node scripts/render-whiteboard.mjs --input brief.json --output diagram.svg");
  return args;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitByLength(value, maxChars, maxLines) {
  const clean = String(value ?? "").trim();
  if (!clean) return [];
  const lines = [];
  let rest = clean;
  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= maxChars) {
      lines.push(rest);
      rest = "";
    } else {
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
  }
  return lines;
}

function text(x, y, size, fill, lines, weight = "400", gap = Math.round(size * 1.45)) {
  const body = lines
    .filter((line) => String(line).trim().length > 0)
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : gap}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${body}</text>`;
}

function marker(c) {
  return `<defs>
  <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
    <path d="M0 0 L10 4 L0 8 z" fill="${c.accent}"/>
  </marker>
</defs>`;
}

function wrap(width, height, c, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${marker(c)}
<rect x="0" y="0" width="${width}" height="${height}" fill="${c.canvas}"/>
${body}
</svg>
`;
}

function card(x, y, w, h, c) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>`;
}

function label(x, y, w, c, content, fill = c.accent) {
  if (!content) return "";
  return `<rect x="${x}" y="${y}" width="${w}" height="36" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 18, y + 25, 17, fill, [content], "700", 24)}`;
}

function metric(x, y, w, c, content) {
  if (!content) return "";
  return `<rect x="${x}" y="${y}" width="${w}" height="46" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 18, y + 31, 20, c.accent, [content], "700", 28)}`;
}

function renderHeader(brief, c, width) {
  const subtitle = brief.subtitle ? text(112, 176, 26, c.secondary, [brief.subtitle]) : "";
  return `${card(72, 60, width - 144, 150, c)}
<rect x="72" y="60" width="12" height="150" rx="6" fill="${c.accent}"/>
${text(112, 124, 50, c.ink, [brief.title], "700")}
${subtitle}`;
}

function renderSummary(brief, c, y, width) {
  const summaryLines = splitByLength(brief.summary, 34, 2);
  return `<rect x="72" y="${y}" width="${width - 144}" height="170" rx="14" fill="${c.soft}" stroke="${c.accent}" stroke-width="2"/>
${text(112, y + 54, 20, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(112, y + 102, 34, c.ink, summaryLines, "700", 44)}`;
}

function renderFooter(brief, c, y, width) {
  if (!brief.footer) return "";
  return `${card(72, y, width - 144, 118, c)}
${text(112, y + 68, 27, c.ink, splitByLength(brief.footer, 42, 2), "700", 38)}`;
}

function renderModuleCard(x, y, w, h, c, module, options) {
  const {
    titleY,
    bodyY,
    bodyGap,
    metricY,
    labelY,
    titleSize,
    bodySize,
    labelWidth,
    labelFill,
  } = options;
  return `${card(x, y, w, h, c)}
${text(x + 36, y + titleY, titleSize, c.ink, [module.title], "700")}
${text(x + 36, y + bodyY, bodySize, c.secondary, module.body, "400", bodyGap)}
${metric(x + 36, y + metricY, 210, c, module.metric)}
${label(x + 36, y + labelY, labelWidth, c, module.tag, labelFill)}`;
}

function renderConclusionFirst(brief, c) {
  const width = 1680;
  const moduleCount = brief.modules.length;
  const gap = 28;
  const cardX = 72;
  const cardY = 460;
  const hasMetric = brief.modules.some((module) => module.metric);
  const cardH = hasMetric ? 374 : 334;
  const cardW = Math.floor((width - 144 - gap * (moduleCount - 1)) / moduleCount);
  const modules = brief.modules.map((module, index) => {
    const x = cardX + index * (cardW + gap);
    return renderModuleCard(x, cardY, cardW, cardH, c, module, {
      titleSize: 28,
      bodySize: 21,
      titleY: 76,
      bodyY: 132,
      bodyGap: 32,
      metricY: cardH - 158,
      labelY: cardH - 96,
      labelWidth: 146,
      labelFill: index === moduleCount - 1 ? c.success : c.accent,
    });
  }).join("\n");
  return wrap(width, 1100, c, `
${renderHeader(brief, c, width)}
${renderSummary(brief, c, 250, width)}
${modules}
${renderFooter(brief, c, 870, width)}
`);
}

function renderProblemBreakdown(brief, c) {
  const width = 1680;
  const moduleCount = brief.modules.length;
  const gap = 28;
  const cardY = 438;
  const hasMetric = brief.modules.some((module) => module.metric);
  const cardH = hasMetric ? 386 : 344;
  const cardW = Math.floor((width - 144 - gap * (moduleCount - 1)) / moduleCount);
  const modules = brief.modules.map((module, index) => {
    const x = 72 + index * (cardW + gap);
    return renderModuleCard(x, cardY, cardW, cardH, c, module, {
      titleSize: 30,
      bodySize: 21,
      titleY: 78,
      bodyY: 138,
      bodyGap: 32,
      metricY: cardH - 158,
      labelY: cardH - 96,
      labelWidth: 156,
      labelFill: c.success,
    });
  }).join("\n");
  return wrap(width, 1040, c, `
${renderHeader(brief, c, width)}
${renderSummary(brief, c, 246, width)}
${modules}
${renderFooter(brief, c, 844, width)}
`);
}

function render(brief) {
  const c = styles[brief.style];
  if (!c) throw new Error(`unsupported style: ${brief.style}`);
  if (brief.layout === "conclusion-first") return renderConclusionFirst(brief, c);
  if (brief.layout === "problem-breakdown") return renderProblemBreakdown(brief, c);
  throw new Error(`unsupported layout: ${brief.layout}`);
}

try {
  const args = parseArgs(process.argv);
  const brief = JSON.parse(fs.readFileSync(args.input, "utf8"));
  fs.writeFileSync(args.output, render(brief));
  console.log(`ok: wrote ${args.output}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
