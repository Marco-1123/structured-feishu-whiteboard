---
name: structured-feishu-whiteboard
description: >
  Turn reports, plans, webpages, Feishu docs, meeting notes, or free text into a
  structured, editable Feishu/Lark onepage whiteboard with automatic information
  analysis, composition, visual design, verification, and document delivery.
---

# Structured Feishu Whiteboard

把用户材料转换为信息完整、排版清晰、具有设计感的可编辑飞书画板。

用户只需要提供材料和目标。默认不要询问版本、渲染器、模板、画布比例或组件类型；这些属于 Skill 的内部专业判断。只有用户明确指定风格或表达方式时，才把它当作约束。

## 唯一生产流程

1. 获取完整材料。飞书文档、网页、本地文件分别使用对应读取能力。
2. 保存原文快照，按 `references/inventory-extraction-contract.md` 和 `schemas/content-inventory.schema.json` 提取可追溯事实清单。
3. 执行唯一入口：

```bash
node scripts/run-structured-whiteboard.mjs \
  --source <raw-source.md> \
  --inventory <inventory.json> \
  --output-dir <output-dir>
```

4. 入口会自动完成：
   - 原文覆盖审计。
   - 事实与关系模型编译。
   - 场景和设计意图识别。
   - 生成多个候选构图。
   - 检查信息覆盖、页面比例、留白、密度、对齐和数据表达。
   - 淘汰不合格方案，只保留评分最高的结果。
5. 只有 `run-manifest.json` 的 `pipeline` 为 `structured-whiteboard` 且 `status` 为 `passed`，才允许写入飞书。
6. 使用 `lark-doc` 新建文档，使用 `lark-whiteboard` 将最终 SVG 写入可编辑画板，导出飞书侧预览并返回文档链接。

## 内部设计原则

- **先理解，再构图**：先识别结论、事实、指标、关系、风险和行动，再决定画面结构。
- **完整但不机械**：关键、高和中重要度事实都必须有可见载体；不要求固定出现“证据、风险、行动”三件套。
- **关系优先**：存在明确层级、顺序、责任、闭环、比较或论证关系时，优先使用空间拓扑，不退化成文字卡片堆叠。
- **数据优先**：存在两个以上有业务含义的数字时，至少评估一种指标、进度、趋势、排名或差异表达。
- **一页平衡**：通过横纵组合、分栏、网格和组件变化扩容，不通过无限向下拉长画布或缩小字号解决容量。
- **候选竞争**：同一材料内部生成不同叙事与构图候选，以信息覆盖、构图平衡、视觉密度和表达多样性共同评分。
- **失败关闭**：所有候选都不合格时直接失败并保留报告，不把技术上能打开但视觉失败的图交付。

## 自动判断范围

Skill 自动识别以下语义，不向用户暴露选择过程：

- 阶段复盘与汇报。
- 策略与方案。
- 项目计划。
- 研究与选型。
- 产品与能力。
- 流程与协作。

可使用的表达包括指标卡、趋势、进度、差异桥、对比矩阵、路线、流程、泳道、分层架构、论证关系、闭环和混合 onepage。组件是表达工具，不是固定模板槽位。

## 质量门槛

正式结果必须同时满足：

- 原文事实可追溯，重要信息没有被静默删减。
- 文本无出框、压线、重叠、裁切、孤立标点和无意义空白副行。
- 同排元素对齐，页面无孤立窄块、空洞、头重脚轻和连续稀疏全宽模块。
- Onepage 默认宽高比保持在适合整体阅读的范围，长文优先重新组合而不是纵向堆叠。
- 有数字时使用合适的数据表达；颜色含义在同一组中一致。
- 飞书侧画板非空白、可打开、主要元素可编辑。
- 最终预览经过整体阅读检查，而不只是工具通过。

详细规范：

- `references/inventory-extraction-contract.md`
- `references/deterministic-rendering.md`
- `references/expression-grammar.md`
- `references/scene-grammar.md`
- `references/style-library.md`
- `references/quality-checklist.md`

## 禁止事项

- 不允许 Agent 手写正式 SVG 或自由拼接飞书 DSL。
- 不允许 Agent 选择历史版本、旧 runner 或 fallback。
- 不允许跳过原文审计、候选评估、SVG 检查和飞书侧预览。
- 不允许为了凑齐模块虚构副信息或重复同一句话。
- 不允许把旧示例、fixture 或历史测试产物当成生产输入。

## 输出

- 飞书文档链接。
- 文档内可编辑画板。
- 飞书侧预览图。
- 一句说明本次识别出的信息组织方式。
- `run-manifest.json`，用于跨 Agent 复现和失败排查。
