# structured-feishu-whiteboard

把报告、方案、计划、研究材料和长文转成结构化、可编辑的飞书画板。

当前测试版统一使用 **V5 生产编排链路**：先建立可追溯事实清单，再自动完成信息审计、场景识别、设计意图编译、多候选构图、飞书兼容检查和最终方案选择。外部 Agent 不需要选择版本、渲染器或模板，也不能自由手写正式 SVG。

## 能力

- 识别阶段复盘、策略方案、项目计划、研究选型、产品能力、流程协作六类场景。
- 根据材料选择指标、进度、趋势、状态、路线、证据、风险、行动、矩阵、差异桥和流程图等表达组件。
- 保留关键事实并记录信息取舍。
- 使用统一空间预算和多候选构图，阻止无限纵向拉长、头重脚轻和机械模块堆叠。
- 生成可编辑飞书画板、预览图和可回放运行记录。

## 安装 V5 beta.1

```bash
npx skills add 'Marco-1123/structured-feishu-whiteboard#codex/v5-beta-refactor@structured-feishu-whiteboard' --skill structured-feishu-whiteboard -g -y --copy
```

## 更新

测试期间再次执行同一条安装命令即可更新。正式验收后会发布固定版本标签，供不同 Agent 安装同一提交。

V5 beta.1 把过去分散在多个版本中的规则收敛为一条生产链路。候选方案必须基于最终可见内容通过事实覆盖、页面平衡、表达多样性和飞书导入检查；如果所有候选都不合格，链路会失败并保留诊断报告，不再交付一张技术上可打开、视觉上不可用的画板。

## 唯一生产入口

```bash
node scripts/run-structured-whiteboard.mjs \
  --source <raw-source.md> \
  --inventory <inventory.json> \
  --output-dir <output-dir>
```

正式结果必须具有：

- `run-manifest.json` 中 `pipeline: "structured-whiteboard"`、`status: "passed"`。
- 最终候选通过事实覆盖、宽高比、内容利用率、文本边界、页面平衡和颜色语义检查。
- 最终候选在选定前已经通过 `whiteboard-cli` 导入、布局检查和预览渲染。
- 飞书侧画板可打开、非空白、主要元素可编辑。

详细使用规则见 [SKILL.md](skills/structured-feishu-whiteboard/SKILL.md)。

## 目录

```text
skills/structured-feishu-whiteboard/
  SKILL.md                       当前唯一执行说明
  schemas/                       内容、语义和 brief schema
  config/                        场景与表达策略配置
  scripts/run-structured-whiteboard.mjs 唯一生产入口
  scripts/lib/                   语义、规划、布局和质量检查
  examples/evals/                回归样例与真实坏案例
  references/                    当前设计与质量规则
wiki/                            迭代决策与经验记录
```

历史渲染器仅保留为回归资产，不是 Agent 可选择的生产入口。

## License

MIT
