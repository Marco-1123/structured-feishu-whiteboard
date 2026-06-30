# V3.4 Data Expression Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four controlled data-expression components to V3.4 so expression canvases can vary by information relationship instead of repeating card grids.

**Architecture:** Extend the existing `expression-canvas` path rather than adding a new renderer. New components are schema-backed `expressionBlocks` and rendered by deterministic SVG helpers inside `scripts/render-whiteboard.mjs`. Regression fixtures prove each component renders without falling back to freehand SVG.

**Tech Stack:** JSON Schema, Node.js SVG renderer, existing layout fixtures, `scripts/validate-layout-tests.sh`, `whiteboard-cli`.

---

### Task 1: Extend The Brief Schema

**Files:**
- Modify: `schemas/whiteboard-brief.schema.json`

- [ ] Add the four V3.4 expression block types to `expressionBlocks[].type`: `status-board`, `trend-sparkline`, `decision-matrix`, `variance-bridge-v2`.
- [ ] Keep the existing `expressionBlocks[].items[]` shape so V3.4 uses the current label/value/note/status contract.
- [ ] Do not add a new top-level layout; V3.4 stays under `layout: "expression-canvas"`.

Verification:

```bash
node scripts/validate-brief.mjs examples/briefs/v34-dashboard-components.json
```

Expected after Task 3 creates the fixture: validation passes.

### Task 2: Add Renderer Helpers

**Files:**
- Modify: `scripts/render-whiteboard.mjs`

- [ ] Add `renderStatusBoardBlock(x, y, w, h, c, block)`.
- [ ] Add `renderTrendSparklineBlock(x, y, w, h, c, block)`.
- [ ] Add `renderDecisionMatrixBlock(x, y, w, h, c, block)`.
- [ ] Add `renderVarianceBridgeV2Block(x, y, w, h, c, block)`.
- [ ] Add `renderExpressionBlockByType(x, y, w, h, c, block, options = {})` to route block types.
- [ ] Keep all colors semantic: series colors for parallel data, risk colors only for explicit risk/status modules.
- [ ] Use only editable SVG primitives: `rect`, `line`, `polyline`, `polygon`, `text`; no gradients, filters, masks, clip paths, or opacity.

### Task 3: Wire Components Into Expression Modes

**Files:**
- Modify: `scripts/render-whiteboard.mjs`

- [ ] Let `dashboard-onepage` prefer `status-board` over plain risk/action-only lower panels when present.
- [ ] Let `dashboard-onepage` render `trend-sparkline` in the middle band when provided.
- [ ] Let `narrative-map` render `decision-matrix` if present instead of a generic evidence list.
- [ ] Let `modular-canvas` render `variance-bridge-v2` if present instead of a ranked/list block.
- [ ] Preserve all existing V3.3 layouts when new block types are absent.

### Task 4: Add V3.4 Fixtures

**Files:**
- Create: `examples/briefs/v34-dashboard-components.json`
- Create: `examples/briefs/v34-decision-matrix.json`
- Create: `examples/briefs/v34-variance-bridge-v2.json`
- Generated: `examples/layout-tests/generated-v34-dashboard-components.svg`
- Generated: `examples/layout-tests/generated-v34-dashboard-components.png`
- Generated: `examples/layout-tests/generated-v34-decision-matrix.svg`
- Generated: `examples/layout-tests/generated-v34-decision-matrix.png`
- Generated: `examples/layout-tests/generated-v34-variance-bridge-v2.svg`
- Generated: `examples/layout-tests/generated-v34-variance-bridge-v2.png`

- [ ] Fixture 1 must include `status-board` and `trend-sparkline`.
- [ ] Fixture 2 must include `decision-matrix`.
- [ ] Fixture 3 must include `variance-bridge-v2`.
- [ ] All fixtures must use existing production styles.

### Task 5: Update Documentation And Wiki

**Files:**
- Modify: `references/expression-grammar.md`
- Modify: `wiki/topics/future-product-roadmap.md`
- Modify: `wiki/log.md`

- [ ] Document when to use each V3.4 component.
- [ ] Document that V3.4 is component expansion, not style expansion.
- [ ] Record the component set and the continued deterministic renderer requirement.

### Task 6: Verify

**Commands:**

```bash
bash scripts/validate-layout-tests.sh
```

Expected: `ok: layout test fixtures rendered and checked`.

Additional checks:

```bash
rg -n "<(linearGradient|radialGradient|filter|clipPath|mask)|opacity=" examples/layout-tests/generated-v34-*.svg
```

Expected: no matches.

