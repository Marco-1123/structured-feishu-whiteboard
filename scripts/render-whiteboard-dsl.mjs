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
    dark: "#F8FAFC",
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
  },
  "linear-command": {
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
  },
  "apple-studio": {
    canvas: "#F5F5F7",
    surface: "#FFFFFF",
    muted: "#F2F2F7",
    ink: "#1D1D1F",
    secondary: "#6E6E73",
    border: "#D2D2D7",
    accent: "#007AFF",
    soft: "#E8F2FF",
    success: "#248A3D",
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--output") args.output = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!args.input || !args.output) throw new Error("usage: node scripts/render-whiteboard-dsl.mjs --input brief.json --output diagram.json");
  return args;
}

function splitText(value, maxChars, maxLines) {
  const clean = String(value ?? "").trim();
  if (!clean) return [];
  const lines = [];
  let rest = clean;
  while (rest && lines.length < maxLines) {
    if (rest.length <= maxChars) {
      lines.push(rest);
      break;
    }
    const slice = rest.slice(0, maxChars + 1);
    let cut = -1;
    const match = slice.match(/[，。；、,.]\s*/g);
    if (match) {
      const last = [...slice.matchAll(/[，。；、,.]\s*/g)].pop();
      if (last && last.index >= Math.floor(maxChars * 0.55)) cut = last.index + last[0].length;
    }
    if (cut <= 0) cut = maxChars;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return lines;
}

function parsePercent(value, fallback) {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return fallback;
  return Math.max(1, Math.min(100, Number(match[1])));
}

function parseSignedNumber(value, fallback) {
  const match = String(value ?? "").replace(/,/g, "").match(/[+-]?\d+(?:\.\d+)?/);
  if (!match) return fallback;
  return Number(match[0]);
}

function statusColor(status, c) {
  if (status === "risk") return "#C2410C";
  if (status === "good") return c.success;
  return c.accent;
}

function textNode({ x, y, width, text, size = 18, color, bold = false, align = "left" }) {
  return {
    type: "text",
    x,
    y,
    width,
    height: "fit-content",
    text: [{ content: text, bold, fontSize: size }],
    textColor: color,
    textAlign: align,
  };
}

function rectNode({ x, y, width, height, fillColor, borderColor, borderWidth = 1.5, borderRadius = 14, text, textColor, fontSize = 18, bold = false }) {
  const node = {
    type: "rect",
    x,
    y,
    width,
    height,
    fillColor,
    borderColor,
    borderWidth,
    borderRadius,
  };
  if (text) {
    node.text = [{ content: text, bold, fontSize }];
    node.textColor = textColor;
    node.textAlign = "center";
    node.verticalAlign = "middle";
  }
  return node;
}

function trapezoidNode({ x, y, width, topWidth, height, fillColor, borderColor, text, textColor, fontSize = 22, bold = true, vFlip = false }) {
  const node = {
    type: topWidth <= 0 ? "triangle" : "trapezoid",
    x,
    y,
    width,
    topWidth: Math.max(0, topWidth),
    height,
    vFlip,
    fillColor,
    borderColor,
    borderWidth: 1.5,
  };
  if (text) {
    node.text = [{ content: text, bold, fontSize }];
    node.textColor = textColor;
    node.textAlign = "center";
    node.verticalAlign = "middle";
  }
  return node;
}

function connector(from, to, c, width = 2, endArrow = "none") {
  return {
    type: "connector",
    connector: {
      from,
      to,
      lineShape: "straight",
      lineWidth: width,
      lineColor: c.border,
      startArrow: "none",
      endArrow,
    },
  };
}

function base(width, height, c, nodes) {
  return {
    version: 2,
    nodes: [
      rectNode({ x: 0, y: 0, width, height, fillColor: c.canvas, borderColor: c.canvas, borderWidth: 0, borderRadius: 0 }),
      ...nodes,
    ],
  };
}

function renderTitle(brief, c, width) {
  return [
    textNode({ x: 88, y: 72, width: width - 176, text: brief.title, size: 44, color: c.ink, bold: true }),
    ...(brief.subtitle ? [textNode({ x: 90, y: 142, width: width - 180, text: brief.subtitle, size: 22, color: c.secondary })] : []),
  ];
}

function renderFooter(brief, c, y, width) {
  if (!brief.footer) return [];
  return [
    rectNode({ x: 88, y, width: width - 176, height: 92, fillColor: c.surface, borderColor: c.border, borderRadius: 16 }),
    rectNode({ x: 88, y, width: 12, height: 92, fillColor: c.dark || c.accent, borderColor: c.dark || c.accent, borderRadius: 6 }),
    textNode({ x: 122, y: y + 27, width: width - 244, text: splitText(brief.footer, 44, 2).join("\n"), size: 22, color: c.ink, bold: true }),
  ];
}

function renderMilestoneTimeline(brief, c) {
  const width = 1680;
  const height = 980;
  const items = brief.timeline;
  const nodes = [...renderTitle(brief, c, width)];

  nodes.push(
    rectNode({ x: 88, y: 190, width: width - 176, height: 118, fillColor: c.surface, borderColor: c.border, borderRadius: 16 }),
    rectNode({ x: 88, y: 190, width: 12, height: 118, fillColor: c.dark || c.accent, borderColor: c.dark || c.accent, borderRadius: 6 }),
    textNode({ x: 124, y: 222, width: width - 248, text: splitText(brief.summary, 54, 2).join("\n"), size: 26, color: c.ink, bold: true })
  );

  const axisY = 468;
  nodes.push(connector({ x: 180, y: axisY }, { x: width - 210, y: axisY }, c, 4, "arrow"));
  const slot = (width - 390) / items.length;
  const cardW = Math.min(280, slot - 28);
  items.forEach((item, index) => {
    const cx = 180 + slot * index + slot / 2;
    const cardY = 545;
    nodes.push(
      rectNode({ x: cx - 44, y: axisY - 44, width: 88, height: 44, fillColor: c.soft, borderColor: c.border, borderRadius: 10, text: item.date, textColor: c.accent, fontSize: 18, bold: true }),
      connector({ x: cx, y: axisY + 8 }, { x: cx, y: cardY }, c, 2, "none"),
      rectNode({ x: cx - cardW / 2, y: cardY, width: cardW, height: 154, fillColor: c.surface, borderColor: c.border, borderRadius: 16 }),
      textNode({ x: cx - cardW / 2 + 24, y: cardY + 30, width: cardW - 48, text: item.title, size: 23, color: c.ink, bold: true, align: "center" }),
      textNode({ x: cx - cardW / 2 + 24, y: cardY + 78, width: cardW - 48, text: splitText(item.body, 18, 2).join("\n"), size: 18, color: c.secondary, align: "center" })
    );
  });

  nodes.push(...renderFooter(brief, c, 830, width));
  return base(width, height, c, nodes);
}

function renderFunnel(brief, c) {
  const width = 1680;
  const height = 1040;
  const stages = brief.funnelStages;
  const nodes = [...renderTitle(brief, c, width)];
  nodes.push(
    textNode({ x: 92, y: 204, width: 760, text: splitText(brief.summary, 36, 2).join("\n"), size: 24, color: c.secondary })
  );

  const funnelX = 210;
  const funnelY = 320;
  const layerH = 96;
  const gap = 8;
  const maxW = 720;
  const minW = 240;
  const values = stages.map((stage, index) => parsePercent(stage.value, Math.max(15, 100 - index * 20)));
  const maxValue = Math.max(...values, 1);
  stages.forEach((stage, index) => {
    const ratio = values[index] / maxValue;
    const layerW = Math.max(minW, Math.round(minW + (maxW - minW) * ratio));
    const nextRatio = index < stages.length - 1 ? values[index + 1] / maxValue : ratio * 0.6;
    const bottomW = Math.max(120, Math.round(minW + (maxW - minW) * nextRatio));
    const x = funnelX + (maxW - layerW) / 2;
    const y = funnelY + index * (layerH + gap);
    nodes.push(
      trapezoidNode({
        x,
        y,
        width: layerW,
        topWidth: bottomW,
        height: layerH,
        fillColor: c.soft,
        borderColor: index === 0 ? c.accent : c.border,
        text: `${stage.label} ${stage.value}`,
        textColor: c.ink,
        fontSize: 24,
        bold: true,
        vFlip: false,
      }),
      rectNode({ x: 1010, y: y + 6, width: 420, height: 84, fillColor: c.surface, borderColor: c.border, borderRadius: 14 }),
      textNode({ x: 1036, y: y + 28, width: 368, text: stage.note || stage.label, size: 20, color: c.secondary, align: "center" }),
      connector({ x: x + layerW + 28, y: y + layerH / 2 }, { x: 1010, y: y + layerH / 2 }, c, 2, "none")
    );
  });

  nodes.push(...renderFooter(brief, c, 880, width));
  return base(width, height, c, nodes);
}

function renderMetricDashboard(brief, c) {
  const width = 1680;
  const height = 1040;
  const metrics = brief.metricCards;
  const bars = brief.progressBars || [];
  const nodes = [...renderTitle(brief, c, width)];
  nodes.push(textNode({ x: 92, y: 204, width: 900, text: splitText(brief.summary, 40, 2).join("\n"), size: 24, color: c.secondary }));

  const cardY = 304;
  const cardGap = 24;
  const cardW = (width - 176 - cardGap * (metrics.length - 1)) / metrics.length;
  metrics.forEach((metric, index) => {
    const x = 88 + index * (cardW + cardGap);
    const accent = statusColor(metric.status, c);
    nodes.push(
      rectNode({ x, y: cardY, width: cardW, height: 172, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
      textNode({ x: x + 28, y: cardY + 28, width: cardW - 56, text: metric.label, size: 20, color: c.secondary }),
      textNode({ x: x + 28, y: cardY + 72, width: cardW - 56, text: metric.value, size: 40, color: c.ink, bold: true }),
      ...(metric.delta ? [textNode({ x: x + 28, y: cardY + 120, width: cardW - 56, text: metric.delta, size: 18, color: accent, bold: true })] : []),
      ...(metric.note ? [textNode({ x: x + 28, y: cardY + 146, width: cardW - 56, text: metric.note, size: 15, color: c.secondary })] : [])
    );
  });

  nodes.push(
    rectNode({ x: 88, y: 540, width: 690, height: 310, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
    textNode({ x: 122, y: 576, width: 610, text: "进度条", size: 26, color: c.ink, bold: true }),
    textNode({ x: 122, y: 620, width: 610, text: "适合表达目标完成度、覆盖率、迁移比例和风险收敛。", size: 18, color: c.secondary })
  );
  bars.slice(0, 4).forEach((bar, index) => {
    const y = 675 + index * 48;
    const pct = parsePercent(bar.value, 50);
    const filledW = Math.max(18, Math.round(330 * pct / 100));
    const remainingW = Math.max(0, 330 - filledW);
    nodes.push(
      textNode({ x: 122, y: y - 4, width: 180, text: bar.label, size: 18, color: c.ink, bold: true }),
      rectNode({ x: 318, y, width: filledW, height: 18, fillColor: c.accent, borderColor: c.accent, borderRadius: 9 }),
      ...(remainingW > 0 ? [rectNode({ x: 318 + filledW + 4, y, width: Math.max(0, remainingW - 4), height: 18, fillColor: c.muted, borderColor: c.muted, borderRadius: 9 })] : []),
      textNode({ x: 668, y: y - 7, width: 70, text: bar.value, size: 18, color: c.secondary, align: "right" }),
      ...(bar.note ? [textNode({ x: 122, y: y + 22, width: 560, text: bar.note, size: 15, color: c.secondary })] : [])
    );
  });

  nodes.push(
    rectNode({ x: 820, y: 540, width: 772, height: 310, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
    textNode({ x: 854, y: 576, width: 690, text: "数据解读", size: 26, color: c.ink, bold: true }),
    textNode({ x: 854, y: 630, width: 660, text: splitText(brief.insight || "先看核心指标，再看进度差距，最后定位需要行动的风险项。", 30, 3).join("\n"), size: 22, color: c.secondary })
  );
  nodes.push(...renderFooter(brief, c, 900, width));
  return base(width, height, c, nodes);
}

function renderProgressWall(brief, c) {
  const width = 1680;
  const height = 1100;
  const bars = brief.progressBars;
  const nodes = [...renderTitle(brief, c, width)];
  nodes.push(
    rectNode({ x: 88, y: 200, width: width - 176, height: 116, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
    rectNode({ x: 88, y: 200, width: 12, height: 116, fillColor: c.dark || c.accent, borderColor: c.dark || c.accent, borderRadius: 6 }),
    textNode({ x: 124, y: 232, width: width - 248, text: splitText(brief.summary, 54, 2).join("\n"), size: 25, color: c.ink, bold: true })
  );

  const panelX = 88;
  const panelY = 370;
  const panelW = width - 176;
  const rowH = 92;
  nodes.push(
    rectNode({ x: panelX, y: panelY, width: panelW, height: 500, fillColor: c.surface, borderColor: c.border, borderRadius: 20 }),
    textNode({ x: panelX + 36, y: panelY + 30, width: 420, text: "目标完成度", size: 28, color: c.ink, bold: true }),
    textNode({ x: panelX + 36, y: panelY + 75, width: 720, text: "用同一比例尺展示进展，避免把完成度写成普通文字。", size: 18, color: c.secondary })
  );

  bars.slice(0, 4).forEach((bar, index) => {
    const y = panelY + 132 + index * rowH;
    const pct = parsePercent(bar.value, 50);
    const trackX = panelX + 330;
    const trackY = y + 16;
    const trackW = 790;
    const fillW = Math.round(trackW * pct / 100);
    const remainW = trackW - fillW;
    nodes.push(
      textNode({ x: panelX + 36, y, width: 220, text: bar.label, size: 23, color: c.ink, bold: true }),
      ...(bar.note ? [textNode({ x: panelX + 36, y: y + 36, width: 230, text: splitText(bar.note, 14, 2).join("\n"), size: 16, color: c.secondary })] : []),
      rectNode({ x: trackX, y: trackY, width: Math.max(18, fillW), height: 24, fillColor: c.accent, borderColor: c.accent, borderRadius: 12 }),
      ...(remainW > 8 ? [rectNode({ x: trackX + fillW + 6, y: trackY, width: Math.max(0, remainW - 6), height: 24, fillColor: c.muted, borderColor: c.muted, borderRadius: 12 })] : []),
      textNode({ x: trackX + trackW + 38, y: trackY - 8, width: 120, text: bar.value, size: 26, color: c.ink, bold: true }),
      textNode({ x: trackX + trackW + 170, y: trackY - 2, width: 220, text: pct >= 70 ? "进展健康" : pct >= 45 ? "需要推进" : "需重点加速", size: 18, color: pct >= 70 ? c.success : pct >= 45 ? c.secondary : "#C2410C", bold: true })
    );
  });

  nodes.push(...renderFooter(brief, c, 944, width));
  return base(width, height, c, nodes);
}

function renderRankedBars(brief, c) {
  const width = 1680;
  const height = 1040;
  const bars = [...brief.rankedBars];
  const values = bars.map((bar, index) => parsePercent(bar.value, Math.max(10, 90 - index * 12)));
  const maxValue = Math.max(...values, 1);
  const nodes = [...renderTitle(brief, c, width)];
  nodes.push(
    rectNode({ x: 88, y: 200, width: width - 176, height: 116, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
    rectNode({ x: 88, y: 200, width: 12, height: 116, fillColor: c.dark || c.accent, borderColor: c.dark || c.accent, borderRadius: 6 }),
    textNode({ x: 124, y: 232, width: width - 248, text: splitText(brief.summary, 54, 2).join("\n"), size: 25, color: c.ink, bold: true })
  );

  const panelX = 88;
  const panelY = 370;
  const panelW = width - 176;
  const rowH = 86;
  nodes.push(
    rectNode({ x: panelX, y: panelY, width: panelW, height: 500, fillColor: c.surface, borderColor: c.border, borderRadius: 20 }),
    textNode({ x: panelX + 36, y: panelY + 30, width: 460, text: "贡献排序", size: 28, color: c.ink, bold: true }),
    textNode({ x: panelX + 36, y: panelY + 75, width: 720, text: "按占比或贡献度排序，先看主因，再看解释。", size: 18, color: c.secondary })
  );

  bars.slice(0, 6).forEach((bar, index) => {
    const y = panelY + 136 + index * rowH;
    const value = values[index];
    const barX = panelX + 300;
    const barW = Math.round(800 * value / maxValue);
    const remainW = 800 - barW;
    const accent = statusColor(bar.status, c);
    nodes.push(
      rectNode({ x: panelX + 36, y: y + 2, width: 54, height: 34, fillColor: c.soft, borderColor: c.border, borderRadius: 8, text: String(index + 1).padStart(2, "0"), textColor: c.accent, fontSize: 16, bold: true }),
      textNode({ x: panelX + 108, y, width: 160, text: bar.label, size: 22, color: c.ink, bold: true }),
      rectNode({ x: barX, y: y + 8, width: Math.max(22, barW), height: 26, fillColor: accent, borderColor: accent, borderRadius: 13 }),
      ...(remainW > 8 ? [rectNode({ x: barX + barW + 6, y: y + 8, width: Math.max(0, remainW - 6), height: 26, fillColor: c.muted, borderColor: c.muted, borderRadius: 13 })] : []),
      textNode({ x: barX + 828, y: y + 1, width: 92, text: bar.value, size: 24, color: c.ink, bold: true }),
      ...(bar.note ? [textNode({ x: barX + 946, y: y + 5, width: 250, text: splitText(bar.note, 18, 2).join("\n"), size: 16, color: c.secondary })] : [])
    );
  });

  nodes.push(...renderFooter(brief, c, 900, width));
  return base(width, height, c, nodes);
}

function renderVarianceBridge(brief, c) {
  const width = 1680;
  const height = 1040;
  const steps = brief.bridgeSteps;
  const nodes = [...renderTitle(brief, c, width)];
  nodes.push(
    rectNode({ x: 88, y: 200, width: width - 176, height: 116, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
    rectNode({ x: 88, y: 200, width: 12, height: 116, fillColor: c.dark || c.accent, borderColor: c.dark || c.accent, borderRadius: 6 }),
    textNode({ x: 124, y: 232, width: width - 248, text: splitText(brief.summary, 54, 2).join("\n"), size: 25, color: c.ink, bold: true })
  );

  const panelX = 88;
  const panelY = 370;
  const panelW = width - 176;
  const panelH = 500;
  const stepGap = 28;
  const stepW = (panelW - 84 - stepGap * (steps.length - 1)) / steps.length;
  const labelY = panelY + 130;
  const labelH = 118;
  const arrowY = labelY + labelH / 2;
  const axisY = panelY + 400;
  const maxBarH = 148;
  const deltaValues = steps
    .filter((step) => step.type === "increase" || step.type === "decrease")
    .map((step) => Math.abs(parseSignedNumber(step.value, 0)));
  const maxDelta = Math.max(...deltaValues, 1);
  const unit = String(steps.find((step) => step.type === "start")?.value ?? "")
    .replace(/[+\-\d,.]/g, "")
    .trim();
  let runningTotal = null;
  nodes.push(
    rectNode({ x: panelX, y: panelY, width: panelW, height: panelH, fillColor: c.surface, borderColor: c.border, borderRadius: 20 }),
    textNode({ x: panelX + 36, y: panelY + 30, width: 460, text: "变化归因桥", size: 28, color: c.ink, bold: true }),
    textNode({ x: panelX + 36, y: panelY + 75, width: 820, text: "起点、增减项和终点使用同一基线，幅度条表达变化大小。", size: 18, color: c.secondary }),
    rectNode({ x: panelX + 42, y: axisY, width: panelW - 84, height: 2, fillColor: c.border, borderColor: c.border, borderRadius: 1 })
  );

  steps.forEach((step, index) => {
    const x = panelX + 42 + index * (stepW + stepGap);
    const isDecrease = step.type === "decrease";
    const isIncrease = step.type === "increase";
    const isEndpoint = step.type === "start" || step.type === "end";
    const fillColor = isEndpoint ? c.soft : isIncrease ? "#E7F6EE" : isDecrease ? "#FFF1E6" : c.muted;
    const borderColor = isEndpoint ? c.accent : isIncrease ? c.success : isDecrease ? "#F59E0B" : c.border;
    const barColor = isEndpoint ? c.accent : isIncrease ? c.success : isDecrease ? "#F59E0B" : c.accent;
    const rawValue = parseSignedNumber(step.value, 0);
    if (step.type === "start") runningTotal = rawValue;
    else if (isIncrease || isDecrease) runningTotal = (runningTotal ?? 0) + rawValue;
    else if (step.type === "end") runningTotal = rawValue;
    const barH = isEndpoint ? maxBarH : Math.max(26, Math.round(maxBarH * Math.abs(rawValue) / maxDelta));
    const barW = isEndpoint ? stepW * 0.56 : stepW * 0.42;
    const barX = x + (stepW - barW) / 2;
    const barY = axisY - barH;
    const runningLabel = runningTotal === null ? "" : `${index === 0 ? "起点" : step.type === "end" ? "终点" : "累计"} ${Math.round(runningTotal)}${unit}`;
    nodes.push(
      ...(index < steps.length - 1 ? [connector({ x: x + stepW + 8, y: arrowY }, { x: x + stepW + stepGap - 8, y: arrowY }, c, 2, "arrow")] : []),
      rectNode({ x, y: labelY, width: stepW, height: labelH, fillColor, borderColor, borderWidth: 1.7, borderRadius: 14 }),
      textNode({ x: x + 18, y: labelY + 18, width: stepW - 36, text: step.value, size: isEndpoint ? 32 : 30, color: c.ink, bold: true, align: "center" }),
      textNode({ x: x + 18, y: labelY + 64, width: stepW - 36, text: step.label, size: 19, color: c.ink, bold: true, align: "center" }),
      ...(step.note ? [textNode({ x: x + 20, y: labelY + 92, width: stepW - 40, text: splitText(step.note, 12, 1).join("\n"), size: 14, color: c.secondary, align: "center" })] : []),
      rectNode({ x: barX, y: barY, width: barW, height: barH, fillColor: barColor, borderColor: barColor, borderWidth: 1.6, borderRadius: 12 }),
      textNode({ x: x + 8, y: axisY + 22, width: stepW - 16, text: runningLabel, size: 15, color: c.secondary, align: "center" })
    );
  });

  nodes.push(...renderFooter(brief, c, 900, width));
  return base(width, height, c, nodes);
}

function renderPyramid(brief, c) {
  const width = 1680;
  const height = 1040;
  const layers = [...brief.layers];
  const nodes = [...renderTitle(brief, c, width)];
  nodes.push(textNode({ x: 92, y: 184, width: 900, text: splitText(brief.summary, 42, 2).join("\n"), size: 24, color: c.secondary }));

  const centerX = 690;
  const topY = 302;
  const layerH = 96;
  const gap = 8;
  const minTopW = 220;
  const step = 142;
  layers.forEach((layer, index) => {
    const topW = minTopW + index * step;
    const w = topW + step;
    const x = centerX - w / 2;
    const y = topY + index * (layerH + gap);
    const isTop = index === 0;
    nodes.push(
      trapezoidNode({
        x,
        y,
        width: w,
        topWidth: topW,
        height: layerH,
        fillColor: isTop ? c.soft : c.surface,
        borderColor: isTop ? c.accent : c.border,
      }),
      textNode({ x: x + 34, y: y + 24, width: w - 68, text: layer.title, size: 24, color: c.ink, bold: true, align: "center" }),
      ...(layer.body ? [textNode({ x: x + 40, y: y + 58, width: w - 80, text: layer.body, size: 17, color: c.secondary, align: "center" })] : [])
    );
  });

  nodes.push(
    rectNode({ x: 1110, y: 320, width: 390, height: 328, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
    textNode({ x: 1142, y: 356, width: 326, text: "为什么不用普通卡片", size: 24, color: c.ink, bold: true }),
    textNode({ x: 1142, y: 414, width: 326, text: "层级关系不是并列关系。金字塔把“上层目标”和“底层支撑”放在同一个视觉系统里，读者更容易理解承接关系。", size: 19, color: c.secondary })
  );
  nodes.push(...renderFooter(brief, c, 880, width));
  return base(width, height, c, nodes);
}

function render(brief) {
  const c = styles[brief.style] || styles["professional-blue"];
  if (brief.layout === "milestone-timeline") return renderMilestoneTimeline(brief, c);
  if (brief.layout === "funnel") return renderFunnel(brief, c);
  if (brief.layout === "metric-dashboard") return renderMetricDashboard(brief, c);
  if (brief.layout === "progress-wall") return renderProgressWall(brief, c);
  if (brief.layout === "ranked-bars") return renderRankedBars(brief, c);
  if (brief.layout === "variance-bridge") return renderVarianceBridge(brief, c);
  if (brief.layout === "pyramid") return renderPyramid(brief, c);
  throw new Error(`unsupported DSL layout: ${brief.layout}`);
}

try {
  const args = parseArgs(process.argv);
  const brief = JSON.parse(fs.readFileSync(args.input, "utf8"));
  fs.writeFileSync(args.output, `${JSON.stringify(render(brief), null, 2)}\n`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
