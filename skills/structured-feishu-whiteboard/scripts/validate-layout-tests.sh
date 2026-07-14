#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

node scripts/generate-layout-test-fixtures.mjs >/dev/null

for brief in examples/briefs/*.json; do
  target="$(node -e 'const fs=require("fs"); const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(b.renderTarget || "svg")' "$brief")"
  engine="$(node -e 'const fs=require("fs"); const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(b.engine || "v3")' "$brief")"
  node scripts/validate-brief.mjs "$brief" >/dev/null
  if [ "$engine" = "v4" ]; then
    if [ "$target" != "svg" ]; then
      echo "V4 engine only supports SVG target in this pilot: $brief" >&2
      exit 1
    fi
    svg="examples/layout-tests/generated-$(basename "${brief%.json}").svg"
    png="${svg%.svg}.png"
    node scripts/render-whiteboard-v4.mjs --input "$brief" --output "$svg" >/dev/null
    node -e 'const fs=require("fs"); const svg=fs.readFileSync(process.argv[1],"utf8"); if (!svg.includes("data-layout-engine=\"v4\"")) { console.error("V4 output must include layout engine marker"); process.exit(1); }' "$svg"
    node scripts/check-svg-layout.mjs "$svg" >/dev/null
    node scripts/check-v4-layout.mjs "$svg" >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$svg" -o "$png" -f svg >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$svg" -f svg --check >/dev/null
  elif [ "$target" = "dsl" ]; then
    dsl="examples/layout-tests/generated-$(basename "${brief%.json}").json"
    png="${dsl%.json}.png"
    node scripts/legacy/render-whiteboard-dsl.mjs --input "$brief" --output "$dsl" >/dev/null
    if [ "$(basename "$brief")" = "v32-variance-bridge.json" ]; then
      node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8")); const bars=j.nodes.filter(n=>n.type==="rect" && ["#F59E0B","#16A085","#5E6AD2","#2563EB","#3370FF","#007AFF"].includes(n.fillColor) && n.height>=24 && n.height<=160); if (bars.length < 3 || new Set(bars.map(b=>Math.round(b.height))).size < 2) { console.error("variance bridge must encode relative magnitude with proportional bars"); process.exit(1); }' "$dsl"
    fi
    npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$dsl" -o "$png" >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$dsl" --check >/dev/null
  else
    svg="examples/layout-tests/generated-$(basename "${brief%.json}").svg"
    png="${svg%.svg}.png"
    node scripts/legacy/render-whiteboard.mjs --input "$brief" --output "$svg" >/dev/null
    node -e 'const fs=require("fs"); const brief=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const svg=fs.readFileSync(process.argv[2],"utf8"); const expected={ "neo-grid-bold": "data-creative-renderer=\"neo-grid\"", "riptide-cobalt": "data-creative-renderer=\"riptide-cobalt\"" }[brief.style]; if (expected && !svg.includes(expected)) { console.error(`${brief.style} must use its dedicated creative renderer, not the generic expression renderer`); process.exit(1); }' "$brief" "$svg"
    node scripts/check-svg-layout.mjs "$svg" >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$svg" -o "$png" -f svg >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$svg" -f svg --check >/dev/null
  fi
done

tmp_draft_brief="$(mktemp)"
cat > "$tmp_draft_brief" <<'JSON'
{
  "layout": "conclusion-first",
  "style": "professional-blue",
  "title": "草稿指标测试",
  "summary": "这份 brief 应该允许带业务语义的草稿指标。",
  "modules": [
    {"title": "模块一", "body": ["短句"], "tag": "标签", "metric": "覆盖率提升至 xx%"},
    {"title": "模块二", "body": ["短句"], "tag": "标签", "metric": "提效提升至 xx%"},
    {"title": "模块三", "body": ["短句"], "tag": "标签"}
  ]
}
JSON
node scripts/validate-brief.mjs "$tmp_draft_brief" >/dev/null
rm -f "$tmp_draft_brief"

tmp_duplicate_metric_brief="$(mktemp)"
cat > "$tmp_duplicate_metric_brief" <<'JSON'
{
  "layout": "conclusion-first",
  "style": "professional-blue",
  "title": "重复指标测试",
  "summary": "这份 brief 应该拒绝重复指标。",
  "modules": [
    {"title": "模块一", "body": ["短句"], "tag": "标签", "metric": "覆盖率目标 xx%"},
    {"title": "模块二", "body": ["短句"], "tag": "标签", "metric": "覆盖率目标 xx%"},
    {"title": "模块三", "body": ["短句"], "tag": "标签"}
  ]
}
JSON
if node scripts/validate-brief.mjs "$tmp_duplicate_metric_brief" >/dev/null 2>&1; then
  echo "duplicate metric validation failed" >&2
  rm -f "$tmp_duplicate_metric_brief"
  exit 1
fi
rm -f "$tmp_duplicate_metric_brief"

tmp_summary_width_brief="$(mktemp)"
tmp_summary_width_svg="$(mktemp).svg"
cat > "$tmp_summary_width_brief" <<'JSON'
{
  "layout": "large-canvas",
  "style": "professional-blue",
  "title": "李想谈AI时代人才画像",
  "subtitle": "从岗位能力转向 AI 协作、专业判断和组织适配。",
  "summaryLabel": "核心判断",
  "summary": "李想讨论的重点不是简单说“会用AI的人更值钱”，而是人才标准正在从执行经验转向专业底座、AI使用深度、工作流重构和自我迭代能力。",
  "sections": [
    {
      "type": "overview",
      "title": "核心模块",
      "items": [
        {"title": "专业底座", "body": ["先有判断，再用 AI 放大执行。"], "metric": "能力基础"},
        {"title": "AI 使用深度", "body": ["从工具使用进入工作流重构。"], "metric": "协作深度"},
        {"title": "组织适配", "body": ["能在团队中复用经验和方法。"], "metric": "协同能力"}
      ]
    }
  ]
}
JSON
node scripts/legacy/render-whiteboard.mjs --input "$tmp_summary_width_brief" --output "$tmp_summary_width_svg" >/dev/null
node -e 'const fs=require("fs"); const svg=fs.readFileSync(process.argv[1],"utf8"); const expected="李想讨论的重点不是简单说“会用AI的人更值钱”，而是人才标准正在从执行经验转向专业底座、AI使用深度、工作流重构和自我迭代能力。"; if (!svg.includes(`>${expected}</tspan>`)) { console.error("summary width regression: large-canvas summary was split despite available width"); process.exit(1); }' "$tmp_summary_width_svg"
rm -f "$tmp_summary_width_brief" "$tmp_summary_width_svg"

while IFS= read -r -d '' svg; do
  png="${svg%.svg}.png"
  npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$svg" -o "$png" -f svg >/dev/null
  npx -y @larksuite/whiteboard-cli@^0.2.12 -i "$svg" -f svg --check >/dev/null
  if grep -nE '<polygon|opacity=|fill-opacity=|stroke-opacity=|<filter|<linearGradient|<radialGradient|<clipPath|<mask' "$svg"; then
    echo "forbidden SVG feature found in $svg" >&2
    exit 1
  fi
done < <(find examples/layout-tests -maxdepth 1 -type f -name '*.svg' ! -name 'generated-*' -print0)

node scripts/test-capabilities.mjs >/dev/null
node scripts/test-content-coverage.mjs >/dev/null
node scripts/test-semantic-model.mjs >/dev/null
node scripts/test-semantic-compiler.mjs >/dev/null
node scripts/test-expression-planner.mjs >/dev/null
node scripts/test-v44-brief-compiler.mjs >/dev/null
node scripts/test-run-whiteboard-v44.mjs >/dev/null
node scripts/test-v44-evaluator.mjs >/dev/null
node scripts/test-v44-source-catalog.mjs >/dev/null
node scripts/validate-v44-source-catalog.mjs examples/evals/v44-internal/source-catalog.json >/dev/null
node scripts/test-v44-benchmark-builder.mjs >/dev/null
node scripts/test-v44-internal-evaluator.mjs >/dev/null
node scripts/test-v44-onepage-badcases.mjs >/dev/null
node scripts/test-scenario-router.mjs >/dev/null
node scripts/test-v4-layout-tree.mjs >/dev/null
node scripts/test-v4-grid-quality.mjs >/dev/null
node scripts/test-v43-adaptive-render.mjs >/dev/null
node scripts/test-v43-visual-quality.mjs >/dev/null
node scripts/test-v43-flow-render.mjs >/dev/null
node scripts/test-run-whiteboard.mjs >/dev/null
node scripts/test-v43-evaluator.mjs >/dev/null

echo "ok: layout test fixtures rendered and checked"
