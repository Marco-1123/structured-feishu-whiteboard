# Deterministic Rendering

当其他 Agent 使用本 skill 时，必须先让 Agent 产出结构化 brief，再用脚本生成受控画板产物。常规报告模板生成 SVG；V3.2 试点表达生成飞书白板 DSL。不要让 Agent 自由手写整张 SVG 或 DSL。

## 适用场景

优先使用确定性渲染器：

- 需要稳定复现专业蓝白等固定风格。
- 长文或复杂材料容易出框、堆叠或拥挤。
- 其他 Agent 产出与预期风格差异大。
- 用户要求“按这个 skill 的标准版式生成”。
- 长文需要在同一个 onepage 大画布中保留总览、证据、风险、指标和行动。
- 内容看起来像路线图、流程图、价值链、对比矩阵、时间线、漏斗或金字塔时，必须使用对应脚本化模板；不能手写 SVG 或 DSL。

## 工作流

1. 按 `report-workflow.md` 和 `content-budget.md` 压缩内容。
2. 生成符合 `schemas/whiteboard-brief.schema.json` 的 JSON brief。
3. 运行 `scripts/validate-brief.mjs brief.json`。
4. 如果 `renderTarget` 为空或为 `svg`，运行 `scripts/render-whiteboard.mjs --input brief.json --output diagram.svg`。
5. 如果 `renderTarget` 为 `dsl`，运行 `scripts/render-whiteboard-dsl.mjs --input brief.json --output diagram.json`。
6. 对 SVG 产物运行 `scripts/check-svg-layout.mjs diagram.svg`，补充检查父容器越界。
7. 按 `quality-checklist.md` 渲染、检查、写入飞书。

## Brief 约束

- `layout` 只能是脚本支持的版式。
- 当前 SVG 生产输出允许 `conclusion-first`、`problem-breakdown`、`large-canvas`、`roadmap`、`process-chain`、`comparison-matrix`。
- V3.2 DSL 试点输出允许 `milestone-timeline`、`funnel`、`pyramid`、`metric-dashboard`。
- 长文默认使用 `layout: "large-canvas"`；它表示统一 onepage 大画布，不是纵向长图或多页分屏。顶部总览不是完整输出。
- `modules` 只能有 3 到 5 个。
- 每个模块正文最多 3 条短句。
- 每个模块最多 1 个标签，不支持多个指标框。
- 每个模块最多 1 个 `metric`。当前确定性渲染器只支持卡片内指标，不支持额外底部指标区，避免重复呈现。
- 多个模块使用同类指标时，填写 `metricKey`；同一张画板中 `metricKey` 不能重复。
- 不支持在卡片内写读法说明；读图说明优先放在回复中。
- 标题、正文和标签必须先压缩到 schema 限制内。
- 不能把原文段落、长 URL、脚注或来源路径写入 brief。
- 没有明确数字但需要保留指标位时，可以使用 `xx%` 等草稿占位，但必须和指标名称一起出现，例如 `覆盖率提升至 xx%`；不要只写孤立的 `xx%`、`TBD`、`--`。

## 当前支持

- `conclusion-first`
- `problem-breakdown`
- `large-canvas`
- `roadmap`
- `process-chain`
- `comparison-matrix`
- `milestone-timeline`，`renderTarget: "dsl"`
- `funnel`，`renderTarget: "dsl"`
- `pyramid`，`renderTarget: "dsl"`
- `metric-dashboard`，`renderTarget: "dsl"`

路线图、流程、价值链、矩阵、时间线、漏斗、金字塔和指标看板现在都有脚本化模板。交付时必须使用这些模板，不要因为 `layout-library.md` 里描述了这些版式，就自由手写 SVG 或 DSL。

## 输出原则

脚本负责：

- 画布尺寸。
- 卡片坐标。
- 字号、行距、留白。
- 箭头位置。
- 颜色 token。
- SVG 转义或 DSL 节点结构。

Agent 负责：

- 理解材料。
- 压缩信息。
- 选择版式和风格。
- 填写 brief。
- 执行渲染和检查。

## 不合格输出

以下情况视为没有正确使用本 skill：

- 没有生成 brief，直接手写 SVG。
- 没有生成 brief，直接手写 DSL。
- 使用了 `layout-library.md` 里的路线图、流程、矩阵、时间线、漏斗或金字塔描述，但没有通过渲染器。
- 生成了未被 `scripts/check-svg-layout.mjs` 和 whiteboard check 覆盖的自由布局。
- 复现了贴边、压线、无效大留白、箭头漂浮、文字出框等已经由渲染器解决的问题。
