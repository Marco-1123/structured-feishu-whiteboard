---
name: structured-feishu-whiteboard
description: >
  Turn reports, plans, webpages, Feishu docs, meeting notes, or free text into a
  structured, editable Feishu/Lark whiteboard for onepage reporting, decisions,
  plans, capabilities, comparisons, dashboards, and workflows.
---

# Structured Feishu Whiteboard

把材料转成结构清晰、信息完整、可编辑的飞书画板。当前正式生产链路是 **V4.4 semantic compiler**：Agent 负责提取事实，脚本负责场景判断、表达规划、页面构图、SVG 渲染和质量检查。

## 唯一生产入口

生成正式画板时必须执行：

```bash
node scripts/run-whiteboard-v44.mjs --source <raw-source.md> --input <inventory.json> --output-dir <output-dir>
```

禁止：

- 直接手写 SVG 或飞书 DSL。
- 直接调用旧渲染器拼接正式产物。
- 由 Agent 自由选择 V3、V4.3 或 V4.4。
- 跳过 `run-manifest.json`、几何检查或预览检查后声称交付完成。
- 将 fallback 结果标记为 V4.4 通过。

旧版本代码只用于历史回归和内部排障，不再构成 Skill 的并行使用说明。

## 固定流程

1. 获取用户材料。飞书文档、网页和本地文件由对应工具读取。
2. 将完整原材料保存为不可删减的 source snapshot。先读取 `references/inventory-extraction-contract.md`，再按 `schemas/content-inventory.schema.json` 生成事实清单。清单必须包含可追溯的 `sourceRef`；每条正式事实必须有 ID、类型、重要度、原始语义和可在 source snapshot 中定位的 `sourceQuote`。
3. 运行唯一生产入口。脚本会依次生成：
   - `source-audit.json`
   - `semantic-model.json`
   - `expression-plans.json`
   - `decision.json`
   - `brief.json`
   - `whiteboard.svg`
   - `whiteboard.png`
   - `run-manifest.json`
4. 只有 manifest 的 `pipeline` 为 `v4.4` 且 `status` 为 `passed`，才可以写入飞书并交付。
5. 新建飞书文档，插入可编辑画板，返回文档链接和预览图。

仓库中的现成 inventory 只用于回归测试。处理真实材料时，不能跳过原始材料到事实清单的提取与校验步骤。

## 内容原则

- 先保留关键结论、指标、证据、风险、约束和行动，再决定表达形式。
- 不要求每张图固定出现“证据、风险、行动”。它们可以独立、合并、嵌入或不出现，取决于材料。
- 不为凑齐模块虚构内容，不用同义句填充副信息。
- 指标必须保留业务含义、数值和单位；禁止标题删掉数字后留下残句。
- 相同事实不得在标题、正文和标签中机械重复。
- 长文通过构图和组件组合扩容，不通过无限向下拉长画布或缩小字号解决。
- 原文覆盖与画面覆盖是两道独立门槛：事实清单过薄时直接失败，不能用“已画出清单中的全部事实”冒充原文完整。

## 场景语义

V4.4 识别六类场景：

- 阶段复盘与汇报
- 策略与方案
- 项目计划
- 研究与选型
- 产品与能力
- 流程与协作

复盘与阶段汇报优先投入，但其他场景必须使用同一生产链路和质量门槛。

## 受控表达

Agent 不选择坐标，只提交事实。语义规划器根据证据选择：

- 核心判断
- 指标卡
- 进度或排名条
- 趋势图
- 状态板
- 能力系统图（能力矩阵或“使用链路 + 能力支撑”复合场景）
- 路线或链路
- 证据块
- 风险块
- 行动块
- 对比矩阵
- 差异桥
- 流程图

组件必须满足语义资格条件。颜色只表达语义：主色用于普通信息，绿色只用于明确成功，棕红色只用于风险或警告。

## OnePage 构图门槛

- 默认宽度 2200；正式 onepage 宽高比必须在 `1.42–2.15`。
- 核心判断之后优先保持 2 个主体信息层，复杂骨架最多 3 层。
- 不允许连续两个稀疏全宽模块。
- 不允许孤立窄卡、底部悬空、头重脚轻或无意义大留白。
- 同排组件必须对齐；短组件不能被机械拉高制造空框。
- 页面必须有明确主次，不能全部退化成浅色描边卡片和文字列表。
- 有明确数字时必须优先评估数据组件，不得全部改写成普通正文。

详细规则见：

- `references/deterministic-rendering.md`
- `references/inventory-extraction-contract.md`
- `references/semantic-routing-v44.md`
- `references/expression-grammar.md`
- `references/scene-grammar.md`
- `references/style-library.md`
- `references/quality-checklist.md`

## 交付门槛

正式交付必须同时满足：

- 关键、高重要度和中重要度事实均有可见载体；不能以“延后到详情”静默省略。
- SVG 包含 `data-layout-engine="v4"`、`data-pipeline-version="4.4"` 和 `data-page-skeleton`。
- 文本无出框、压线、重叠、裁切和孤立标点。
- 页面比例、主体层数、底部平衡和颜色语义通过自动检查。
- PNG 预览非空白，并经过人工整体阅读检查。
- 飞书侧画板非空白、可打开、主要元素可编辑。

如果任一条件失败，继续修复；不要把技术上能打开但视觉失败的图交给用户。

## 输出

- 飞书文档链接。
- 文档内可编辑画板。
- 预览图。
- 简短说明采用的场景、页面骨架和主要信息取舍。
- `run-manifest.json` 作为跨 Agent 复现依据。
