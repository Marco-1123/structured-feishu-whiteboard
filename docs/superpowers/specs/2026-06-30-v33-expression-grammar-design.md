# V3.3 Controlled Expression Grammar Design

## Purpose

V3.3 upgrades `structured-feishu-whiteboard` from a template selector to a controlled expression system.

V3.2 already provides stable layouts and DSL scenes, but repeated use can still feel like the same card-based onepage. V3.3 should add visual variety without returning to freehand SVG or uncontrolled whiteboard generation.

The core change is:

> identify information relationships first, then compose a onepage from controlled expression modules.

## Non-goals

- Do not introduce freehand SVG or freehand whiteboard DSL generation.
- Do not replace V3.2 stable layouts.
- Do not add decorative visual styles as the main upgrade.
- Do not let every material become a dashboard.
- Do not implement the Web Workbench / visual decision loop in V3.3; keep it as a later product direction.

## User-facing Change

When a user provides long, mixed, or complex material, the Skill should no longer simply compress it into several equal cards. It should decide whether the material contains:

- status and indicators,
- argument and causality,
- evidence and risk,
- actions and ownership,
- stages and progress,
- comparison and trade-offs.

The output should still be a single Feishu whiteboard onepage, but the page may contain different controlled modules: metric cards, progress bars, ranked bars, risk blocks, action blocks, narrative chains, compact evidence lists, and modular content tiles.

## V3.3 Directions

### A. Dashboard Onepage

Use when the material has multiple indicators, status signals, risks, progress, or operating review content.

Expected modules:

- top-level judgment,
- metric cards,
- progress bars,
- ranked contribution bars,
- risk and action blocks,
- optional small evidence area.

This is not a generic grid of cards. The visual priority should make status, trend, and action readable at a glance.

### B. Narrative Map

Use when the material is mainly a viewpoint, diagnosis, decision rationale, or recommendation.

Expected modules:

- problem or claim,
- cause / evidence / risk,
- decision or recommendation,
- action path.

The page should show the reasoning path, not only parallel boxes.

### C. Modular Canvas

Use when the material contains multiple relationship types and cannot be represented by one pure pattern.

Expected modules:

- large judgment module,
- smaller metric / evidence / risk modules,
- route or progress module,
- action module.

The canvas uses a fixed grid and approved module types, but module sizes and positions may vary according to content type.

## Architecture

### Brief schema

Add a V3.3 brief path that supports controlled composition:

- `layout: "expression-canvas"`
- `expressionMode`: `dashboard-onepage`, `narrative-map`, or `modular-canvas`
- `expressionBlocks[]`: typed blocks with constrained fields.

Suggested block types:

- `statement`
- `metric-card`
- `progress-bar`
- `ranked-bar`
- `risk-list`
- `action-list`
- `evidence-list`
- `narrative-chain`
- `mini-roadmap`
- `comparison-summary`

Each block type must have strict capacity limits. Text and numeric values remain short. Long explanations stay in the accompanying document text, not inside the board.

### Selection logic

Add a new reference document: `references/expression-grammar.md`.

It should define:

- when to use V3.3 expression canvas,
- when to use A/B/C modes,
- when to fall back to V3.2 layouts,
- how to avoid over-composing too many module types in one page.

### Renderer

Extend the deterministic renderer with `renderExpressionCanvas`.

The renderer owns:

- grid geometry,
- module size presets,
- safe spacing,
- typography,
- icon-free status marks,
- connectors only when relationship direction is explicit.

The Agent owns:

- extracting the content,
- selecting the expression mode,
- filling the typed blocks.

### Quality control

V3.3 adds more visual diversity, so checks must become stricter:

- block text must not touch divider lines,
- title and subtitle spacing must remain stable,
- progress and bar values must stay inside their tracks,
- no module may rely on arbitrary manual coordinates,
- if a block overflows, the renderer must hide or reject it rather than silently produce a broken board.

## Compatibility

V3.2 remains the stable fallback.

Use V3.3 only when the input clearly benefits from mixed expression:

- complex long text,
- operating review,
- data and risks,
- decision rationale,
- strategy or project dashboard.

Use V3.2 when the material clearly matches a single existing pattern:

- pure timeline,
- pure funnel,
- pure pyramid,
- pure comparison matrix,
- pure process chain,
- concise conclusion-first report.

## Testing

Add at least three briefs:

- dashboard onepage: indicators, progress, risk, action,
- narrative map: problem, cause, evidence, recommendation, action,
- modular canvas: mixed long-form project material.

For each:

- validate schema,
- render SVG or DSL,
- run existing layout checks,
- visually inspect preview,
- confirm no text overlap, line collision, clipped block, or useless blank area.

Regression tests must keep V3.2 samples passing.

## Success Criteria

V3.3 is successful if:

- repeated generations no longer feel like the same card template,
- the output remains deterministic and reproducible,
- users can see richer information forms without losing professional work-report aesthetics,
- V3.2 stable layouts are not degraded,
- other Agents can follow the Skill without inventing uncontrolled layouts.
