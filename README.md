# structured-feishu-whiteboard

结构化飞书画板 Skill：把用户提供的材料、报告、方案、网页信息、飞书文档内容或自由文本，提炼成清晰的信息结构，并生成可编辑、排版美观的飞书 / Lark 画板。

## 适合什么场景

- 把方案或报告整理成咨询汇报风格画板。
- 把网页、文档、研究材料转成结构化信息图。
- 把产品规划、路线图、竞品分析、业务流程做成飞书画板。
- 需要输出可编辑白板，而不是一张静态截图。

## 第一版能力

- 内容理解：提炼主题、主结论、关键模块、证据和行动项。
- 版式选择：内置 5 个高频结构版式。
- 视觉风格：内置 3 套精选 UI 风格。
- 飞书落地：默认新建飞书文档，写入可编辑画板，并返回链接和预览图。

## 内置版式

- 结论先行
- 问题拆解
- 对比矩阵
- 路线图 / 阶段规划
- 流程 / 价值链

## 内置风格

- 专业蓝白
- 深色强调
- 暖灰编辑

## 安装

如果你的 Agent 支持从 GitHub 安装 Skill，发布后可以使用类似命令：

```bash
npx skills add <your-github-username>/structured-feishu-whiteboard
```

也可以手动复制本仓库到你的 Skills 目录。

## 依赖

- Node.js 20 或更新版本。
- `lark-cli`，并完成飞书 / Lark 用户授权。
- `@larksuite/whiteboard-cli`，通过 `npx` 自动调用。

运行自检：

```bash
bash scripts/preflight.sh
```

## 使用示例

对 Agent 说：

> 使用 `$structured-feishu-whiteboard`，把这份方案整理成结构清晰、可编辑的飞书画板。

或：

> 使用 `$structured-feishu-whiteboard`，把这个网页里的核心信息做成飞书画板，偏专业蓝白风格。

## 目录结构

```text
SKILL.md
agents/openai.yaml
references/
  report-workflow.md
  layout-library.md
  style-library.md
  feishu-svg-rules.md
  quality-checklist.md
scripts/
  preflight.sh
```

## 许可

MIT
