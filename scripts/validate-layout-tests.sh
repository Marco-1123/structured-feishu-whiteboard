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
