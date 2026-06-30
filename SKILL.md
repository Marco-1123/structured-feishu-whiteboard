---
name: structured-feishu-whiteboard
description: >
  Use when the user wants to turn materials, reports, plans, webpages, Feishu docs,
  meeting notes, or free text into a structured, editable Feishu/Lark whiteboard,
  including requests for whiteboard beautification, consulting-style diagrams,
  infographics, roadmaps, matrices, workflows, or visual summaries.
---

# Structured Feishu Whiteboard

把任意材料转成结构清晰、咨询汇报风格的飞书画板。这个 skill 的重点不是装饰文本，而是先完成信息筛选、观点组织、版式选择，再通过确定性渲染器生成可编辑画板。常规报告模板使用 SVG 渲染；V3.2 起，时间线、漏斗、金字塔和指标看板等复杂表达可以使用受控 DSL 渲染。

## 快速判断

使用本 skill 时，按这个顺序工作：

1. **获取内容**：用户可能粘贴文本、给飞书文档、给网页、给本地文件，或要求你自行检索。读取动作可使用对应工具或其他 skill；本 skill 从“已获得的内容”开始负责结构化表达。
2. **判断体量**：读取 [`references/content-budget.md`](references/content-budget.md)，判断材料是短内容、中等内容、长文/报告还是复杂材料。
3. **理解材料**：读取 [`references/report-workflow.md`](references/report-workflow.md)，提炼主题、结论、证据、对象、冲突、时间线和行动项。
4. **长文处理**：中等内容、长文或复杂材料必须读取 [`references/long-form-workflow.md`](references/long-form-workflow.md)；长文还要读取 [`references/large-canvas-workflow.md`](references/large-canvas-workflow.md)，先做信息保全清单和 onepage 区域草稿；不要直接把全文塞进 SVG。
5. **选择版式**：读取 [`references/layout-library.md`](references/layout-library.md)，从生产版式和 V3.2/V3.3 受控表达场景中选择一个主结构；不要自由发明复杂版式。复杂材料如果包含指标、进展、证据、风险和行动等多种关系，再读取 [`references/expression-grammar.md`](references/expression-grammar.md)，判断是否使用 `expression-canvas`。
6. **选择风格**：读取 [`references/style-library.md`](references/style-library.md)，从生产可选风格中选择一个；如果用户指定风格偏好，优先匹配。Apple Studio 和 Linear Command 属于 V3.1 生产候选风格，但新增或改动后的样例必须经过飞书侧预览复核。
7. **稳定渲染**：默认必须读取 [`references/deterministic-rendering.md`](references/deterministic-rendering.md)，先生成 JSON brief，再根据 `renderTarget` 使用 `scripts/render-whiteboard.mjs` 或 `scripts/render-whiteboard-dsl.mjs`；不要自由手写整张 SVG 或 DSL。
8. **生成画板产物**：只有用户明确要求“实验性手写 SVG”或当前仓库缺少渲染器脚本时，才允许读取 [`references/feishu-svg-rules.md`](references/feishu-svg-rules.md) 手写；否则手写 SVG/DSL 视为不合格输出。
9. **检查和修复**：读取 [`references/quality-checklist.md`](references/quality-checklist.md)；发现出框、堆叠、拥挤或乱码时，按 [`references/overflow-repair.md`](references/overflow-repair.md) 修复。
10. **写入飞书**：默认新建飞书文档，插入白板，写入生成结果，返回文档链接和预览图。

## 默认输出

- 一个新建飞书文档链接。
- 文档内包含一块可编辑飞书画板。
- 一张渲染预览图，方便用户不用打开文档也能快速检查。
- 简短说明：使用了什么版式、什么风格、哪些信息被压缩或合并。

不要把用户的原始指令、来源路径、工具过程、风格名解释或“根据某材料整理”等元信息写到画板上。画板上只放最终内容。

## 前置检查

开始写入飞书前，运行：

```bash
bash scripts/preflight.sh
```

如果缺少 `lark-cli`、Node 或白板转换工具，先告诉用户需要补齐依赖；不要假装已经能写入飞书。

## 选择规则

