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
2. **理解材料**：读取 [`references/report-workflow.md`](references/report-workflow.md)，提炼主题、结论、证据、对象、冲突、时间线和行动项。
3. **选择版式**：读取 [`references/layout-library.md`](references/layout-library.md)，从 5 个版式中选择一个主结构；不要自由发明复杂版式。
4. **选择风格**：读取 [`references/style-library.md`](references/style-library.md)，从 3 套内置风格中选择一个；如果用户指定风格偏好，优先匹配。
5. **生成 SVG**：读取 [`references/feishu-svg-rules.md`](references/feishu-svg-rules.md)，只使用飞书画板可编辑的 SVG 元素。
6. **检查质量**：读取 [`references/quality-checklist.md`](references/quality-checklist.md)，渲染、查看、修正文字溢出、重叠、裁切和信息噪音。
7. **写入飞书**：默认新建飞书文档，插入白板，写入生成结果，返回文档链接和预览图。

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
- 信息太多时，先压缩成 1 个主结论 + 3 到 6 个关键模块；不要把原文完整搬上画板。
- 如果一个画板承载不下，先做一张总览画板；不要自动拆多张，除非用户明确要求系列画板。

## 交付标准

生成前必须能回答：

- 这张画板的主结论是什么？
- 用户看完后应该记住哪 3 到 5 件事？
- 版式为什么适合这份材料？
- 哪些信息被删减、合并或降级？

生成后必须确认：

- SVG 渲染没有明显文字溢出、重叠或裁切。
- 所有正文是 `<text>` / `<tspan>`，不是路径或图片。
- 结构元素使用 rect、circle、ellipse、line、polyline 等可编辑形状。
- 画板没有无意义装饰、元信息页眉、来源说明或过程说明。
