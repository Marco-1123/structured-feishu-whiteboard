#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

node scripts/generate-layout-test-fixtures.mjs >/dev/null

for brief in examples/briefs/*.json; do
  svg="examples/layout-tests/generated-$(basename "${brief%.json}").svg"
  png="${svg%.svg}.png"
  node scripts/validate-brief.mjs "$brief" >/dev/null
  node scripts/render-whiteboard.mjs --input "$brief" --output "$svg" >/dev/null
  npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$svg" -o "$png" -f svg >/dev/null
  npx -y @larksuite/whiteboard-cli@^0.2.11 -i "$svg" -f svg --check >/dev/null
done

tmp_bad_brief="$(mktemp)"
cat > "$tmp_bad_brief" <<'JSON'
{
  "layout": "conclusion-first",
  "style": "professional-blue",
  "title": "占位指标测试",
  "summary": "这份 brief 应该因为包含 xx% 被拒绝。",
  "modules": [
    {"title": "模块一", "body": ["短句"], "tag": "标签", "metric": "xx%"},
    {"title": "模块二", "body": ["短句"], "tag": "标签"},
    {"title": "模块三", "body": ["短句"], "tag": "标签"}
  ]
}
JSON
if node scripts/validate-brief.mjs "$tmp_bad_brief" >/dev/null 2>&1; then
  echo "placeholder metric validation failed" >&2
  rm -f "$tmp_bad_brief"
  exit 1
fi
rm -f "$tmp_bad_brief"

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
