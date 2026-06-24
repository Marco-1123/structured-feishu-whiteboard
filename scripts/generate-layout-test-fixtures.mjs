import fs from "node:fs";
import path from "node:path";

const outDir = path.join("examples", "layout-tests");
fs.mkdirSync(outDir, { recursive: true });

const styles = {
  blue: {
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
  dark: {
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
  warm: {
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

const marker = (c) => `<defs>
  <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
    <path d="M0 0 L10 4 L0 8 z" fill="${c.accent}"/>
  </marker>
</defs>`;

const text = (x, y, size, fill, lines, weight = "400", gap = Math.round(size * 1.45)) => {
  const body = lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : gap}">${line}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${body}</text>`;
};

const card = (x, y, w, h, c) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>`;

const label = (x, y, w, c, content, fill = c.accent) => `
  <rect x="${x}" y="${y}" width="${w}" height="34" rx="8" fill="${c.muted}" stroke="${c.border}" stroke-width="1.5"/>
  ${text(x + 18, y + 24, 17, fill, [content], "700", 24)}`;

function wrap(width, height, c, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${marker(c)}
<rect x="0" y="0" width="${width}" height="${height}" fill="${c.canvas}"/>
${body}
</svg>
`;
}

const fixtures = [
  {
    file: "01-conclusion-blue.svg",
    layout: "结论先行",
    style: "专业蓝白",
    expected: "材料有明确推荐判断，自动选择结论先行；默认选择专业蓝白。",
    svg: (() => {
      const c = styles.blue;
      const modules = [
        ["市场机会", ["中小团队需要更低", "成本的合规工具。"], "需求明确"],
        ["产品切口", ["先做合同审查与", "风险提示两个场景。"], "聚焦高频"],
        ["商业路径", ["从免费试用进入", "团队版订阅。"], "轻量转化"],
      ];
      return wrap(1600, 1040, c, `
${card(72, 60, 1456, 150, c)}
<rect x="72" y="60" width="12" height="150" rx="6" fill="${c.accent}"/>
${text(112, 124, 50, c.ink, ["合同审查工具：先从高频低风险场景切入"], "700")}
${text(112, 176, 26, c.secondary, ["用标准化风险提示降低初次采用门槛，再逐步扩展到团队协作。"])}

<rect x="72" y="252" width="1456" height="170" rx="14" fill="${c.soft}" stroke="${c.accent}" stroke-width="2"/>
${text(112, 306, 20, c.accent, ["核心结论"], "700")}
${text(112, 354, 34, c.ink, ["第一阶段不做全流程法务系统，而是做“合同上传后 3 分钟内给出风险摘要”的单点产品。"], "700")}

${modules
  .map((m, i) => {
    const x = 72 + i * 500;
    return `${card(x, 474, 456, 292, c)}
${text(x + 36, 542, 28, c.ink, [m[0]], "700")}
${text(x + 36, 598, 22, c.secondary, m[1])}
${label(x + 36, 700, 136, c, m[2])}`;
  })
  .join("\\n")}

<rect x="72" y="824" width="1456" height="130" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
${text(112, 878, 28, c.ink, ["下一步：用 20 份真实合同验证风险标签的准确性和用户信任门槛"], "700")}
${text(112, 922, 20, c.secondary, ["版式：结论先行 ｜ 风格：专业蓝白 ｜ 信息压缩：主结论 + 3 个支撑模块"])}
`);
    })(),
  },
  {
    file: "02-problem-dark.svg",
    layout: "问题拆解",
    style: "深色强调",
    expected: "材料围绕问题、原因、影响和治理动作，自动选择问题拆解；战略诊断感适合深色强调。",
    svg: (() => {
      const c = styles.dark;
      const items = [
        ["目标漂移", ["需求入口过多，", "优先级反复变化。"], "治理：统一入口"],
        ["数据割裂", ["漏斗、客服、销售", "口径彼此不一致。"], "治理：指标字典"],
        ["反馈滞后", ["上线后两周才发现", "转化异常。"], "治理：日监控"],
      ];
      return wrap(1600, 1000, c, `
${text(72, 110, 52, c.ink, ["增长项目转化下滑诊断"], "700")}
${text(72, 158, 24, c.secondary, ["问题不是单个页面表现差，而是目标、数据和反馈机制没有形成闭环。"])}
<rect x="72" y="220" width="1456" height="152" rx="18" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
${text(116, 282, 22, c.accent, ["核心问题"], "700")}
${text(116, 330, 34, c.ink, ["增长团队在执行很快，但学习速度慢于问题变化速度。"], "700")}

${items
  .map((m, i) => {
    const x = 72 + i * 500;
    return `${card(x, 430, 456, 320, c)}
${text(x + 36, 504, 30, c.ink, [m[0]], "700")}
${text(x + 36, 564, 22, c.secondary, m[1])}
${label(x + 36, 688, 160, c, m[2], c.success)}`;
  })
  .join("\\n")}

<rect x="72" y="810" width="1456" height="108" rx="18" fill="${c.muted}" stroke="${c.border}" stroke-width="2"/>
${text(112, 872, 27, c.ink, ["判断：先补齐问题闭环，再扩大投放预算。"], "700")}
`);
    })(),
  },
  {
    file: "03-matrix-warm.svg",
    layout: "对比矩阵",
    style: "暖灰编辑",
    expected: "材料有多个方案和评价维度，自动选择对比矩阵；研究总结感适合暖灰编辑。",
    svg: (() => {
      const c = styles.warm;
      const rows = [
        ["自建系统", "高", "长", "强", "适合长期核心能力"],
        ["采购 SaaS", "中", "短", "中", "适合快速验证"],
        ["外包定制", "中高", "中", "弱", "适合一次性项目"],
      ];
      return wrap(1600, 980, c, `
${text(72, 112, 52, c.ink, ["三种客服质检方案对比"], "700")}
${text(72, 162, 24, c.secondary, ["用成本、上线周期、可控性和适用场景做选择。"])}
<rect x="72" y="230" width="1456" height="530" rx="12" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
${["方案", "初始成本", "上线周期", "可控性", "结论"]
  .map((h, i) => `<rect x="${72 + i * 292}" y="230" width="292" height="82" fill="${i === 0 ? c.soft : c.muted}" stroke="${c.border}" stroke-width="1.5"/>${text(102 + i * 292, 282, 23, c.ink, [h], "700")}`)
  .join("\\n")}
${rows
  .map((r, ri) =>
    r
      .map((cell, ci) => {
        const y = 312 + ri * 136;
        const fill = ri === 1 && ci === 0 ? c.soft : c.surface;
        const color = ri === 1 && ci === 4 ? c.accent : c.secondary;
        return `<rect x="${72 + ci * 292}" y="${y}" width="292" height="136" fill="${fill}" stroke="${c.border}" stroke-width="1.5"/>${text(102 + ci * 292, y + 78, ci === 0 ? 24 : 21, ci === 0 ? c.ink : color, [cell], ci === 0 || ri === 1 && ci === 4 ? "700" : "400")}`;
      })
      .join("\\n")
  )
  .join("\\n")}
<rect x="72" y="812" width="1456" height="94" rx="12" fill="${c.soft}" stroke="${c.border}" stroke-width="2"/>
${text(112, 870, 27, c.ink, ["推荐：先采购 SaaS 做 8 周试点，保留自建接口和数据沉淀。"], "700")}
`);
    })(),
  },
  {
    file: "04-roadmap-blue.svg",
    layout: "路线图/阶段规划",
    style: "专业蓝白",
    expected: "材料按阶段推进，自动选择路线图；执行计划适合专业蓝白。",
    svg: (() => {
      const c = styles.blue;
      const steps = [
        ["0-2 周", "需求对齐", ["确定指标", "定义用户画像"]],
        ["3-6 周", "原型验证", ["完成核心流程", "访谈 10 个用户"]],
        ["7-10 周", "小流量试点", ["接入真实数据", "监控转化漏斗"]],
        ["11-12 周", "复盘上线", ["沉淀 SOP", "决定是否扩量"]],
      ];
      return wrap(1680, 980, c, `
${text(72, 112, 52, c.ink, ["AI 助手功能 12 周推进路线图"], "700")}
${text(72, 162, 24, c.secondary, ["从需求对齐到试点上线，先验证核心价值，再扩大投入。"])}
<line x1="170" y1="440" x2="1490" y2="440" stroke="${c.border}" stroke-width="8"/>
${steps
  .map((s, i) => {
    const x = 90 + i * 390;
    return `${i < 3 ? `<line x1="${x + 306}" y1="440" x2="${x + 378}" y2="440" stroke="${c.accent}" stroke-width="4" marker-end="url(#arrow)"/>` : ""}
${card(x, 260, 300, 360, c)}
<rect x="${x + 32}" y="300" width="92" height="36" rx="8" fill="${c.soft}" stroke="${c.border}" stroke-width="1.5"/>
${text(x + 50, 325, 17, c.accent, [s[0]], "700")}
${text(x + 32, 386, 29, c.ink, [s[1]], "700")}
${text(x + 32, 450, 21, c.secondary, s[2])}`;
  })
  .join("\\n")}
<rect x="72" y="720" width="1536" height="112" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="2"/>
${text(112, 784, 27, c.ink, ["成功标准：试点用户周活超过 45%，关键任务完成时间降低 30%。"], "700")}
`);
    })(),
  },
  {
    file: "05-flow-dark.svg",
    layout: "流程/价值链",
    style: "深色强调",
    expected: "材料描述输入、处理、输出链路，自动选择流程/价值链；系统链路适合深色强调。",
    svg: (() => {
      const c = styles.dark;
      const nodes = [
        ["用户输入", "需求、文档、上下文"],
        ["结构识别", "主题、角色、约束"],
        ["策略生成", "版式、风格、信息取舍"],
        ["白板写入", "SVG 转可编辑节点"],
        ["质量回看", "预览、溢出、重叠"],
      ];
      return wrap(1680, 960, c, `
${text(72, 112, 52, c.ink, ["结构化飞书画板生成链路"], "700")}
${text(72, 162, 24, c.secondary, ["把原始材料转成可编辑画板，需要理解、设计、转换和检查四类能力协同。"])}
${nodes
  .map((n, i) => {
    const x = 72 + i * 312;
    return `${card(x, 300, 250, 280, c)}
<rect x="${x + 32}" y="338" width="46" height="46" rx="10" fill="${i === 4 ? c.success : c.accent}"/>
${text(x + 47, 369, 23, c.canvas, [String(i + 1)], "700")}
${text(x + 32, 438, 28, c.ink, [n[0]], "700")}
${text(x + 32, 492, 20, c.secondary, [n[1]])}
${i < 4 ? `<line x1="${x + 250}" y1="440" x2="${x + 312}" y2="440" stroke="${c.accent}" stroke-width="4" marker-end="url(#arrow)"/>` : ""}`;
  })
  .join("\\n")}
<rect x="72" y="690" width="1536" height="112" rx="18" fill="${c.muted}" stroke="${c.border}" stroke-width="2"/>
${text(112, 754, 27, c.ink, ["关键控制点：每一步都要保留可编辑性，最终以飞书预览图验证真实效果。"], "700")}
`);
    })(),
  },
];

const manifest = fixtures.map(({ file, layout, style, expected }) => ({ file, layout, style, expected }));
for (const fixture of fixtures) {
  fs.writeFileSync(path.join(outDir, fixture.file), fixture.svg);
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ count: fixtures.length, outDir, manifest }, null, 2));
