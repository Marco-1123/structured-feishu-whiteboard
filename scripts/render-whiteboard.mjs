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
    exprSeries: "#2563EB",
    exprRisk: "#8A5A44",
    exprTrack: "#E6EDF5",
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
    exprSeries: "#38BDF8",
    exprRisk: "#C98B60",
    exprTrack: "#2B3A55",
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
    exprSeries: "#9A6A43",
    exprRisk: "#8A5B43",
    exprTrack: "#E3D8CA",
  },
  "feishu-neutral": {
    canvas: "#F5F7FA",
    surface: "#FFFFFF",
    muted: "#F0F3F8",
    ink: "#1F2329",
    secondary: "#646A73",
    border: "#DEE4ED",
    accent: "#3370FF",
    soft: "#EAF0FF",
    success: "#2B8F77",
    exprSeries: "#3370FF",
    exprRisk: "#8A5A44",
    exprTrack: "#E7ECF3",
  },
  "feishu-status": {
    canvas: "#F6F8FB",
    surface: "#FFFFFF",
    muted: "#EEF3F7",
    ink: "#1F2329",
    secondary: "#646A73",
    border: "#DDE6EE",
    accent: "#3370FF",
    soft: "#E8F3FF",
    success: "#2B8F77",
    warning: "#C98100",
    exprSeries: "#3370FF",
    exprRisk: "#8A5A44",
    exprTrack: "#E7ECF3",
  },
  "feishu-decision-dark": {
    canvas: "#F2F5FA",
    surface: "#FFFFFF",
    muted: "#E9EEF7",
    ink: "#1F2329",
    secondary: "#4E5969",
    border: "#CBD5E1",
    accent: "#1F3A5F",
    soft: "#DCE8F6",
    success: "#2B8F77",
    exprSeries: "#385A7D",
    exprRisk: "#7A5B4B",
    exprTrack: "#E3E9F1",
  },
  "apple-studio": {
    grammar: "apple",
    canvas: "#F5F5F7",
    surface: "#FFFFFF",
    muted: "#F2F2F7",
    ink: "#1D1D1F",
    secondary: "#6E6E73",
    border: "#D2D2D7",
    accent: "#007AFF",
    soft: "#E8F2FF",
    success: "#248A3D",
    exprSeries: "#007AFF",
    exprRisk: "#7D6258",
    exprTrack: "#E7E7EC",
    exprValue: "#1D1D1F",
  },
  "fluent-workbench": {
    grammar: "fluent",
    canvas: "#F5F5F5",
    surface: "#FFFFFF",
    muted: "#F3F2F1",
    ink: "#242424",
    secondary: "#616161",
    border: "#D1D1D1",
    accent: "#0F6CBD",
    soft: "#E5F1FB",
    success: "#107C10",
    warning: "#C19C00",
    exprSeries: "#0F6CBD",
    exprRisk: "#7A6041",
    exprTrack: "#E6E6E6",
  },
  "carbon-data": {
    grammar: "carbon",
    canvas: "#F4F4F4",
    surface: "#FFFFFF",
    muted: "#E0E0E0",
    ink: "#161616",
    secondary: "#525252",
    border: "#C6C6C6",
    accent: "#0F62FE",
    soft: "#D0E2FF",
    success: "#198038",
    exprSeries: "#0F62FE",
    exprRisk: "#7A5A46",
    exprTrack: "#E8E8E8",
  },
  "linear-command": {
    grammar: "linear",
    canvas: "#F7F8FA",
    surface: "#FFFFFF",
    muted: "#F1F3F6",
    ink: "#111827",
    secondary: "#5F6B7A",
    border: "#D8DEE8",
    accent: "#5E6AD2",
    soft: "#ECEEFE",
    success: "#16A085",
    dark: "#111827",
    darkMuted: "#1F2937",
    darkText: "#F9FAFB",
    exprSeries: "#5E6AD2",
    exprRisk: "#7C6254",
    exprTrack: "#E7EAF0",
    exprValue: "#111827",
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
      const slice = rest.slice(0, maxChars + 1);
      let cut = -1;
      for (const pattern of [/\s(?!.*\s)/, /[，。；、,.]([^，。；、,.]*)$/]) {
        const match = slice.match(pattern);
        if (match?.index && match.index >= Math.floor(maxChars * 0.55)) {
          cut = pattern.source.startsWith("\\s") ? match.index : match.index + 1;
          break;
        }
      }
      if (cut <= 0) cut = maxChars;
      lines.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
  }
  return lines;
}

function estimateTextWidth(value, fontSize) {
  let width = 0;
  for (const char of String(value ?? "")) {
    if (/[\u4E00-\u9FFF]/.test(char)) width += fontSize * 0.92;
    else if (/[，。；、！？“”《》（）]/.test(char)) width += fontSize * 0.58;
    else if (/\s/.test(char)) width += fontSize * 0.34;
    else width += fontSize * 0.56;
  }
  return width;
}