- 用户给的是方案、报告、研究、网页长文：优先用 **结论先行**、**问题拆解** 或 **对比矩阵**。
- 用户给的是计划、路线、阶段安排：概念上可参考 **路线图/阶段规划**，但当前交付仍必须映射到确定性渲染器；优先使用 `large-canvas` 的 roadmap 区域承载。
- 用户给的是机制、业务链路、系统过程：概念上可参考 **流程/价值链**，但当前交付仍必须映射到确定性渲染器；优先使用 `large-canvas` 的模块区和 roadmap 区域承载。
- 用户给的是版本迭代、事件推进、里程碑复盘：优先使用 `milestone-timeline`，并设置 `renderTarget: "dsl"`。
- 用户给的是筛选、转化、收敛、优先级漏斗：优先使用 `funnel`，并设置 `renderTarget: "dsl"`。
- 用户给的是层级、优先级、能力基座、战略承接：优先使用 `pyramid`，并设置 `renderTarget: "dsl"`。
- 用户给的是多个核心指标、状态复盘、覆盖率、风险数或效率变化：优先使用 `metric-dashboard`，并设置 `renderTarget: "dsl"`。
- 用户给的是目标完成度、阶段进展、OKR 复盘或风险收敛：优先使用 `progress-wall`，并设置 `renderTarget: "dsl"`。
- 用户给的是 Top-N、贡献度、问题分布、异常来源或资源占比：优先使用 `ranked-bars`，并设置 `renderTarget: "dsl"`。
- 用户给的是数字变化、成本变化、人力优化、收入差异或效率提升归因：优先使用 `variance-bridge`，并设置 `renderTarget: "dsl"`。
- 用户给的是复杂项目汇报、经营复盘、决策诊断或混合长文，且同时包含指标、进展、证据、风险和行动中的至少三类：优先评估 V3.3 `expression-canvas`。根据材料主导关系选择 `dashboard-onepage`、`narrative-map` 或 `modular-canvas`，并设置 `renderTarget: "svg"` 或省略 `renderTarget`。
- V3.4 起，`expression-canvas` 可以使用更强的数据化表达组件：状态/健康度用 `status-board`，时间变化用 `trend-sparkline`，方案选择用 `decision-matrix`，起终点差异归因用 `variance-bridge-v2`。这些组件必须由 JSON brief 触发并经渲染器生成，不允许手写自由 SVG。
- 信息太多时，先做信息保全清单，再在一张 onepage 大画布内扩展区域承载；不要把原文完整搬上画板，也不要丢掉关键结论、约束、风险、指标、证据和行动。
- 长文默认生成一个统一 onepage 大画布；总览、模块、路线、指标、证据、风险和行动属于同一张连续版面。
- 如果某个区域超过容量预算，不要靠缩小字号硬塞；改写短句、合并重复项，或扩大同页区域。
- 结论先行、问题拆解和长文 onepage 必须使用确定性渲染器，确保其他 Agent 输出的留白、字号、颜色和卡片结构稳定一致。
- 当前生产可交付版式包括 `conclusion-first`、`problem-breakdown`、`large-canvas`、`roadmap`、`process-chain` 和 `comparison-matrix`。V3.2 受控表达版式包括 `milestone-timeline`、`funnel`、`pyramid`、`metric-dashboard`、`progress-wall`、`ranked-bars` 和 `variance-bridge`。V3.3/V3.4 受控组合表达版式为 `expression-canvas`。如果内容不满足对应版式条件，不要自由手写新布局；回退到 `conclusion-first` 或 `large-canvas`。
- 单张画板只表达一个主任务；如果同时出现主线、动作、指标和读图说明，优先拆成总览图和指标图。
- 并列模块不要使用箭头；只有时间推进、流程依赖或价值链才使用箭头。
- 指标和 `xx%` 等草稿占位按 `content-budget.md` 执行：必须有业务语义，同类指标只出现一次，卡片内指标和底部指标区二选一。

## 交付标准

生成前必须能回答：

- 这张画板的主结论是什么？
- 用户看完后应该记住哪 3 到 5 件事？
- 版式为什么适合这份材料？
- 哪些信息被删减、合并或降级？
- 当前内容是否超过单画板容量？
- 如果是长文，为什么选择单屏总览或 onepage 大画布？
- 如果是长文，哪些重要信息进入了同页后续区域？
- 这张画板是否只承担一个主表达任务？
- 指标是真实数字，还是带业务语义的草稿占位？
- 指标是否重复出现，且是否使用统一网格对齐？
- 如果使用 V3.3，为什么选择当前 `expressionMode`，以及每个 `expressionBlock` 承担什么信息关系？
- 如果使用 V3.4 组件，为什么当前材料需要状态、趋势、决策或变化桥，而不是普通卡片？

生成后必须确认：

- 渲染产物没有明显文字溢出、重叠或裁切。
- 产物是由 `scripts/render-whiteboard.mjs` 或 `scripts/render-whiteboard-dsl.mjs` 生成的，除非用户明确接受实验性手写 SVG。
- 所有正文是 `<text>` / `<tspan>`，不是路径或图片。
- 结构元素使用 rect、circle、ellipse、line、polyline 等可编辑形状。
- 画板没有无意义装饰、元信息页眉、来源说明或过程说明。
- 没有乱码、异常符号、长 URL 或未清理的原文残片进入画板。
