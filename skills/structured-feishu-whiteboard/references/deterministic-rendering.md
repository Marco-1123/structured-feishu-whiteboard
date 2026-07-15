# Deterministic Rendering

当前正式输出只有一条链路：

```text
raw source snapshot
  -> source extraction audit
  -> content inventory
  -> semantic model
  -> expression candidates
  -> selected page skeleton
  -> V4 layout tree
  -> SVG
  -> geometry + visual + preview checks
  -> Feishu whiteboard
```

真实材料必须先按 `inventory-extraction-contract.md` 建立可追溯事实清单。仓库内预制 inventory 只用于回归测试，不能作为跨 Agent 稳定性的替代证明。

执行入口：

```bash
node scripts/run-structured-whiteboard.mjs --source <raw-source.md> --inventory <inventory.json> --output-dir <output-dir>
```

## 职责边界

Agent 负责：

- 阅读材料。
- 生成事实清单。
- 保留事实来源、重要度、顺序、角色和显式关系。
- 执行生产入口并读取结果。

脚本负责：

- 场景分类和置信度。
- 叙事骨架和组件资格判断。
- 页面网格、尺寸、换行和空间预算。
- 颜色和状态语义。
- SVG 生成与检查。
- 运行记录。

Agent 不得手写坐标、SVG 或 DSL，也不得从历史版本中另选一条链路。

## 生产契约

正式结果必须同时存在：

- `run-manifest.json`
- `source-audit.json`
- `semantic-model.json`
- `expression-plans.json`
- `decision.json`
- `brief.json`
- `whiteboard.svg`
- `whiteboard.png`

manifest 必须满足：

```json
{
  "pipeline": "structured-whiteboard",
  "status": "passed"
}
```

SVG 必须包含：

```text
data-layout-engine="v4"
data-pipeline-version="4.4"
data-page-skeleton="..."
```

缺少任一标记时，不得视为当前 Skill 产物。

## 回退

低置信度可以生成内部 fallback 供排障，但 fallback 不是 V4.4 正式交付。外部 Agent 不得主动选择 V3/V4.3，也不得把 fallback 包装成最新版本结果。

## 页面预算

- OnePage 宽高比：`1.42–2.15`。
- `centered-system` 主体最多 2 行，其他骨架最多 3 行。
- 不允许连续稀疏全宽模块。
- 不允许通过无限增高画布解决内容组织问题。
- 先重组模块、改变列宽、合并重复事实，再考虑增加高度。
- 主体信息无法在预算内表达时，生产检查失败并要求重新规划，而不是自动交付长图。

## 组件资格

- 单个核心数字：指标卡。
- 同口径的三项以上完成度：进度或排名条。
- 至少三个连续时点：趋势图。
- 可加总的起点、增减项和终点：差异桥。
- 三个以上明确顺序节点：链路或流程。
- 四至六个无顺序并列能力：状态网格。
- 产品能力同时包含三步以上明确链路与三项以上能力时：能力系统图，上层链路、下层能力支撑。
- 只有并列能力时：能力矩阵，不画暗示顺序的连接线；超过一排自动换行，不截断。
- 两个以上方案与两个以上维度：对比矩阵。
- 风险必须有明确风险语义；普通信息不能使用风险色。
- 绿色只表示明确成功或完成，不能作为普通装饰色。

## 历史兼容

旧渲染器、DSL 模板和旧 schema 保留在仓库中只用于回归与迁移。它们不再出现在当前 Skill 的执行选择里。新增功能必须进入 V4.4 语义编译和统一检查链路，不能新增第二个生产入口。
