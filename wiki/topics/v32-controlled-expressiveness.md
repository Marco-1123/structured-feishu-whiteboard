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

## Production Layouts

V3.2 productionizes seven controlled expression layouts:

- `milestone-timeline`: for version iteration, event progress, and milestone recap.
- `funnel`: for filtering, conversion, narrowing, and prioritization.
- `pyramid`: for hierarchy, priority, capability base, and strategy-to-execution support.
- `metric-dashboard`: for metric cards, progress bars, status review, and lightweight data analysis.
- `progress-wall`: for OKR/project completion and risk convergence, using aligned progress bars.
- `ranked-bars`: for Top-N, contribution, issue distribution, and resource share.
- `variance-bridge`: for start/end delta explanation, such as cost, headcount, revenue, or efficiency changes.

## Data Expression Expansion

After reviewing the first batch, the user confirmed that V3.2 also needs more data-analysis expression, but only if it remains stable and deterministic. This led to `progress-wall`, `ranked-bars`, and `variance-bridge` becoming part of the stable V3.2 set.

`metric-dashboard` remains the general status-review layout. It should not swallow all data cases. Use `progress-wall` when the main story is completion, `ranked-bars` when the main story is relative importance, and `variance-bridge` when the main story is change attribution. Variance bridges must encode relative magnitude through a separate bridge/bar layer; stable text cards alone are not enough.

Deferred candidates:

- quadrant priority map,
- trend small multiples.

These have valid use cases, but they are not first priority because they need more stability work and more examples.

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
- Metric dashboard expresses status, progress, and risk better than prose summaries.

The visual style remains restrained and work-oriented. V3.2 should not introduce high-saturation palettes, poster composition, or uncontrolled illustration.

## Relationship To V4

V3.2 is the first production release for controlled multi-rendering.

V4 should be considered only after the DSL primitives prove stable enough in real Feishu documents. V4 can then productize multi-rendering as an engine-level capability instead of a few layout-specific scripts.

## Related Pages

- `wiki/topics/v3-layout-style-system.md`
- `wiki/topics/v31-style-differentiation-research.md`
- `wiki/cases/renderer-bypass-regression.md`

## Feishu Preview Lessons

Feishu-side preview can reveal issues that local checks miss. V3.2 review surfaced:

- title and subtitle spacing must be visibly separated, not just non-overlapping,
- timeline cards should not be placed where the final arrowhead visually competes with the last card,
- explanatory cards should not float in unused top-right space unless they are part of the content structure,
- progress bars should avoid foreground/background overlap if the whiteboard checker treats that as node overlap.
- variance bridge nodes should use one shared centerline; card height must not vary by value because that destabilizes arrows and text baselines.
- values, labels, and notes in data layouts must stay inside their own cards; card-outside annotations easily become misaligned in Feishu previews.

These are quality rules for future DSL primitives, not one-off sample fixes.
