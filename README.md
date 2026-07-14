# structured-feishu-whiteboard

把报告、方案、计划、研究材料和长文转成结构化、可编辑的飞书画板。

当前版本统一使用 **V4.4 semantic compiler**：先生成事实清单，再由脚本完成场景判断、表达规划、页面构图、SVG 渲染和质量检查。外部 Agent 不再自行选择历史渲染链路，也不能自由手写 SVG。

## 能力

- 识别阶段复盘、策略方案、项目计划、研究选型、产品能力、流程协作六类场景。
- 根据材料选择指标、进度、趋势、状态、路线、证据、风险、行动、矩阵、差异桥和流程图等表达组件。
- 保留关键事实并记录信息取舍。
- 使用统一 12 列网格和 OnePage 空间预算，阻止无限纵向拉长。
- 生成可编辑飞书画板、预览图和可回放运行记录。

## 安装测试分支

```bash
npx skills add https://github.com/Marco-1123/structured-feishu-whiteboard/tree/codex/v4.4-semantic-compiler --skill structured-feishu-whiteboard -g -y
```

## 更新

再次执行同一条安装命令即可覆盖为该分支最新版本。

## 唯一生产入口

```bash
node scripts/run-whiteboard-v44.mjs --input <inventory.json> --output-dir <output-dir>
```

正式结果必须具有：

- `run-manifest.json` 中 `pipeline: "v4.4"`、`status: "passed"`。
- `whiteboard.svg` 中 `data-layout-engine="v4"` 与 `data-pipeline-version="4.4"`。
- 宽高比、主体层数、文本边界、底部平衡和颜色语义检查通过。
- 飞书侧画板可打开、非空白、主要元素可编辑。

详细使用规则见 [SKILL.md](SKILL.md)。

## 目录

```text
SKILL.md                         当前唯一执行说明
schemas/                         内容、语义和 brief schema
config/                          场景与表达策略配置
scripts/run-whiteboard-v44.mjs   唯一生产入口
scripts/lib/                     语义、规划、布局和质量检查
examples/evals/                  回归样例与真实坏案例
references/                      当前设计与质量规则
wiki/                            迭代决策与经验记录
```

历史代码保留用于回归和迁移，不构成并行生产入口。

## License

MIT
