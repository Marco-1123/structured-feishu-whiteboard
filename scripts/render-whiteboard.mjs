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

function sectionTitle(x, y, c, title, summary) {
  return `${text(x, y, 30, c.ink, [title], "700")}
${summary ? text(x, y + 38, 19, c.secondary, splitByLength(summary, 42, 1), "400") : ""}`;
}

function renderLargeModuleCard(x, y, w, h, c, item, index) {
  const bodyLines = (item.body || []).slice(0, 3);
  const badge = String(index + 1).padStart(2, "0");
  const [badgeY, titleY, bodyY] = centerTextGroup(y + 34, h - 68, [
    { height: 36, baselineOffset: 26, gapBefore: 0 },
    { height: 34, baselineOffset: 28, gapBefore: 20 },
    { height: 84, baselineOffset: 24, gapBefore: 24 },
  ]);
  return `${card(x, y, w, h, c)}
<rect x="${x + 34}" y="${badgeY - 25}" width="58" height="34" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 50, badgeY, 18, c.accent, [badge], "700")}
${text(x + 118, titleY, 28, c.ink, [item.title], "700")}
<line x1="${x + 34}" y1="${y + 94}" x2="${x + w - 34}" y2="${y + 94}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 34, bodyY, 21, c.secondary, bodyLines, "400", 31)}`;
}

function renderThinPills(x, y, w, items, c, fill = c.muted, textFill = c.accent) {
  const pillGap = 18;
  const pillW = Math.floor((w - pillGap) / 2);
  return (items || []).slice(0, 4).map((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const px = x + col * (pillW + pillGap);
    const py = y + row * 48;
    return `<rect x="${px}" y="${py}" width="${pillW}" height="36" rx="8" fill="${fill}" stroke="${c.border}" stroke-width="1.5"/>
${text(px + 16, py + 25, 17, textFill, [item], "700")}`;
  }).join("\n");
}

function renderRoadmapPanel(x, y, w, h, c, section) {
  const items = (section?.items || []).slice(0, 3);
  const stepW = Math.floor((w - 96) / 3);
  let body = `${card(x, y, w, h, c)}
${sectionTitle(x + 34, y + 54, c, section?.title || "阶段路线", section?.summary)}`;
  items.forEach((item, index) => {
    const sx = x + 34 + index * (stepW + 31);
    const sy = y + 126;
    const bodyLines = splitByLength((item.body || [])[0] || "", 9, 2);
    body += `\n<rect x="${sx}" y="${sy}" width="${stepW}" height="98" rx="10" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(sx + 20, sy + 38, 21, c.ink, [item.title], "700")}
${text(sx + 20, sy + 70, 17, c.secondary, bodyLines, "400", 22)}`;
    if (index < items.length - 1) {
      const ax = sx + stepW + 10;
      body += `\n<line x1="${ax}" y1="${sy + 49}" x2="${ax + 22}" y2="${sy + 49}" stroke="${c.accent}" stroke-width="3" marker-end="url(#arrow)"/>`;
    }
  });
  if (section?.actions?.length) {
    body += `\n${text(x + 34, y + 300, 18, c.accent, ["近期动作"], "700")}
${renderThinPills(x + 34, y + 318, w - 68, section.actions, c)}`;
  }
  return body;
}

function renderMetricsPanel(x, y, w, h, c, section) {
  const metrics = (section?.metrics || []).slice(0, 4);
  const items = (section?.items || []).slice(0, 2);
  let body = `${card(x, y, w, h, c)}
${sectionTitle(x + 34, y + 54, c, section?.title || "指标与证据", section?.summary)}`;
  metrics.forEach((m, index) => {
    const mx = x + 34 + (index % 2) * ((w - 86) / 2 + 18);
    const my = y + 124 + Math.floor(index / 2) * 58;
    const mw = Math.floor((w - 86) / 2);
    body += `\n<rect x="${mx}" y="${my}" width="${mw}" height="42" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(mx + 16, my + 29, 19, c.accent, [m], "700")}`;
  });
  items.forEach((item, index) => {
    const iy = y + 254 + index * 58;
    body += `\n${text(x + 34, iy, 19, c.ink, [item.title], "700")}
${text(x + 34, iy + 28, 17, c.secondary, (item.body || []).slice(0, 1), "400")}`;
  });
  return body;
}

