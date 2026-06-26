#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

node scripts/generate-layout-test-fixtures.mjs >/dev/null

for brief in examples/briefs/*.json; do
  target="$(node -e 'const fs=require("fs"); const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(b.renderTarget || "svg")' "$brief")"
  node scripts/validate-brief.mjs "$brief" >/dev/null
  if [ "$target" = "dsl" ]; then
    dsl="examples/layout-tests/generated-$(basename "${brief%.json}").json"
    png="${dsl%.json}.png"
    node scripts/render-whiteboard-dsl.mjs --input "$brief" --output "$dsl" >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$dsl" -o "$png" >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$dsl" --check >/dev/null
  else
    svg="examples/layout-tests/generated-$(basename "${brief%.json}").svg"
    png="${svg%.svg}.png"
    node scripts/render-whiteboard.mjs --input "$brief" --output "$svg" >/dev/null
    node scripts/check-svg-layout.mjs "$svg" >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$svg" -o "$png" -f svg >/dev/null
    npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$svg" -f svg --check >/dev/null
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

for svg in examples/layout-tests/*.svg; do
  png="${svg%.svg}.png"
  npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$svg" -o "$png" -f svg >/dev/null
  npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$svg" -f svg --check >/dev/null
  if grep -nE '<polygon|opacity=|fill-opacity=|stroke-opacity=|<filter|<linearGradient|<radialGradient|<clipPath|<mask' "$svg"; then
    echo "forbidden SVG feature found in $svg" >&2
    exit 1
  fi
done

echo "ok: layout test fixtures rendered and checked"