function splitByWidth(value, maxWidth, fontSize, maxLines) {
  const clean = String(value ?? "").trim();
  if (!clean) return [];
  const lines = [];
  let rest = clean;
  while (rest.length > 0 && lines.length < maxLines) {
    if (estimateTextWidth(rest, fontSize) <= maxWidth) {
      lines.push(rest);
      rest = "";
      break;
    }
    let best = -1;
    for (let i = 1; i <= rest.length; i += 1) {
      if (estimateTextWidth(rest.slice(0, i), fontSize) > maxWidth) break;
      best = i;
    }
    if (best <= 0) best = Math.max(1, Math.floor(maxWidth / fontSize));
    const slice = rest.slice(0, best + 1);
    let cut = -1;
    for (const pattern of [/\s(?!.*\s)/, /[，。；、,.]([^，。；、,.]*)$/]) {
      const match = slice.match(pattern);
      if (match?.index && match.index >= Math.floor(best * 0.55)) {
        cut = pattern.source.startsWith("\\s") ? match.index : match.index + 1;
        break;
      }
    }
    if (cut <= 0) cut = best;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
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
  if (c.grammar === "apple") {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>`;
  }
  if (c.grammar === "linear") {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>`;
}

function rect(x, y, w, h, c, options = {}) {
  const rx = options.rx ?? 14;
  const fill = options.fill ?? c.surface;
  const stroke = options.stroke ?? c.border;
  const sw = options.sw ?? 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function label(x, y, w, c, content, fill = c.accent) {
  if (!content) return "";
  if (c.grammar === "apple") {
    return `<rect x="${x}" y="${y}" width="${w}" height="36" rx="18" fill="${c.muted}" stroke="${c.border}" stroke-width="1"/>
${text(x + 18, y + 25, 17, fill, [content], "700", 24)}`;
  }
  if (c.grammar === "linear") {
    return `<rect x="${x}" y="${y}" width="${w}" height="36" rx="8" fill="${c.soft}" stroke="${c.border}" stroke-width="1"/>
${text(x + 18, y + 25, 17, fill, [content], "700", 24)}`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="36" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 18, y + 25, 17, fill, [content], "700", 24)}`;
}

function metric(x, y, w, c, content) {
  if (!content) return "";
  if (c.grammar === "apple") {
    return `<rect x="${x}" y="${y}" width="${w}" height="46" rx="14" fill="${c.muted}" stroke="${c.border}" stroke-width="1"/>
${text(x + 18, y + 31, 20, c.accent, [content], "700", 28)}`;
  }
  if (c.grammar === "linear") {
    return `<rect x="${x}" y="${y}" width="${w}" height="46" rx="8" fill="${c.soft}" stroke="${c.border}" stroke-width="1"/>
${text(x + 18, y + 31, 20, c.accent, [content], "700", 28)}`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="46" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 18, y + 31, 20, c.accent, [content], "700", 28)}`;
}

function parsePercent(value, fallback = 68) {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return fallback;
  return Math.max(4, Math.min(100, Number(match[1])));
}

function statusTone(status, c) {
  if (status === "risk") return c.exprRisk || "#9A5A3F";
  return c.exprSeries || c.accent;
}

function statusTrack(c) {
  return c.exprTrack || c.muted;
}

function seriesTone(c) {
  return c.exprSeries || c.accent;
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
  if (c.grammar === "apple") {
    return `${text(96, titleY + 2, 54, c.ink, [brief.title], "700")}
${hasSubtitle ? text(98, subtitleY + 2, 25, c.secondary, [brief.subtitle]) : ""}
<line x1="96" y1="${y + h + 18}" x2="${width - 96}" y2="${y + h + 18}" stroke="${c.border}" stroke-width="1.5"/>`;
  }
  if (c.grammar === "linear") {
    return `<rect x="72" y="${y}" width="${width - 144}" height="${h}" rx="18" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
<rect x="72" y="${y}" width="16" height="${h}" rx="8" fill="${c.dark || c.ink}"/>
${text(112, titleY, 50, c.ink, [brief.title], "700")}
${subtitle}`;
  }
  return `${card(72, y, width - 144, h, c)}
<rect x="72" y="${y}" width="12" height="${h}" rx="6" fill="${c.accent}"/>
${text(112, titleY, 50, c.ink, [brief.title], "700")}
${subtitle}`;
}

function renderSummary(brief, c, y, width) {
  const h = 170;
  const summarySize = c.grammar === "apple" ? 32 : c.grammar === "linear" ? 32 : 34;
  const summaryMaxWidth = c.grammar === "apple" ? width - 256 : width - 184;
  const summaryLines = splitByWidth(brief.summary, summaryMaxWidth, summarySize, 2);
  const summaryHeight = summaryLines.length > 0 ? 40 + (summaryLines.length - 1) * 44 : 0;
  const [labelY, summaryY] = centerTextGroup(y, h, [
    { height: 24, baselineOffset: 19, gapBefore: 0 },
    { height: summaryHeight, baselineOffset: 34, gapBefore: 20 },
  ]);
  if (c.grammar === "apple") {
    return `<rect x="96" y="${y}" width="${width - 192}" height="${h}" rx="26" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
${text(128, labelY, 19, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(128, summaryY, 32, c.ink, summaryLines, "700", 42)}`;
  }
  if (c.grammar === "linear") {
    return `<rect x="72" y="${y}" width="${width - 144}" height="${h}" rx="16" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
<rect x="72" y="${y}" width="12" height="${h}" rx="6" fill="${c.dark || c.ink}"/>
${text(112, labelY, 19, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(112, summaryY, 32, c.ink, summaryLines, "700", 42)}`;
  }
  return `<rect x="72" y="${y}" width="${width - 144}" height="${h}" rx="14" fill="${c.soft}" stroke="${c.accent}" stroke-width="2"/>
${text(112, labelY, 20, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(112, summaryY, 34, c.ink, summaryLines, "700", 44)}`;
}

function renderFooter(brief, c, y, width) {
  if (!brief.footer) return "";
  const footerLines = splitByLength(brief.footer, c.grammar === "linear" ? 46 : 42, 2);
  const footerTextH = 25 + (footerLines.length - 1) * 36;
  const [footerTextY] = centerTextGroup(y, 112, [
    { height: footerTextH, baselineOffset: 25, gapBefore: 0 },
  ]);
  if (c.grammar === "apple") {
    return `${rect(96, y, width - 192, 112, c, { rx: 24, fill: c.surface, stroke: c.border, sw: 1.5 })}
${text(128, footerTextY, 25, c.ink, footerLines, "700", 36)}`;
  }
  if (c.grammar === "linear") {
    return `${rect(72, y, width - 144, 112, c, { rx: 16, fill: c.surface, stroke: c.border, sw: 1.5 })}
<rect x="72" y="${y}" width="12" height="112" rx="6" fill="${c.dark || c.ink}"/>
${text(112, footerTextY, 25, c.ink, footerLines, "700", 36)}`;
  }
  const defaultLines = splitByLength(brief.footer, 42, 2);
  const defaultTextH = 27 + (defaultLines.length - 1) * 38;
  const [defaultTextY] = centerTextGroup(y, 118, [
    { height: defaultTextH, baselineOffset: 27, gapBefore: 0 },
  ]);
  return `${card(72, y, width - 144, 118, c)}
${text(112, defaultTextY, 27, c.ink, defaultLines, "700", 38)}`;
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

function renderAppleTitleBlock(brief, width) {
  return `${text(120, 118, 56, styles["apple-studio"].ink, [brief.title], "700")}
${brief.subtitle ? text(122, 162, 24, styles["apple-studio"].secondary, [brief.subtitle]) : ""}
<line x1="120" y1="218" x2="${width - 120}" y2="218" stroke="${styles["apple-studio"].border}" stroke-width="1.5"/>`;
}

function renderAppleStatement(brief, width, y = 248) {
  const c = styles["apple-studio"];
  return `<rect x="120" y="${y}" width="${width - 240}" height="158" rx="28" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
${text(152, y + 52, 18, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(152, y + 100, 30, c.ink, splitByWidth(brief.summary, width - 304, 30, 2), "700", 38)}`;
}

function renderAppleFooter(brief, width, y) {
  if (!brief.footer) return "";
  const c = styles["apple-studio"];
  return `<rect x="120" y="${y}" width="${width - 240}" height="118" rx="24" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
${text(152, y + 50, 24, c.ink, splitByLength(brief.footer, 44, 2), "700", 34)}`;
}

function renderAppleConclusionFirst(brief) {
  const c = styles["apple-studio"];
  const width = 1680;
  const height = 1000;
  const modules = brief.modules.slice(0, 5);
  const gap = modules.length > 3 ? 26 : 34;
  const x0 = 120;
  const y = 456;
  const cardW = Math.floor((width - 240 - gap * (modules.length - 1)) / modules.length);
  const cardH = 296;
  const cards = modules.map((module, index) => {
    const x = x0 + index * (cardW + gap);
    const bodyLines = module.body.slice(0, 3);
    const pillY = y + cardH - 62;
    const metricBlock = module.metric
      ? metric(x + 30, pillY - 56, Math.min(220, cardW - 60), c, module.metric)
      : "";
    return `${card(x, y, cardW, cardH, c)}
${text(x + 30, y + 62, 27, c.ink, [module.title], "700")}
<line x1="${x + 30}" y1="${y + 92}" x2="${x + cardW - 30}" y2="${y + 92}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 30, y + 142, 20, c.secondary, bodyLines, "400", 30)}
${metricBlock}
${label(x + 30, pillY, Math.min(150, cardW - 60), c, module.tag, index === modules.length - 1 ? c.success : c.accent)}`;
  }).join("\n");
  return wrap(width, height, c, `
${renderAppleTitleBlock(brief, width)}
${renderAppleStatement(brief, width)}
${cards}
${renderAppleFooter(brief, width, 816)}
`);
}

function renderAppleRoadmap(brief) {
  const c = styles["apple-studio"];
  const width = 1680;
  const height = 1000;
  const stages = brief.stages.slice(0, 5);
  const gap = stages.length > 3 ? 34 : 48;
  const x0 = 120;
  const y = 456;
  const cardW = Math.floor((width - 240 - gap * (stages.length - 1)) / stages.length);
  const cardH = 296;
  const cards = stages.map((stage, index) => {
    const x = x0 + index * (cardW + gap);
    const nextX = x0 + (index + 1) * (cardW + gap);
    const badge = String(index + 1).padStart(2, "0");
    const arrow = index < stages.length - 1
      ? `<line x1="${x + cardW - 2}" y1="${y + 148}" x2="${nextX + 2}" y2="${y + 148}" stroke="${c.accent}" stroke-width="3.5" stroke-linecap="round" marker-end="url(#arrow)"/>`
      : "";
    return `${card(x, y, cardW, cardH, c)}
<rect x="${x + 30}" y="${y + 34}" width="58" height="34" rx="12" fill="${c.muted}" stroke="${c.border}" stroke-width="1"/>
${text(x + 45, y + 58, 17, c.accent, [badge], "700")}
${text(x + 30, y + 106, 26, c.ink, [stage.title], "700")}
<line x1="${x + 30}" y1="${y + 136}" x2="${x + cardW - 30}" y2="${y + 136}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 30, y + 174, 19, c.secondary, stage.body.slice(0, 3), "400", 25)}
${label(x + 30, y + cardH - 50, 132, c, stage.tag, index === stages.length - 1 ? c.success : c.accent)}
${arrow}`;
  }).join("\n");
  return wrap(width, height, c, `
${renderAppleTitleBlock(brief, width)}
${renderAppleStatement(brief, width)}
${cards}
${renderAppleFooter(brief, width, 816)}
`);
}

function renderAppleProcessChain(brief) {
  const c = styles["apple-studio"];
  const width = 1880;
  const height = 1000;
  const nodes = brief.nodes.slice(0, 6);
  const gap = nodes.length > 4 ? 30 : 42;
  const x0 = 120;
  const y = 450;
  const nodeW = Math.floor((width - 240 - gap * (nodes.length - 1)) / nodes.length);
  const nodeH = 310;
  const blocks = nodes.map((node, index) => {
    const x = x0 + index * (nodeW + gap);
    const nextX = x0 + (index + 1) * (nodeW + gap);
    const arrow = index < nodes.length - 1
      ? `<line x1="${x + nodeW - 2}" y1="${y + 154}" x2="${nextX + 2}" y2="${y + 154}" stroke="${c.accent}" stroke-width="3.5" stroke-linecap="round" marker-end="url(#arrow)"/>`
      : "";
    const inputLine = node.input ? [`输入：${node.input}`] : [];
    const outputLine = node.output ? [`输出：${node.output}`] : [];
    return `${card(x, y, nodeW, nodeH, c)}
<rect x="${x}" y="${y}" width="${nodeW}" height="70" rx="24" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 28, y + 46, 25, c.ink, [node.title], "700")}
${text(x + 28, y + 120, 19, c.secondary, node.body.slice(0, 2), "400", 28)}
<line x1="${x + 28}" y1="${y + 192}" x2="${x + nodeW - 28}" y2="${y + 192}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 28, y + 232, 16, c.accent, inputLine, "700")}
${text(x + 28, y + 270, 16, c.success, outputLine, "700")}
${arrow}`;
  }).join("\n");
  return wrap(width, height, c, `
${renderAppleTitleBlock(brief, width)}
${renderAppleStatement(brief, width)}
${blocks}
${renderAppleFooter(brief, width, 816)}
`);
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
  return `${card(x, y, w, h, c)}
<rect x="${x + 28}" y="${y + 44}" width="58" height="34" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 44, y + 69, 18, c.accent, [badge], "700")}
${text(x + 104, y + 71, 27, c.ink, [item.title], "700")}
<line x1="${x + 28}" y1="${y + 112}" x2="${x + w - 28}" y2="${y + 112}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 28, y + 158, 20, c.secondary, bodyLines, "400", 30)}`;
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
  const sidePad = 34;
  const stepGap = 68;
  const stepW = Math.floor((w - sidePad * 2 - stepGap * 2) / 3);
  let body = `${card(x, y, w, h, c)}
${sectionTitle(x + 34, y + 54, c, section?.title || "阶段路线", section?.summary)}`;
  items.forEach((item, index) => {
    const sx = x + sidePad + index * (stepW + stepGap);
    const sy = y + 126;
    const bodyLines = splitByLength((item.body || [])[0] || "", 7, 2);
    body += `\n<rect x="${sx}" y="${sy}" width="${stepW}" height="98" rx="10" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(sx + 20, sy + 38, 21, c.ink, [item.title], "700")}
${text(sx + 20, sy + 70, 17, c.secondary, bodyLines, "400", 22)}`;
    if (index < items.length - 1) {
      const ax1 = sx + stepW + 16;
      const ax2 = sx + stepW + stepGap - 18;
      body += `\n<line x1="${ax1}" y1="${sy + 49}" x2="${ax2}" y2="${sy + 49}" stroke="${c.accent}" stroke-width="3" marker-end="url(#arrow)"/>`;
    }
  });
  if (section?.actions?.length) {
    body += `\n<line x1="${x + 34}" y1="${y + 278}" x2="${x + w - 34}" y2="${y + 278}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 34, y + 316, 18, c.accent, ["近期动作"], "700")}
${renderThinPills(x + 34, y + 336, w - 68, section.actions, c)}`;
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
  if (c.grammar === "apple") return renderAppleConclusionFirst(brief);
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
  const height = 1560;
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
  const cardGap = 28;
  const cardW = Math.floor((innerW - cardGap * 3) / 4);
  const cardH = 250;
  const summaryLines = splitByWidth(brief.summary, innerW - 76, 31, 2);
  let body = `
${text(margin, 122, 52, c.ink, [brief.title], "700")}
${brief.subtitle ? text(margin, 164, 24, c.secondary, [brief.subtitle]) : ""}
<rect x="${margin}" y="208" width="${innerW}" height="142" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
<rect x="${margin}" y="208" width="12" height="142" rx="6" fill="${c.accent}"/>
${text(margin + 38, 252, 21, c.accent, [brief.summaryLabel || "核心结论"], "700")}
${text(margin + 38, 304, 31, c.ink, summaryLines, "700", 40)}

${text(margin, 424, 30, c.ink, ["四个核心举措"], "700")}
${coreItems.map((item, index) => {
    return renderLargeModuleCard(margin + index * (cardW + cardGap), 470, cardW, cardH, c, item, index);
  }).join("\n")}

${renderRoadmapPanel(margin, 800, 725, 430, c, roadmap)}
${renderMetricsPanel(margin + 762, 800, 676, 430, c, metricsEvidence)}
${renderRiskActionPanel(margin + 1476, 800, 740, 430, c, risks, actions)}
${renderBackgroundStrip(margin, 1280, innerW, 226, c, background)}`;

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

function renderRoadmap(brief, c) {
  if (c.grammar === "apple") return renderAppleRoadmap(brief);
  const width = 1680;
  const height = 1040;
  const stages = brief.stages.slice(0, 5);
  const gap = 28;
  const x0 = 72;
  const y = 438;
  const cardW = Math.floor((width - 144 - gap * (stages.length - 1)) / stages.length);
  const cardH = 342;
  const cards = stages.map((stage, index) => {
    const x = x0 + index * (cardW + gap);
    const badge = String(index + 1).padStart(2, "0");
    const arrow = index < stages.length - 1
      ? `<line x1="${x + cardW - 4}" y1="${y + 170}" x2="${x + cardW + gap + 4}" y2="${y + 170}" stroke="${c.accent}" stroke-width="${c.grammar === "linear" ? 4 : 3}" marker-end="url(#arrow)"/>`
      : "";
    return `${card(x, y, cardW, cardH, c)}
<rect x="${x + 30}" y="${y + 34}" width="58" height="34" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 46, y + 58, 17, c.accent, [badge], "700")}
${text(x + 30, y + 112, 27, c.ink, [stage.title], "700")}
<line x1="${x + 30}" y1="${y + 142}" x2="${x + cardW - 30}" y2="${y + 142}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 30, y + 190, 20, c.secondary, stage.body.slice(0, 3), "400", 31)}
${label(x + 30, y + cardH - 70, 132, c, stage.tag, index === stages.length - 1 ? c.success : c.accent)}
${arrow}`;
  }).join("\n");
  return wrap(width, height, c, `
${renderHeader(brief, c, width)}
${renderSummary(brief, c, 246, width)}
${cards}
${renderFooter(brief, c, 852, width)}
`);
}

function renderProcessChain(brief, c) {
  if (c.grammar === "apple") return renderAppleProcessChain(brief);
  const width = 1880;
  const height = 1080;
  const nodes = brief.nodes.slice(0, 7);
  const gap = 24;
  const x0 = 72;
  const y = 452;
  const nodeW = Math.floor((width - 144 - gap * (nodes.length - 1)) / nodes.length);
  const nodeH = 350;
  const blocks = nodes.map((node, index) => {
    const x = x0 + index * (nodeW + gap);
    const arrow = index < nodes.length - 1
      ? `<line x1="${x + nodeW - 4}" y1="${y + 168}" x2="${x + nodeW + gap + 4}" y2="${y + 168}" stroke="${c.accent}" stroke-width="${c.grammar === "linear" ? 4 : 3}" marker-end="url(#arrow)"/>`
      : "";
    const inputLine = node.input ? [`输入: ${node.input}`] : [];
    const outputLine = node.output ? [`输出: ${node.output}`] : [];
    return `${card(x, y, nodeW, nodeH, c)}
<rect x="${x}" y="${y}" width="${nodeW}" height="68" rx="14" fill="${c.muted}" stroke="${c.border}" stroke-width="2"/>
${text(x + 24, y + 44, 24, c.ink, [node.title], "700")}
${text(x + 24, y + 118, 19, c.secondary, node.body.slice(0, 2), "400", 29)}
<line x1="${x + 24}" y1="${y + 198}" x2="${x + nodeW - 24}" y2="${y + 198}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 24, y + 238, 16, c.accent, inputLine, "700")}
${text(x + 24, y + 280, 16, c.success, outputLine, "700")}
${arrow}`;
  }).join("\n");
  return wrap(width, height, c, `
${renderHeader(brief, c, width)}
${renderSummary(brief, c, 246, width)}
${blocks}
${renderFooter(brief, c, 870, width)}
`);
}

function renderComparisonMatrix(brief, c) {
  if (c.grammar === "apple") return renderComparisonMatrixApple(brief, c);
  if (c.grammar === "fluent") return renderComparisonMatrixFluent(brief, c);
  if (c.grammar === "carbon") return renderComparisonMatrixCarbon(brief, c);
  if (c.grammar === "linear") return renderComparisonMatrixLinear(brief, c);

  const width = 1680;
  const height = 1080;
  const columns = brief.matrix.columns;
  const rows = brief.matrix.rows;
  const x = 72;
  const y = 430;
  const tableW = width - 144;
  const nameW = 248;
  const colW = Math.floor((tableW - nameW) / columns.length);
  const headerH = 72;
  const rowH = 94;
  const tableH = headerH + rows.length * rowH;
  let body = `${card(x, y, tableW, tableH, c)}
<rect x="${x}" y="${y}" width="${tableW}" height="${headerH}" rx="14" fill="${c.muted}" stroke="${c.border}" stroke-width="2"/>
${text(x + 28, y + 46, 22, c.ink, ["对象/维度"], "700")}`;
  columns.forEach((column, index) => {
    const cx = x + nameW + index * colW;
    body += `\n${text(cx + 24, y + 46, 22, c.ink, [column], "700")}
<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + tableH}" stroke="${c.border}" stroke-width="1.5"/>`;
  });
  rows.forEach((row, rowIndex) => {
    const ry = y + headerH + rowIndex * rowH;
    const fill = row.recommended ? c.soft : c.surface;
    body += `\n<rect x="${x}" y="${ry}" width="${tableW}" height="${rowH}" fill="${fill}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 28, ry + 58, 22, row.recommended ? c.accent : c.ink, [row.name], "700")}`;
    row.cells.forEach((cell, cellIndex) => {
      const cx = x + nameW + cellIndex * colW;
      body += `\n${text(cx + 24, ry + 58, 20, c.secondary, [cell], "400")}`;
    });
  });
  return wrap(width, height, c, `
${renderHeader(brief, c, width)}
${renderSummary(brief, c, 238, width)}
${body}
${renderFooter(brief, c, 900, width)}
`);
}

function renderComparisonMatrixApple(brief, c) {
  const width = 1680;
  const height = 1080;
  const columns = brief.matrix.columns;
  const rows = brief.matrix.rows;
  const x = 120;
  const y = 442;
  const tableW = width - 240;
  const nameW = 260;
  const colW = Math.floor((tableW - nameW) / columns.length);
  const headerH = 74;
  const rowH = 94;
  const tableBottomPad = 30;
  const tableH = headerH + rows.length * rowH + tableBottomPad;
  const footerY = y + tableH + 34;
  let body = `
${text(120, 126, 58, c.ink, [brief.title], "700")}
${brief.subtitle ? text(122, 174, 24, c.secondary, [brief.subtitle]) : ""}
<rect x="120" y="232" width="${tableW}" height="188" rx="28" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
${text(148, 286, 18, c.accent, [brief.summaryLabel || "推荐"], "700")}
${text(148, 326, 28, c.ink, splitByWidth(brief.summary, tableW - 56, 28, 3), "700", 35)}
${rect(x, y, tableW, tableH, c, { rx: 24, fill: c.surface, stroke: c.border, sw: 1.5 })}
<rect x="${x + 18}" y="${y + 18}" width="${tableW - 36}" height="${headerH - 18}" rx="18" fill="${c.muted}" stroke="${c.muted}" stroke-width="1"/>
${text(x + 34, y + 54, 20, c.secondary, ["对象"], "700")}`;
  columns.forEach((column, index) => {
    const cx = x + nameW + index * colW;
    body += `\n${text(cx + 22, y + 54, 20, c.secondary, [column], "700")}`;
  });
  rows.forEach((row, rowIndex) => {
    const ry = y + headerH + rowIndex * rowH;
    const fill = row.recommended ? c.soft : c.surface;
    body += `\n<rect x="${x + 18}" y="${ry + 10}" width="${tableW - 36}" height="${rowH - 14}" rx="18" fill="${fill}" stroke="${row.recommended ? c.accent : c.border}" stroke-width="${row.recommended ? 2 : 1}"/>
${text(x + 36, ry + 60, 21, row.recommended ? c.accent : c.ink, [row.name], "700")}`;
    row.cells.forEach((cell, cellIndex) => {
      const cx = x + nameW + cellIndex * colW;
      body += `\n${text(cx + 22, ry + 60, 19, c.secondary, [cell], "400")}`;
    });
  });
  body += `\n<rect x="120" y="${footerY}" width="${tableW}" height="106" rx="22" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
${text(150, footerY + 42, 22, c.ink, splitByLength(brief.footer || "", 22, 2), "700", 31)}`;
  return wrap(width, height, c, body);
}

function renderComparisonMatrixFluent(brief, c) {
  const width = 1680;
  const height = 1080;
  const columns = brief.matrix.columns;
  const rows = brief.matrix.rows;
  const x = 92;
  const y = 420;
  const tableW = width - 184;
  const nameW = 250;
  const colW = Math.floor((tableW - nameW) / columns.length);
  const headerH = 70;
  const rowH = 88;
  const tableH = headerH + rows.length * rowH;
  let body = `
<rect x="0" y="0" width="${width}" height="128" fill="${c.muted}" stroke="${c.border}" stroke-width="0"/>
<rect x="92" y="36" width="8" height="56" rx="4" fill="${c.accent}"/>
${text(120, 78, 44, c.ink, [brief.title], "700")}
${brief.subtitle ? text(120, 112, 21, c.secondary, [brief.subtitle]) : ""}
<rect x="${width - 320}" y="42" width="228" height="44" rx="8" fill="${c.soft}" stroke="${c.border}" stroke-width="1.5"/>
${text(width - 294, 71, 18, c.accent, [brief.summaryLabel || "Decision"], "700")}
${rect(92, 168, tableW, 160, c, { rx: 8, fill: c.surface, stroke: c.border, sw: 1.5 })}
${text(124, 222, 20, c.accent, ["推荐结论"], "700")}
${text(124, 278, 34, c.ink, splitByWidth(brief.summary, tableW - 64, 34, 2), "700", 42)}
${rect(x, y, tableW, tableH, c, { rx: 8, fill: c.surface, stroke: c.border, sw: 1.5 })}
<rect x="${x}" y="${y}" width="${tableW}" height="${headerH}" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 28, y + 45, 21, c.ink, ["对象/维度"], "700")}`;
  columns.forEach((column, index) => {
    const cx = x + nameW + index * colW;
    body += `\n<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + tableH}" stroke="${c.border}" stroke-width="1.5"/>
${text(cx + 24, y + 45, 21, c.ink, [column], "700")}`;
  });
  rows.forEach((row, rowIndex) => {
    const ry = y + headerH + rowIndex * rowH;
    const fill = row.recommended ? c.soft : (rowIndex % 2 === 0 ? c.surface : "#FAFAFA");
    body += `\n<rect x="${x}" y="${ry}" width="${tableW}" height="${rowH}" fill="${fill}" stroke="${c.border}" stroke-width="1"/>
${row.recommended ? `<rect x="${x}" y="${ry}" width="8" height="${rowH}" fill="${c.accent}"/>` : ""}
${text(x + 28, ry + 55, 21, row.recommended ? c.accent : c.ink, [row.name], "700")}`;
    row.cells.forEach((cell, cellIndex) => {
      const cx = x + nameW + cellIndex * colW;
      body += `\n${text(cx + 24, ry + 55, 19, c.secondary, [cell], "400")}`;
    });
  });
  body += `\n${rect(92, 912, tableW, 86, c, { rx: 8, fill: c.surface, stroke: c.border, sw: 1.5 })}
${text(124, 965, 25, c.ink, splitByLength(brief.footer || "", 52, 1), "700")}`;
  return wrap(width, height, c, body);
}

function renderComparisonMatrixCarbon(brief, c) {
  const width = 1680;
  const height = 1080;
  const columns = brief.matrix.columns;
  const rows = brief.matrix.rows;
  const x = 88;
  const y = 392;
  const tableW = width - 176;
  const nameW = 248;
  const colW = Math.floor((tableW - nameW) / columns.length);
  const headerH = 64;
  const rowH = 86;
  const tableH = headerH + rows.length * rowH;
  let body = `
<rect x="0" y="0" width="${width}" height="${height}" fill="${c.canvas}"/>
<rect x="88" y="68" width="${tableW}" height="2" fill="${c.ink}"/>
${text(88, 128, 48, c.ink, [brief.title], "700")}
${brief.subtitle ? text(88, 164, 22, c.secondary, [brief.subtitle]) : ""}
<rect x="88" y="214" width="${tableW}" height="116" fill="${c.surface}" stroke="${c.border}" stroke-width="1"/>
<rect x="88" y="214" width="12" height="116" fill="${c.accent}"/>
${text(124, 252, 18, c.accent, [brief.summaryLabel || "结论"], "700")}
${text(124, 296, 30, c.ink, splitByWidth(brief.summary, tableW - 72, 30, 2), "700", 38)}
<rect x="${x}" y="${y}" width="${tableW}" height="${tableH}" fill="${c.surface}" stroke="${c.border}" stroke-width="1"/>
<rect x="${x}" y="${y}" width="${tableW}" height="${headerH}" fill="${c.muted}" stroke="${c.ink}" stroke-width="1.5"/>
<rect x="${x}" y="${y}" width="${tableW}" height="6" fill="${c.ink}"/>
${text(x + 24, y + 41, 19, c.ink, ["对象/维度"], "700")}`;
  columns.forEach((column, index) => {
    const cx = x + nameW + index * colW;
    body += `\n<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + tableH}" stroke="${c.border}" stroke-width="1"/>
${text(cx + 20, y + 41, 19, c.ink, [column], "700")}`;
  });
  rows.forEach((row, rowIndex) => {
    const ry = y + headerH + rowIndex * rowH;
    const fill = row.recommended ? c.soft : (rowIndex % 2 === 0 ? "#FFFFFF" : "#F4F4F4");
    body += `\n<rect x="${x}" y="${ry}" width="${tableW}" height="${rowH}" fill="${fill}" stroke="${c.border}" stroke-width="1"/>
${row.recommended ? `<rect x="${x}" y="${ry}" width="10" height="${rowH}" fill="${c.accent}"/>` : ""}
${text(x + 24, ry + 54, 21, row.recommended ? c.accent : c.ink, [row.name], "700")}`;
    row.cells.forEach((cell, cellIndex) => {
      const cx = x + nameW + cellIndex * colW;
      body += `\n${text(cx + 20, ry + 54, 19, c.secondary, [cell], "400")}`;
    });
  });
  body += `\n<rect x="88" y="906" width="${tableW}" height="92" fill="${c.surface}" stroke="${c.border}" stroke-width="1"/>
<rect x="88" y="906" width="12" height="92" fill="${c.ink}"/>
${text(124, 963, 25, c.ink, splitByLength(brief.footer || "", 52, 1), "700")}`;
  return wrap(width, height, c, body);
}

function renderComparisonMatrixLinear(brief, c) {
  const width = 1680;
  const height = 1080;
  const columns = brief.matrix.columns;
  const rows = brief.matrix.rows;
  const x = 104;
  const y = 430;
  const tableW = width - 208;
  const nameW = 250;
  const colW = Math.floor((tableW - nameW) / columns.length);
  const headerH = 68;
  const rowH = 90;
  const tableH = headerH + rows.length * rowH;
  let body = `
<rect x="72" y="56" width="${width - 144}" height="228" rx="22" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
<rect x="72" y="56" width="18" height="228" rx="9" fill="${c.dark}"/>
${text(122, 174, 50, c.ink, [brief.title], "700")}
${brief.subtitle ? text(124, 218, 22, c.secondary, [brief.subtitle]) : ""}
<line x1="122" y1="98" x2="250" y2="98" stroke="${c.accent}" stroke-width="4"/>
<rect x="104" y="316" width="${tableW}" height="86" rx="16" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
${text(132, 369, 28, c.ink, splitByWidth(brief.summary, tableW - 56, 28, 1), "700")}
${rect(x, y, tableW, tableH, c, { rx: 16, fill: c.surface, stroke: c.border, sw: 1.5 })}
<rect x="${x}" y="${y}" width="${tableW}" height="${headerH}" rx="16" fill="${c.muted}" stroke="${c.border}" stroke-width="1"/>
${text(x + 26, y + 43, 20, c.secondary, ["对象/维度"], "700")}`;
  columns.forEach((column, index) => {
    const cx = x + nameW + index * colW;
    body += `\n${text(cx + 24, y + 43, 20, c.secondary, [column], "700")}`;
  });
  rows.forEach((row, rowIndex) => {
    const ry = y + headerH + rowIndex * rowH;
    const fill = row.recommended ? c.soft : c.surface;
    body += `\n<line x1="${x + 24}" y1="${ry}" x2="${x + tableW - 24}" y2="${ry}" stroke="${c.border}" stroke-width="1"/>
${row.recommended ? `<rect x="${x + 18}" y="${ry + 18}" width="${tableW - 36}" height="${rowH - 28}" rx="13" fill="${fill}" stroke="${c.accent}" stroke-width="1.5"/>` : ""}
${text(x + 30, ry + 56, 21, row.recommended ? c.accent : c.ink, [row.name], "700")}`;
    row.cells.forEach((cell, cellIndex) => {
      const cx = x + nameW + cellIndex * colW;
      body += `\n${text(cx + 24, ry + 56, 19, c.secondary, [cell], "400")}`;
    });
  });
  body += `\n<rect x="104" y="924" width="${tableW}" height="74" rx="16" fill="${c.surface}" stroke="${c.border}" stroke-width="1.5"/>
<rect x="104" y="924" width="12" height="74" rx="6" fill="${c.dark}"/>
${text(134, 970, 23, c.ink, splitByLength(brief.footer || "", 60, 1), "700")}`;
  return wrap(width, height, c, body);
}

function expressionBlocks(brief, type) {
  return (brief.expressionBlocks || []).filter((block) => block.type === type);
}

function firstExpressionBlock(brief, type) {
  return expressionBlocks(brief, type)[0];
}

function renderExpressionFrame(x, y, w, h, c, title, subtitle = "") {
  return `${card(x, y, w, h, c)}
${text(x + 28, y + 48, 24, c.ink, [title], "700")}
${subtitle ? text(x + 28, y + 82, 17, c.secondary, splitByWidth(subtitle, w - 56, 17, 1)) : ""}`;
}

function renderExpressionStatement(x, y, w, h, c, block) {
  const lines = splitByWidth((block.body || []).join(" "), w - 86, 28, 2);
  return `${rect(x, y, w, h, c, { rx: c.grammar === "linear" ? 16 : 18, fill: c.surface, stroke: c.border, sw: 1.5 })}
<rect x="${x}" y="${y}" width="12" height="${h}" rx="6" fill="${c.grammar === "linear" ? c.dark : c.accent}" stroke="${c.grammar === "linear" ? c.dark : c.accent}" stroke-width="1"/>
${text(x + 38, y + 42, 18, c.accent, [block.title], "700")}
${text(x + 38, y + 92, 30, c.ink, lines, "700", 39)}`;
}

function renderMetricTile(x, y, w, h, c, block) {
  const tone = statusTone(block.status, c);
  const valueTone = block.status === "risk" ? tone : (c.exprValue || tone);
  return `${rect(x, y, w, h, c, { rx: 16, fill: c.surface, stroke: c.border, sw: 1.5 })}
${text(x + 24, y + 38, 18, c.secondary, [block.title], "700")}
${text(x + 24, y + 90, 42, valueTone, [block.value], "700")}
${block.note ? text(x + 24, y + 128, 17, c.secondary, splitByWidth(block.note, w - 48, 17, 2), "400", 24) : ""}
${block.label ? label(x + 24, y + h - 54, 112, c, block.label, tone) : ""}`;
}

function renderProgressBlock(x, y, w, h, c, block) {
  const items = (block.items || []).slice(0, 4);
  const rowH = Math.floor((h - 110) / Math.max(1, items.length));
  let body = renderExpressionFrame(x, y, w, h, c, block.title, block.note);
  items.forEach((item, index) => {
    const rowY = y + 98 + index * rowH;
    const pct = parsePercent(item.value, 60);
    const trackX = x + 170;
    const trackW = w - 230;
    const barTone = seriesTone(c);
    body += `
${text(x + 28, rowY + 25, 18, c.ink, [item.label], "700")}
<rect x="${trackX}" y="${rowY + 10}" width="${trackW}" height="18" rx="9" fill="${statusTrack(c)}" stroke="${c.border}" stroke-width="1"/>
<rect x="${trackX}" y="${rowY + 10}" width="${Math.round(trackW * pct / 100)}" height="18" rx="9" fill="${barTone}" stroke="${barTone}" stroke-width="1"/>
${text(x + w - 50, rowY + 27, 17, c.secondary, [item.value], "700")}`;
  });
  return body;
}

function renderRankedBlock(x, y, w, h, c, block) {
  const items = (block.items || []).slice(0, 5);
  const rowH = Math.floor((h - 116) / Math.max(1, items.length));
  let body = renderExpressionFrame(x, y, w, h, c, block.title, block.note);
  items.forEach((item, index) => {
    const rowY = y + 102 + index * rowH;
    const pct = parsePercent(item.value, 54 + index * 8);
    const barX = x + 210;
    const barW = w - 280;
    const barTone = seriesTone(c);
    body += `
${text(x + 28, rowY + 24, 17, c.ink, [item.label], "700")}
<rect x="${barX}" y="${rowY + 8}" width="${barW}" height="18" rx="9" fill="${statusTrack(c)}" stroke="${c.border}" stroke-width="1"/>
<rect x="${barX}" y="${rowY + 8}" width="${Math.round(barW * pct / 100)}" height="18" rx="9" fill="${barTone}" stroke="${barTone}" stroke-width="1"/>
${text(x + w - 58, rowY + 25, 16, c.secondary, [item.value], "700")}`;
  });
  return body;
}

function renderListBlock(x, y, w, h, c, block, options = {}) {
  const items = (block.items || []).slice(0, options.maxItems || 4);
  const colCount = options.columns || 1;
  const gap = 14;
  const itemW = Math.floor((w - 56 - gap * (colCount - 1)) / colCount);
  const rowCount = Math.ceil(items.length / colCount);
  const rowGap = 12;
  const requestedItemH = options.itemH || 44;
  const availableH = Math.max(120, h - 122);
  const itemH = Math.max(36, Math.min(requestedItemH, Math.floor((availableH - rowGap * Math.max(0, rowCount - 1)) / Math.max(1, rowCount))));
  let body = renderExpressionFrame(x, y, w, h, c, block.title, block.note);
  items.forEach((item, index) => {
    const col = index % colCount;
    const row = Math.floor(index / colCount);
    const ix = x + 28 + col * (itemW + gap);
    const iy = y + 100 + row * (itemH + rowGap);
    const tone = options.tone || statusTone(item.status, c);
    body += `
<rect x="${ix}" y="${iy}" width="${itemW}" height="${itemH}" rx="10" fill="${c.muted}" stroke="${c.border}" stroke-width="1.2"/>
<rect x="${ix}" y="${iy}" width="6" height="${itemH}" rx="3" fill="${tone}" stroke="${tone}" stroke-width="1"/>
${text(ix + 18, iy + 29, 17, options.emphasis ? tone : c.ink, [item.label], "700")}
${item.note && itemH >= 50 ? text(ix + 18, iy + 54, 14, c.secondary, splitByWidth(item.note, itemW - 36, 14, 1)) : ""}`;
  });
  return body;
}

function renderNarrativeChainBlock(x, y, w, h, c, block) {
  const items = (block.items || []).slice(0, 4);
  const gap = 34;
  const nodeW = Math.floor((w - 56 - gap * (items.length - 1)) / items.length);
  const nodeY = y + 104;
  let body = renderExpressionFrame(x, y, w, h, c, block.title, block.note);
  items.forEach((item, index) => {
    const nx = x + 28 + index * (nodeW + gap);
    body += `
${rect(nx, nodeY, nodeW, h - 136, c, { rx: 14, fill: c.surface, stroke: c.border, sw: 1.5 })}
${text(nx + 22, nodeY + 48, 23, c.ink, [item.label], "700")}
${item.note ? text(nx + 22, nodeY + 92, 17, c.secondary, splitByWidth(item.note, nodeW - 44, 17, 3), "400", 24) : ""}
${index < items.length - 1 ? `<line x1="${nx + nodeW + 4}" y1="${nodeY + 88}" x2="${nx + nodeW + gap - 8}" y2="${nodeY + 88}" stroke="${c.accent}" stroke-width="3" marker-end="url(#arrow)"/>` : ""}`;
  });
  return body;
}

function renderExpressionTitle(brief, c, width) {
  return `${text(92, 104, 50, c.ink, [brief.title], "700")}
${brief.subtitle ? text(94, 146, 23, c.secondary, [brief.subtitle]) : ""}`;
}

function renderDashboardExpression(brief, c) {
  const width = 2200;
  const height = 1320;
  const statement = firstExpressionBlock(brief, "statement");
  const metrics = expressionBlocks(brief, "metric-card").slice(0, 4);
  const progress = firstExpressionBlock(brief, "progress-bar");
  const ranked = firstExpressionBlock(brief, "ranked-bar");
  const risks = firstExpressionBlock(brief, "risk-list");
  const actions = firstExpressionBlock(brief, "action-list");
  const evidence = firstExpressionBlock(brief, "evidence-list");
  const metricGap = 24;
  const metricW = Math.floor((2016 - metricGap * (metrics.length - 1)) / metrics.length);
  return wrap(width, height, c, `
${renderExpressionTitle(brief, c, width)}
${renderExpressionStatement(92, 206, 2016, 150, c, statement)}
${metrics.map((block, index) => renderMetricTile(92 + index * (metricW + metricGap), 412, metricW, 190, c, block)).join("\n")}
${renderProgressBlock(92, 652, 640, 292, c, progress)}
${ranked ? renderRankedBlock(772, 652, 640, 292, c, ranked) : renderListBlock(772, 652, 640, 292, c, evidence, { columns: 1, itemH: 48 })}
${renderListBlock(1452, 652, 656, 292, c, risks, { columns: 2, itemH: 44, emphasis: true, tone: c.exprRisk })}
${renderListBlock(92, 990, 2016, 220, c, actions, { columns: 4, itemH: 54 })}
${brief.footer ? text(92, 1264, 22, c.secondary, [brief.footer]) : ""}`);
}

function renderNarrativeExpression(brief, c) {
  const width = 2200;
  const height = 1320;
  const statement = firstExpressionBlock(brief, "statement");
  const chain = firstExpressionBlock(brief, "narrative-chain");
  const evidence = firstExpressionBlock(brief, "evidence-list");
  const risks = firstExpressionBlock(brief, "risk-list");
  const actions = firstExpressionBlock(brief, "action-list");
  return wrap(width, height, c, `
${renderExpressionTitle(brief, c, width)}
${renderExpressionStatement(92, 206, 2016, 150, c, statement)}
${renderNarrativeChainBlock(92, 416, 2016, 350, c, chain)}
${renderListBlock(92, 830, 650, 300, c, evidence, { columns: 1, itemH: 54 })}
${risks ? renderListBlock(776, 830, 650, 300, c, risks, { columns: 1, itemH: 54, emphasis: true, tone: c.exprRisk }) : ""}
${renderListBlock(1460, 830, 648, 300, c, actions, { columns: 1, itemH: 54 })}
${brief.footer ? text(92, 1216, 22, c.secondary, [brief.footer]) : ""}`);
}

function renderModularExpression(brief, c) {
  const width = 2200;
  const height = 1320;
  const statement = firstExpressionBlock(brief, "statement");
  const metrics = expressionBlocks(brief, "metric-card").slice(0, 3);
  const progress = firstExpressionBlock(brief, "progress-bar");
  const ranked = firstExpressionBlock(brief, "ranked-bar");
  const evidence = firstExpressionBlock(brief, "evidence-list");
  const risks = firstExpressionBlock(brief, "risk-list");
  const actions = firstExpressionBlock(brief, "action-list");
  const roadmap = firstExpressionBlock(brief, "mini-roadmap");
  const metricAreaX = 1460;
  const metricAreaW = 648;
  const metricGap = 22;
  const metricW = metrics.length > 0 ? Math.floor((metricAreaW - metricGap * (metrics.length - 1)) / metrics.length) : 0;
  return wrap(width, height, c, `
${renderExpressionTitle(brief, c, width)}
${renderExpressionStatement(92, 206, 1320, 180, c, statement)}
${metrics.map((block, index) => renderMetricTile(metricAreaX + index * (metricW + metricGap), 206, metricW, 180, c, block)).join("\n")}
${renderNarrativeChainBlock(92, 446, 920, 330, c, roadmap || progress)}
${progress ? renderProgressBlock(1052, 446, 540, 330, c, progress) : renderListBlock(1052, 446, 540, 330, c, evidence, { columns: 1, itemH: 54 })}
${risks ? renderListBlock(1632, 446, 476, 330, c, risks, { columns: 1, itemH: 54, emphasis: true, tone: c.exprRisk }) : ""}
${ranked ? renderRankedBlock(92, 836, 650, 300, c, ranked) : renderListBlock(92, 836, 650, 300, c, evidence, { columns: 1, itemH: 54 })}
${evidence ? renderListBlock(776, 836, 650, 300, c, evidence, { columns: 1, itemH: 54 }) : ""}
${actions ? renderListBlock(1460, 836, 648, 300, c, actions, { columns: 1, itemH: 54 }) : ""}
${brief.footer ? text(92, 1216, 22, c.secondary, [brief.footer]) : ""}`);
}

function renderExpressionCanvas(brief, c) {
  if (brief.expressionMode === "dashboard-onepage") return renderDashboardExpression(brief, c);
  if (brief.expressionMode === "narrative-map") return renderNarrativeExpression(brief, c);
  if (brief.expressionMode === "modular-canvas") return renderModularExpression(brief, c);
  throw new Error(`unsupported expressionMode: ${brief.expressionMode}`);
}

function render(brief) {
  const c = styles[brief.style];
  if (!c) throw new Error(`unsupported style: ${brief.style}`);
  if (brief.layout === "expression-canvas") return renderExpressionCanvas(brief, c);
  if (brief.layout === "large-canvas") return renderLargeCanvas(brief, c);
  if (brief.layout === "conclusion-first") return renderConclusionFirst(brief, c);
  if (brief.layout === "problem-breakdown") return renderProblemBreakdown(brief, c);
  if (brief.layout === "roadmap") return renderRoadmap(brief, c);
  if (brief.layout === "process-chain") return renderProcessChain(brief, c);
  if (brief.layout === "comparison-matrix") return renderComparisonMatrix(brief, c);
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