function renderRiskActionPanel(x, y, w, h, c, risksSection, actionsSection) {
  const risks = (risksSection?.risks || []).slice(0, 4);
  const actions = [...(risksSection?.actions || []), ...(actionsSection?.actions || [])].slice(0, 4);
  return `${card(x, y, w, h, c)}
${sectionTitle(x + 34, y + 54, c, "风险与行动", risksSection?.summary || actionsSection?.summary)}
${text(x + 34, y + 128, 18, c.success, ["风险与待确认"], "700")}
${renderThinPills(x + 34, y + 152, w - 68, risks, c, c.muted, c.success)}
${text(x + 34, y + 266, 18, c.accent, ["下一步行动"], "700")}
${renderThinPills(x + 34, y + 290, w - 68, actions, c, c.muted, c.accent)}`;
}

function renderBackgroundStrip(x, y, w, h, c, section) {
  const items = (section?.items || []).slice(0, 3);
  const colW = Math.floor((w - 92) / 3);
  let body = `${card(x, y, w, h, c)}
${sectionTitle(x + 34, y + 54, c, section?.title || "问题与背景", section?.summary)}`;
  items.forEach((item, index) => {
    const ix = x + 34 + index * (colW + 46);
    body += `\n<line x1="${ix}" y1="${y + 106}" x2="${ix}" y2="${y + 176}" stroke="${c.accent}" stroke-width="6"/>
${text(ix + 22, y + 132, 21, c.ink, [item.title], "700")}
${text(ix + 22, y + 164, 17, c.secondary, (item.body || []).slice(0, 2), "400", 26)}`;
  });
  return body;
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
  const width = 2400;
  const height = 1820;
  const margin = 92;
  const innerW = width - margin * 2;
  const overview = brief.sections.find((section) => section.type === "overview") || brief.sections[0];
  const background = brief.sections.find((section) => section.type === "background");
  const modules = brief.sections.find((section) => section.type === "modules");
  const roadmap = brief.sections.find((section) => section.type === "roadmap");
  const metricsEvidence = brief.sections.find((section) => section.type === "metrics-evidence");
  const risks = brief.sections.find((section) => section.type === "risks");
  const actions = brief.sections.find((section) => section.type === "actions");
  const coreItems = (overview.items?.length ? overview.items : modules?.items || []).slice(0, 4);
  const cardGap = 36;
  const cardW = Math.floor((innerW - cardGap) / 2);
  const cardH = 242;
  const summaryLines = splitByLength(brief.summary, 56, 2);
  let body = `
${text(margin, 122, 52, c.ink, [brief.title], "700")}
${brief.subtitle ? text(margin, 164, 24, c.secondary, [brief.subtitle]) : ""}
<rect x="${margin}" y="208" width="${innerW}" height="142" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
<rect x="${margin}" y="208" width="12" height="142" rx="6" fill="${c.accent}"/>
${text(margin + 38, 252, 21, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(margin + 38, 304, 31, c.ink, summaryLines, "700", 40)}

${text(margin, 424, 30, c.ink, ["四个核心举措"], "700")}
${coreItems.map((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    return renderLargeModuleCard(margin + col * (cardW + cardGap), 470 + row * (cardH + 34), cardW, cardH, c, item, index);
  }).join("\n")}

${renderRoadmapPanel(margin, 1058, 725, 430, c, roadmap)}
${renderMetricsPanel(margin + 762, 1058, 676, 430, c, metricsEvidence)}
${renderRiskActionPanel(margin + 1476, 1058, 740, 430, c, risks, actions)}
${renderBackgroundStrip(margin, 1538, innerW, 226, c, background)}`;

  return wrap(width, height, c, body);
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
