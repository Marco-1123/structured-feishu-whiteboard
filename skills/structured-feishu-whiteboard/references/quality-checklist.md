# V4.4 Quality Checklist

## 生产链路

- 只使用 `scripts/run-whiteboard-v44.mjs`。
- manifest 必须为 `pipeline: v4.4`、`status: passed`。
- SVG 必须包含 `data-layout-engine="v4"`、`data-pipeline-version="4.4"` 和 `data-page-skeleton`。
- 旧渲染器和旧版本说明只用于历史回归，不能作为外部 Agent 的备选生产入口。

## 内容

- 关键和高优先级事实已覆盖，或有明确遗漏原因。
- 不虚构指标、证据、风险、行动或副信息。
- 不机械重复同一事实。
- 指标保留业务含义、数值和单位，标题不是残句。
- 证据、风险和行动按语义选择，不固定套模板。

## 构图

- OnePage 宽高比在 1.42–2.15。
- 核心判断之后优先 2 个主体层，复杂骨架最多 3 层。
- 不出现连续稀疏全宽模块。
- 不出现孤立窄卡、底部悬空、头重脚轻或大片无效留白。
- 短链路和单指标进入二维网格，不额外制造整行。
- 同排模块对齐，内部内容垂直平衡。
- 页面至少存在清晰的主次关系，不能全部表现为同构文字卡片。

## 几何与文字

- 无文字出框、压线、重叠、裁切和孤立标点。
- 标题与正文换行基于容器实际宽度。
- 内容与边框保持安全边距。
- 箭头连接节点边界，不漂浮、不穿过文字。
- 不使用 gradient、filter、opacity、clipPath、mask 或复杂 path。

## 颜色

- 同组并列指标颜色一致。
- 绿色只表示明确成功或完成。
- 棕红色只表示明确风险、警告、阻塞或待处理。
- 状态不能只靠颜色表达，必须有文字标签。

## 自动验证

正式修改至少运行：

```bash
bash scripts/preflight.sh
bash scripts/validate-layout-tests.sh
node scripts/run-v44-internal-benchmark.mjs
```

跨 Agent 暴露的坏案例必须加入 `examples/evals/v44-badcases/`，并由自动测试固定。

## 人工验证

- 先看整页比例、重心和阅读顺序，再放大检查局部。
- 在 1080px 宽预览下，标题、核心判断、指标和区域标题可直接阅读。
- PNG 非空白，飞书侧画板可打开且主要元素可编辑。
- 任何“技术通过但明显不好看”的产物都视为失败。
