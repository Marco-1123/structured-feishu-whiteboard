# V3.3 Expression Grammar

V3.3 adds controlled expression composition for complex onepage whiteboards. It is not freeform design. Use it only when a single V3.2 layout would force very different information types into equal cards.

## Core Rule

Do this:

1. Identify information relationships.
2. Select one expression mode.
3. Fill typed expression blocks.
4. Render with `layout: "expression-canvas"`.

Do not handwrite SVG or DSL.

## When to Use

Use `expression-canvas` when the material contains at least three of these relationship types:

- status or indicators,
- progress or completion,
- contribution or ranking,
- trend or time-series change,
- decision matrix or option selection,
- start/end variance attribution,
- problem and cause,
- evidence and risk,
- action and ownership,
- decision and trade-off.

Do not use it for pure timelines, pure funnels, pure pyramids, pure process chains, simple comparison matrices, or short conclusion-first summaries. Those should stay on V3.2 layouts.

## Modes

### dashboard-onepage

Use for operating reviews, project status, KPI reviews, risk dashboards, and progress summaries.

Required blocks:

- 1 `statement`
- at least 3 `metric-card`
- 1 `progress-bar`
- 1 `risk-list`
- 1 `action-list`

Optional:

- 1 `ranked-bar`
- 1 `evidence-list`
- 1 `status-board`
- 1 `trend-sparkline`

### narrative-map

Use for diagnosis, viewpoint explanation, recommendation logic, and decision rationale.

Required blocks:

- 1 `statement`
- 1 `narrative-chain`
- 1 `evidence-list`
- 1 `action-list`

Optional:

- 1 `risk-list`
- 1 `decision-matrix`

### modular-canvas

Use for mixed long-form materials where no single pattern dominates.

Required:

- 1 `statement`
- at least one signal block: `metric-card`, `progress-bar`, `ranked-bar`, `evidence-list`, `status-board`, `trend-sparkline`, or `variance-bridge-v2`
- at least one closure block: `risk-list`, `action-list`, `status-board`, or `mini-roadmap`

Use this mode when the board should look less like a repeated card grid while still staying deterministic.

## Block Rules

- `statement`: one main conclusion, 1 to 3 short lines.
- `metric-card`: one number, one label, optional note.
- `progress-bar`: 2 to 5 progress items with percentages or meaningful placeholder values.
- `ranked-bar`: 3 to 5 ranked items.
- `risk-list`: 2 to 5 risks, each short enough to fit a pill or compact row.
- `action-list`: 2 to 5 next actions.
- `evidence-list`: 2 to 5 evidence points.
- `narrative-chain`: 2 to 5 ordered reasoning nodes.
- `mini-roadmap`: 2 to 5 ordered phases.
- `comparison-summary`: 2 to 5 trade-off items.
- `status-board`: 3 to 6 status items. Use for health, ownership, risk state, progress state, and project status. Status-board color is semantic, not decorative.
- `trend-sparkline`: 3 to 6 ordered values. Use only when the material has a visible time sequence or trend. Do not use it for unrelated parallel indicators.
- `decision-matrix`: 3 to 4 options with recommendation labels and short rationale. Use for tool choice, route choice, priority choice, or container choice.
- `variance-bridge-v2`: 4 to 6 items where the first item is the start value, the last item is the end value, and middle items are signed change factors. Use only when the core story is change attribution.

## V3.4 Component Selection

V3.4 expands data-expression components. The core behavior should be "choose components by information relationship", not "decorate a card template".

Use these rules:

- If the input contains status levels, owners, blockers, health state, or risk state, prefer `status-board`.
- If the input contains values across weeks, months, versions, stages, or before/after points, prefer `trend-sparkline`.
- If the input compares multiple options against criteria, prefer `decision-matrix`.
- If the input explains why a number changed from start to end, prefer `variance-bridge-v2`.
- If none of these relationships are present, keep using V3.3 blocks rather than forcing a data component.

Do not use more than two V3.4 components in one canvas unless the material is explicitly a dashboard. Too many component types can make the board feel like a component demo instead of a coherent report.

## Fallback

Fall back to V3.2 when:

- the relationship is clearly one of the existing controlled layouts,
- the input lacks indicators, risks, evidence, or actions,
- the user explicitly wants a clean simple onepage,
- the generated expression blocks would exceed 9 blocks.

## Quality Checks

Before writing to Feishu, verify:

- no text touches a divider line,
- no block clips its content,
- no progress or ranked bar exceeds its track,
- no trend point label collides with the line or frame,
- no decision matrix row exceeds its frame,
- no variance bridge bar loses the shared baseline,
- no arrows are used unless the relationship is directional,
- no useless blank region dominates the page,
- the board still has one clear reading order.
