# Deterministic Rendering

当其他 Agent 使用本 skill 时，必须先让 Agent 产出结构化 brief，再用脚本生成受控画板产物。常规报告模板生成 SVG；V3.2 受控表达版式生成飞书白板 DSL；V3.3/V3.5 组合表达画布生成 SVG。V4 新增并行布局引擎试点，仍输出 SVG，但必须由布局树生成。不要让 Agent 自由手写整张 SVG 或 DSL。

## 适用场景

优先使用确定性渲染器：

- 需要稳定复现专业蓝白等固定风格。
- 长文或复杂材料容易出框、堆叠或拥挤。
- 其他 Agent 产出与预期风格差异大。
- 用户要求“按这个 skill 的标准版式生成”。
- 长文需要在同一个 onepage 大画布中保留总览、证据、风险、指标和行动。
- 内容看起来像路线图、流程图、价值链、对比矩阵、时间线、漏斗或金字塔时，必须使用对应脚本化模板；不能手写 SVG 或 DSL。真实节点连接流程图优先使用 V4.1 `flow-canvas`。
- 内容包含指标、进展、风险、证据和行动等多种关系，且单一模板会显得死板时，使用 `expression-canvas`，但仍必须走脚本化渲染器。

## 工作流

1. 按 `report-workflow.md` 和 `content-budget.md` 压缩内容。
2. 生成符合 `schemas/whiteboard-brief.schema.json` 的 JSON brief。
3. 运行 `scripts/validate-brief.mjs brief.json`。
4. 如果 `engine` 为空或为 `v3`，且 `renderTarget` 为空或为 `svg`，运行 `scripts/render-whiteboard.mjs --input brief.json --output diagram.svg`。
5. 如果 `engine` 为空或为 `v3`，且 `renderTarget` 为 `dsl`，运行 `scripts/render-whiteboard-dsl.mjs --input brief.json --output diagram.json`。
6. 如果 `engine` 为 `v4`，必须同时满足 `layout: "expression-canvas"` 或 `layout: "flow-canvas"`，并使用 SVG 输出，运行 `scripts/render-whiteboard-v4.mjs --input brief.json --output diagram.svg`。
7. 对 SVG 产物运行 `scripts/check-svg-layout.mjs diagram.svg`，补充检查父容器越界；V4 产物还要运行 `scripts/check-v4-layout.mjs diagram.svg`。
8. 按 `quality-checklist.md` 渲染、检查、写入飞书。

## Brief 约束

- `layout` 只能是脚本支持的版式。
- `engine` 默认是 `v3`。只有 V4 试点样例才写 `engine: "v4"`。
- `engine: "v4"` 当前只支持 `layout: "expression-canvas"` 或 `layout: "flow-canvas"`，`renderTarget: "svg"` 或省略 `renderTarget`。
- 当前 SVG 生产输出允许 `conclusion-first`、`problem-breakdown`、`large-canvas`、`roadmap`、`process-chain`、`comparison-matrix`、`expression-canvas`。
- V3.2 DSL 输出允许 `milestone-timeline`、`funnel`、`pyramid`、`metric-dashboard`、`progress-wall`、`ranked-bars`、`variance-bridge`。
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
- `progress-wall`，`renderTarget: "dsl"`
- `ranked-bars`，`renderTarget: "dsl"`
- `variance-bridge`，`renderTarget: "dsl"`
- `expression-canvas`
- `expression-canvas` + `engine: "v4"`，实验性 SVG 布局引擎试点
- `flow-canvas` + `engine: "v4"`，V4.1 实验性流程图布局引擎试点

`expression-canvas` 需要同时设置 `expressionMode` 和 `expressionBlocks`。具体规则见 `expression-grammar.md`。
`flow-canvas` 需要同时设置 `flowMode`、`flowNodes` 和 `flowEdges`；`swimlane-flow` 还需要 `lanes`。

V4 产物必须包含 `data-layout-engine="v4"`。这不是视觉风格标记，而是为了确认产物确实经过并行布局引擎，不是旧模板或手写 SVG。

路线图、流程、价值链、矩阵、时间线、漏斗、金字塔和指标看板现在都有脚本化模板。交付时必须使用这些模板，不要因为 `layout-library.md` 里描述了这些版式，就自由手写 SVG 或 DSL。

## 输出原则

脚本负责：

- 画布尺寸。
- 卡片坐标。
- 字号、行距、留白。
- 箭头位置。
- 颜色 token。
- SVG 转义或 DSL 节点结构。
- V4 试点中的布局树、组件自适应高度、网格和堆叠规则。
- V4.2 中高密度模块的全宽升级、列表行增高、指标卡安全高度和流程节点自适应宽高。

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
- 把高密度架构、治理、风险或行动材料压成大量半宽小窄框，即使没有技术越界也视为不合格。
