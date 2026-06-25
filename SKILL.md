---
name: structured-feishu-whiteboard
description: >
  Use when the user wants to turn materials, reports, plans, webpages, Feishu docs,
  meeting notes, or free text into a structured, editable Feishu/Lark whiteboard,
  including requests for whiteboard beautification, consulting-style diagrams,
  infographics, roadmaps, matrices, workflows, or visual summaries.
---

# Structured Feishu Whiteboard

把任意材料转成结构清晰、咨询汇报风格的飞书画板。这个 skill 的重点不是装饰文本，而是先完成信息筛选、观点组织、版式选择，再生成可编辑 SVG 白板。

## 快速判断

使用本 skill 时，按这个顺序工作：

1. **获取内容**：用户可能粘贴文本、给飞书文档、给网页、给本地文件，或要求你自行检索。读取动作可使用对应工具或其他 skill；本 skill 从“已获得的内容”开始负责结构化表达。
2. **判断体量**：读取 [`references/content-budget.md`](references/content-budget.md)，判断材料是短内容、中等内容、长文/报告还是复杂材料。
3. **理解材料**：读取 [`references/report-workflow.md`](references/report-workflow.md)，提炼主题、结论、证据、对象、冲突、时间线和行动项。
4. **长文处理**：中等内容、长文或复杂材料必须读取 [`references/long-form-workflow.md`](references/long-form-workflow.md)；长文还要读取 [`references/large-canvas-workflow.md`](references/large-canvas-workflow.md)，先做信息保全清单和分屏画框草稿；不要直接把全文塞进 SVG。
5. **选择版式**：读取 [`references/layout-library.md`](references/layout-library.md)，从 5 个版式中选择一个主结构；不要自由发明复杂版式。
6. **选择风格**：读取 [`references/style-library.md`](references/style-library.md)，从 3 套内置风格中选择一个；如果用户指定风格偏好，优先匹配。
7. **稳定渲染**：如果版式是结论先行、问题拆解或长文分屏画布，读取 [`references/deterministic-rendering.md`](references/deterministic-rendering.md)，先生成 JSON brief，再用 `scripts/render-whiteboard.mjs` 生成 SVG；不要自由手写整张 SVG。
8. **生成 SVG**：脚本暂不支持的版式，读取 [`references/feishu-svg-rules.md`](references/feishu-svg-rules.md)，只使用飞书画板可编辑的 SVG 元素。
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
- 用户给的是计划、路线、阶段安排：优先用 **路线图/阶段规划**。
- 用户给的是机制、业务链路、系统过程：优先用 **流程/价值链**。
- 信息太多时，先做信息保全清单，再用多个 16:9 分屏画框承载；不要把原文完整搬上画板，也不要丢掉关键结论、约束、风险、指标、证据和行动。
- 长文默认生成一个自适应分屏画布；第一张画框是总览，不是完整输出。
- 如果单个画框超过容量预算，不要靠缩小字号硬塞；新增同级画框或把细节拆到右侧/下方画框。
- 结论先行和问题拆解优先使用确定性渲染器，确保其他 Agent 输出的留白、字号、颜色和卡片结构稳定一致。
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
- 如果是长文，为什么选择单屏总览或分屏画布？
- 如果是长文，哪些重要信息进入了后续画框？
- 这张画板是否只承担一个主表达任务？
- 指标是真实数字，还是带业务语义的草稿占位？
- 指标是否重复出现，且是否使用统一网格对齐？

生成后必须确认：

- SVG 渲染没有明显文字溢出、重叠或裁切。
- 所有正文是 `<text>` / `<tspan>`，不是路径或图片。
- 结构元素使用 rect、circle、ellipse、line、polyline 等可编辑形状。
- 画板没有无意义装饰、元信息页眉、来源说明或过程说明。
- 没有乱码、异常符号、长 URL 或未清理的原文残片进入画板。
