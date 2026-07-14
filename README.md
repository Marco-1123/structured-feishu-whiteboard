# structured-feishu-whiteboard

把报告、方案、计划、研究材料和长文转成结构化、可编辑的飞书画板。

当前唯一生产版本是 **V4.4 semantic compiler beta.6**。Agent 只负责提取可追溯事实；脚本负责场景判断、表达规划、页面构图、SVG 渲染和质量检查。

## 唯一安装方式

安装固定、不可变的完整包：

```bash
npx skills add 'Marco-1123/structured-feishu-whiteboard#v4.4.0-beta.6@structured-feishu-whiteboard' --skill structured-feishu-whiteboard -g -y --copy
```

- 唯一安装来源：[v4.4.0-beta.6 中的完整 Skill 目录](https://github.com/Marco-1123/structured-feishu-whiteboard/tree/v4.4.0-beta.6/skills/structured-feishu-whiteboard)。
- 正常安装约复制 579 个文件；数量明显偏少通常表示只拿到了 `SKILL.md`，生产渲染器和校验器并未安装完整。
- 不要安装默认分支、开发分支、仓库根目录或单独的 raw `SKILL.md`。
- 不要使用无版本命令 `npx skills add Marco-1123/structured-feishu-whiteboard`；它会随默认分支变化，无法保证跨 Agent 一致。

重新执行同一条命令即可覆盖更新为 beta.6。不可变标签没有被移动或重写。

## 唯一生产入口

进入已安装的 Skill 目录后执行：

```bash
node scripts/run-whiteboard-v44.mjs --input <inventory.json> --output-dir <output-dir>
```

正式结果必须满足：

- `run-manifest.json` 为 `pipeline: "v4.4"`、`status: "passed"`。
- `whiteboard.svg` 含 `data-layout-engine="v4"`、`data-pipeline-version="4.4"` 和 `data-page-skeleton`。
- 几何、视觉和 PNG 像素检查全部通过。
- 飞书侧画板可打开、非空白、主要元素可编辑。

完整调用规则见 [`SKILL.md`](skills/structured-feishu-whiteboard/SKILL.md)，beta.6 发布说明见 [`docs/releases/v4.4.0-beta.6.md`](docs/releases/v4.4.0-beta.6.md)。

## 目录边界

```text
skills/structured-feishu-whiteboard/  可安装的生产 Skill
  SKILL.md                            唯一 Agent 执行说明
  scripts/run-whiteboard-v44.mjs      唯一生产入口
  scripts/legacy/                     仅供旧版回归，不是备选入口
  examples/                           仅供自动测试，不是使用教程
docs/releases/                        当前发布说明
docs/history/                         历史设计、规则、样例和验收证据
```

历史标签和 Git 历史保留全部旧资产。当前树只把它们从生产入口旁边移开，不把历史规则继续暴露为并行说明。

## 开发验证

运行依赖：Node.js 20+、Python 3 + Pillow、`lark-cli`，以及可联网获取的 `@larksuite/whiteboard-cli@0.2.12`。

```bash
cd skills/structured-feishu-whiteboard
bash scripts/preflight.sh
bash scripts/validate-layout-tests.sh
node scripts/run-v44-internal-benchmark.mjs
```

回归脚本会重新生成未跟踪的 SVG、PNG、manifest 和 benchmark 输出。不要提交这些可再生产物。

## License

MIT
