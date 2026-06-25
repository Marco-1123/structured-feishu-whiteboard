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

function centerTextGroup(containerY, containerH, items) {
  const totalH = items.reduce((sum, item, index) => sum + item.height + (index === 0 ? 0 : item.gapBefore), 0);
  let cursor = Math.round(containerY + (containerH - totalH) / 2);
  return items.map((item, index) => {
    cursor += index === 0 ? 0 : item.gapBefore;
    const y = cursor + item.baselineOffset;
    cursor += item.height;
    return y;
  });
}

function renderHeader(brief, c, width) {
  const y = 60;
  const h = 150;
  const hasSubtitle = Boolean(brief.subtitle);
  const [titleY, subtitleY] = centerTextGroup(y, h, [
    { height: 58, baselineOffset: 46, gapBefore: 0 },
    ...(hasSubtitle ? [{ height: 30, baselineOffset: 23, gapBefore: 18 }] : []),
  ]);
  const subtitle = hasSubtitle ? text(112, subtitleY, 26, c.secondary, [brief.subtitle]) : "";
  return `${card(72, y, width - 144, h, c)}
<rect x="72" y="${y}" width="12" height="${h}" rx="6" fill="${c.accent}"/>
${text(112, titleY, 50, c.ink, [brief.title], "700")}
${subtitle}`;
}

function renderSummary(brief, c, y, width) {
  const h = 170;
  const summaryLines = splitByLength(brief.summary, 34, 2);
  const summaryHeight = summaryLines.length > 0 ? 40 + (summaryLines.length - 1) * 44 : 0;
  const [labelY, summaryY] = centerTextGroup(y, h, [
    { height: 24, baselineOffset: 19, gapBefore: 0 },
    { height: summaryHeight, baselineOffset: 34, gapBefore: 20 },
  ]);
  return `<rect x="72" y="${y}" width="${width - 144}" height="${h}" rx="14" fill="${c.soft}" stroke="${c.accent}" stroke-width="2"/>
${text(112, labelY, 20, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(112, summaryY, 34, c.ink, summaryLines, "700", 44)}`;
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

function renderMiniCard(x, y, w, h, c, item) {
  return `${card(x, y, w, h, c)}
${text(x + 28, y + 48, 24, c.ink, [item.title], "700")}
${text(x + 28, y + 90, 19, c.secondary, item.body, "400", 29)}`;
}

function renderPillList(x, y, items, c, fill = c.muted, textFill = c.accent) {
  return items.map((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const px = x + col * 360;
    const py = y + row * 52;
    return `<rect x="${px}" y="${py}" width="320" height="38" rx="8" fill="${fill}" stroke="${c.border}" stroke-width="1.5"/>
${text(px + 18, py + 26, 18, textFill, [item], "700")}`;
  }).join("\n");
}

function sectionHeight(section) {
  const itemRows = Math.ceil((section.items?.length || 0) / 2);
  const metricRows = Math.ceil((section.metrics?.length || 0) / 2);
  const riskRows = Math.ceil((section.risks?.length || 0) / 2);
  const actionRows = Math.ceil((section.actions?.length || 0) / 2);
  const contentH = itemRows * 166 + Math.max(0, itemRows - 1) * 20
    + metricRows * 52 + riskRows * 52 + actionRows * 52;
  return Math.max(270, 128 + contentH + 48);
}

function renderLargeSection(section, y, c, width) {
  const x = 72;
  const w = width - 144;
  const h = sectionHeight(section);
  let cursor = y + 88;
  const summary = section.summary ? text(x + 40, y + 86, 22, c.secondary, [section.summary]) : "";
  let body = `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${c.border}" stroke-width="2"/>
${text(x + 40, y + 48, 30, c.ink, [section.title], "700")}
${summary}`;

  if (section.items?.length) {
    const cardW = Math.floor((w - 104) / 2);
    cursor += section.summary ? 34 : 0;
    section.items.forEach((item, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      body += `\n${renderMiniCard(x + 40 + col * (cardW + 24), cursor + row * 186, cardW, 166, c, item)}`;
    });
    cursor += Math.ceil(section.items.length / 2) * 186 + 4;
  }

  if (section.metrics?.length) {
    body += `\n${text(x + 40, cursor + 28, 20, c.accent, ["关键指标"], "700")}`;
    body += `\n${renderPillList(x + 40, cursor + 48, section.metrics, c, c.muted, c.accent)}`;
    cursor += Math.ceil(section.metrics.length / 2) * 52 + 76;
  }

  if (section.risks?.length) {
    body += `\n${text(x + 40, cursor + 28, 20, c.success, ["风险与待确认"], "700")}`;
    body += `\n${renderPillList(x + 40, cursor + 48, section.risks, c, c.muted, c.success)}`;
    cursor += Math.ceil(section.risks.length / 2) * 52 + 76;
  }

  if (section.actions?.length) {
    body += `\n${text(x + 40, cursor + 28, 20, c.accent, ["下一步行动"], "700")}`;
    body += `\n${renderPillList(x + 40, cursor + 48, section.actions, c, c.muted, c.accent)}`;
  }

  return { svg: body, height: h };
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

function renderLargeCanvas(brief, c) {
  const width = 1680;
  const overview = brief.sections.find((section) => section.type === "overview") || brief.sections[0];
  const overviewModules = brief.modules || overview.items?.slice(0, 5) || [];
  const overviewBrief = { ...brief, modules: overviewModules, footer: "" };
  const moduleCount = overviewBrief.modules.length;
  const gap = 28;
  const cardX = 72;
  const cardY = 460;
  const hasMetric = overviewBrief.modules.some((module) => module.metric);
  const cardH = hasMetric ? 374 : 334;
  const cardW = Math.floor((width - 144 - gap * (moduleCount - 1)) / moduleCount);
  const modules = overviewBrief.modules.map((module, index) => {
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

  let y = 900;
  let body = `
${renderHeader(overviewBrief, c, width)}
${renderSummary(overviewBrief, c, 250, width)}
${modules}`;

  brief.sections.filter((section) => section.type !== "overview").forEach((section) => {
    const rendered = renderLargeSection(section, y, c, width);
    body += `\n${rendered.svg}`;
    y += rendered.height + 72;
  });

  return wrap(width, y + 48, c, body);
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
  if (brief.layout === "large-canvas") return renderLargeCanvas(brief, c);
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
