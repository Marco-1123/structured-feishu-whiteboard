#!/usr/bin/env bash
set -euo pipefail

fail=0

check_cmd() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "missing: $name"
    fail=1
  else
    echo "ok: $name ($("$name" --version 2>/dev/null | head -n 1 || true))"
  fi
}

check_cmd node
check_cmd npm
check_cmd npx
check_cmd lark-cli

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$node_major" -lt 20 ]; then
    echo "warning: Node.js 20 or newer is recommended; current major is $node_major"
  fi
fi

if command -v npx >/dev/null 2>&1; then
  if npx -y @larksuite/whiteboard-cli@^0.2.12 -v >/dev/null 2>&1; then
    echo "ok: @larksuite/whiteboard-cli"
  else
    echo "missing or unavailable: @larksuite/whiteboard-cli"
    fail=1
  fi
fi

if command -v lark-cli >/dev/null 2>&1; then
  if lark-cli auth status >/dev/null 2>&1 && lark-cli auth list >/dev/null 2>&1; then
    echo "ok: lark-cli user auth"
  else
    echo "warning: lark-cli user auth not confirmed; run lark-cli auth login if whiteboard write fails"
  fi
fi

exit "$fail"
