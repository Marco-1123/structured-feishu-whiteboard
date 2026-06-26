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
    const accent = metric.status === "risk" ? "#C2410C" : metric.status === "good" ? c.success : c.accent;
    nodes.push(
      rectNode({ x, y: cardY, width: cardW, height: 172, fillColor: c.surface, borderColor: c.border, borderRadius: 18 }),
      textNode({ x: x + 28, y: cardY + 28, width: cardW - 56, text: metric.label, size: 20, color: c.secondary }),
      textNode({ x: x + 28, y: cardY + 72, width: cardW - 56, text: metric.value, size: 40, color: c.ink, bold: true }),
      ...(metric.delta ? [textNode({ x: x + 28, y: cardY + 126, width: cardW - 56, text: metric.delta, size: 18, color: accent, bold: true })] : [])
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
      textNode({ x: 668, y: y - 7, width: 70, text: bar.value, size: 18, color: c.secondary, align: "right" })
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
