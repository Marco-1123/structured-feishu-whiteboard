# Feishu SVG Rules

这些规则用于确保 SVG 写入飞书画板后尽量保持可编辑，而不是退化成静态图片。

## 可用元素

优先使用：

- `<rect>`，包括 `rx` 圆角。
- `<circle>` / `<ellipse>`。
- `<line>`。
- `<polyline>`，只用于直角连接线或折线连接线。
- `<text>` / `<tspan>`。
- `<defs>` 中的 `<marker>`，用于箭头。

谨慎使用：

- `<polygon>`：尽量不用，容易变成不可编辑图像；不要用于箭头。
- `<path>`：只允许在 `<marker>` 内用于箭头标记；不要用于正文图形、图标或文字。

禁止使用：

- gradient、filter、pattern、clipPath、mask。
- blur shadow。
- opacity、fill-opacity、stroke-opacity。
- 把文字转成 path。
- 复杂插画、自由曲线、装饰图案、无法编辑的图像化元素。

## 箭头

箭头使用 marker，不手绘箭头头部：

```svg
<defs>
  <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="4"
          orient="auto" markerUnits="strokeWidth">
    <path d="M0 0 L10 4 L0 8 z"/>
  </marker>
</defs>
<line x1="100" y1="80" x2="360" y2="80" stroke="#2563EB" stroke-width="3" marker-end="url(#arrow)"/>
```

直角连接用 `<polyline>`，并把 `marker-end` 放在连接线本身。

## 文本

- 不设置 `font-family`。
- 中文按接近 1em 估算宽度，英文按接近 0.6em 估算宽度。
- 长文本使用多行 `<tspan>`，不要靠缩小字号硬塞。
- 正文建议不小于 18，标签不小于 16。
- 每个卡片预留足够内边距，尤其是中文标题。
- 长文必须先压缩成短句，再写入 `<text>`；不要把整段原文放进一个文本节点。
- 每个 `<text>` 组建议不超过 4 个 `<tspan>`；超过时拆成多个模块或拆图。
- 文本内容中的 `<`、`>`、`&` 必须转义，避免破坏 SVG/XML。

## 颜色和透明度

- 飞书画板对透明度支持不可靠；所有颜色都用实色 hex。
- 需要浅色效果时，直接选择更浅的实色。
- 需要阴影时，使用同形状的实色偏移块，不能用 blur/filter。
- 文字颜色在导出图中可能与实际画板不完全一致；布局检查以导出图为准，颜色最终以飞书画板实际内容为准。

## 画布

- 单屏画板不强制固定 16:9；长文 onepage 大画布可以适度扩大，但仍应像一张完整报告页。
- 推荐逻辑宽度 1600 到 1700。
- 高度由内容决定，常见范围 900 到 1300。
- 四周至少留 48 到 80 的安全边距。
- 画板是可编辑工作区，不要把所有内容塞成单张海报截图。
- 长文不要做成单个超长竖图，也不要切成多个独立页面；优先在同一画板内组织同页区域。
- 不要为了适配固定比例而压缩内容；画布高度应服务信息结构。

## 写入流程

生成 SVG 后：

```bash
npx -y @larksuite/whiteboard-cli@^0.2.11 -i diagram.svg -o diagram.png -f svg
npx -y @larksuite/whiteboard-cli@^0.2.11 -i diagram.svg -f svg --check
```

查看 `diagram.png`，修正后再写入飞书。

如果用户没有提供目标画板，默认新建文档并插入空白白板，然后写入生成结果。写入命令可参考本地已安装的飞书白板能力；执行前确认 `lark-cli` 已登录用户身份。
