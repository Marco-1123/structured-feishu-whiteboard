# V3.3 Expression Grammar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controlled V3.3 expression-canvas path so complex materials can render as dashboard, narrative, or modular onepages instead of repeating equal card grids.

**Architecture:** Extend the existing JSON brief, validator, and deterministic SVG renderer. Keep V3.2 layouts unchanged and add `expression-canvas` as an opt-in SVG layout with typed `expressionBlocks`.

**Tech Stack:** Node.js scripts, JSON brief validation, deterministic SVG rendering, existing whiteboard CLI layout checks.

---

## Files

- Modify `schemas/whiteboard-brief.schema.json`: add `expression-canvas`, `expressionMode`, and `expressionBlocks`.
- Modify `scripts/validate-brief.mjs`: validate V3.3 modes and block capacity.
- Modify `scripts/render-whiteboard.mjs`: add `renderExpressionCanvas` and reusable block renderers.
- Add `references/expression-grammar.md`: selection and fallback rules.
- Modify `SKILL.md`, `references/deterministic-rendering.md`, `references/layout-library.md`: document V3.3 usage.
- Add examples:
  - `examples/briefs/v33-dashboard-onepage.json`
  - `examples/briefs/v33-narrative-map.json`
  - `examples/briefs/v33-modular-canvas.json`

## Tasks

### Task 1: Schema and Validator

- [ ] Add `expression-canvas` to supported layouts.
- [ ] Add `expressionMode` enum: `dashboard-onepage`, `narrative-map`, `modular-canvas`.
- [ ] Add `expressionBlocks[]` with strict typed blocks.
- [ ] Validate required blocks per mode:
  - dashboard: `statement`, `metric-card`, `progress-bar`, `risk-list`, `action-list`
  - narrative: `statement`, `narrative-chain`, `evidence-list`, `action-list`
  - modular: at least `statement`, one metric/progress/evidence block, one risk/action block

### Task 2: Renderer

- [ ] Add `renderExpressionCanvas`.
- [ ] Render in 2200 x 1320 onepage canvas.
- [ ] Use fixed zones per mode:
  - dashboard: top statement, metric strip, progress/ranked/risk/action grid.
  - narrative: top statement, reasoning chain, evidence/action bottom.
  - modular: asymmetric module grid with statement, metrics, route/evidence, risks/actions.
- [ ] Add block renderers for metrics, progress bars, ranked bars, evidence, risk, action, and narrative chain.

### Task 3: Documentation

- [ ] Add `references/expression-grammar.md`.
- [ ] Update Skill quick workflow and selection rules.
- [ ] Update deterministic rendering support list.
- [ ] Update layout library with V3.3 expression-canvas rules.

### Task 4: Examples and Validation

- [ ] Add three V3.3 briefs.
- [ ] Run `bash scripts/validate-layout-tests.sh`.
- [ ] Inspect generated PNGs for text collisions, line collisions, clipped blocks, and useless blank space.
- [ ] Commit implementation after tests pass.
