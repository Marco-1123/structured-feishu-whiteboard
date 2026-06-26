# V3.2 Controlled Expressiveness

Purpose: record how V3.2 expands information expression while preserving the deterministic quality bar established in V2 and V3.1.

## Decision

V3.2 is a controlled expressiveness upgrade, not a free-layout upgrade.

The user rejected two extremes:

- only changing colors and card styles, because the output still feels like repeated boxes,
- returning to highly divergent free whiteboard generation, because results become unstable and often unusable.

The chosen direction is to add a small set of schema-backed expression primitives. Each primitive must have:

- JSON brief schema,
- deterministic renderer,
- sample brief,
- generated preview,
- whiteboard check.

## First Batch

V3.2 introduces three pilot layouts:

- `milestone-timeline`: for version iteration, event progress, and milestone recap.
- `funnel`: for filtering, conversion, narrowing, and prioritization.
- `pyramid`: for hierarchy, priority, capability base, and strategy-to-execution support.

These layouts use `renderTarget: "dsl"` and `scripts/render-whiteboard-dsl.mjs`.

The existing report templates continue to use SVG and `scripts/render-whiteboard.mjs`.

## Boundary

DSL is allowed only as a controlled renderer output. It is not permission for an agent to hand-compose arbitrary Feishu whiteboard nodes.

If a structure cannot be expressed by an existing SVG renderer or V3.2 DSL renderer, the agent should either:

- map it back to `conclusion-first`, `problem-breakdown`, or `large-canvas`, or
- explicitly treat it as a future renderer candidate.

## Design Intent

The new primitives should improve information form, not decoration.

- Timeline expresses sequence better than cards.
- Funnel expresses narrowing better than process cards.
- Pyramid expresses hierarchy better than parallel modules.

The visual style remains restrained and work-oriented. V3.2 should not introduce high-saturation palettes, poster composition, or uncontrolled illustration.

## Relationship To V4

V3.2 is the pilot for multi-rendering.

V4 should be considered only after the DSL primitives prove stable enough in real Feishu documents. V4 can then productize multi-rendering as an engine-level capability instead of a few layout-specific scripts.

## Related Pages

- `wiki/topics/v3-layout-style-system.md`
- `wiki/topics/v31-style-differentiation-research.md`
- `wiki/cases/renderer-bypass-regression.md`
