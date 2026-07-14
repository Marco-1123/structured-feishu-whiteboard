# V4.4 OnePage bad-case retrospective

## What failed

The July 2026 cross-Agent samples exposed a system failure rather than an isolated SVG bug:

1. The planner selected a page skeleton, but the renderer treated it mostly as a sorting hint.
2. Sparse blocks were greedily stacked and stretched, producing long report strips instead of compact onepages.
3. Repeated label/note text inflated component demand and made cards look mechanically templated.
4. Numeric business facts could degrade into text lists, while years, staffing constraints, and approval levels could be misclassified as metrics.
5. Metadata could claim a fact was covered even when the visible sentence had been clipped away.
6. Automated checks verified geometry but did not enforce onepage aspect, balanced peer grids, or structural diversity.

## First-principles correction

- Content is mapped to visual roles before layout: metric, process, capability, evidence, risk, and action are not interchangeable text rows.
- `pageSkeleton` changes geometry, not only ordering. Overview/detail, centered system, past/future split, left/right argument, comparison, timeline, and swimlane have explicit span rules.
- A onepage expands only inside a bounded aspect range. Capacity is increased through two-dimensional composition, component choice, and balanced grids before canvas height.
- Three and five peer items must use complete grids. One or two sparse items remain compact and may be centered or paired.
- A final unpaired support module must not float as a narrow centered card. It becomes a full-width closing band so the page retains a stable visual base.
- Evidence, risk, and action are semantic roles rather than mandatory sections. Preserve their facts, but embed singleton support facts into compatible structures and reserve independent regions for material content.
- A closing-band item without secondary text centers its primary label vertically; fixed two-line slots must not create a false missing-content state.
- A fact counts as selected only when its visible representation contains that fact. Truncated aggregate copy cannot claim hidden fact IDs.
- Labels and notes must add different information. The same sentence cannot be rendered twice inside one item.

## Regression gates

- V4.4 expression onepage aspect ratio: `1.1-2.4`.
- V4.4 flow canvas must not become a vertical report strip.
- No overflow, overlap, clipping, excessive bottom whitespace, or sparse full-width repetition.
- Important-fact coverage and visible-fact coverage must both equal 100% in the internal benchmark.
- All six semantic scenarios must each demonstrate at least two valid page structures.
- The two audit-assistant bad cases remain permanent fixtures under `examples/evals/v44-badcases/`.

## Release conclusion

V4.4 Beta.2 corrects the layout system rather than patching the screenshots. The remaining validation work should focus on cross-Agent material quality and style preference, not reintroducing free-form SVG generation or unlimited vertical growth.

## Beta.7: cross-Agent content truncation

The cross-Agent failure was not primarily a renderer defect. A sparse inventory could pass because the old coverage check only compared the inventory with the brief; it never proved that the inventory represented the raw source. A second gap allowed medium facts and component items to disappear after planning while the block still claimed coverage.

Beta.7 therefore adds three independent gates:

1. Raw source to inventory: every fact needs a source quote that exists in the source snapshot, with minimum fact diversity and numeric recall.
2. Inventory to semantic plan: critical, high, and medium facts cannot be silently deferred.
3. Brief to visible component: every item-based block must carry an explicit source fact ID for every fact it claims to render.

For product and capability material, Beta.7 also introduces a controlled scene grammar inspired by the native Lark whiteboard workflow. Ordered usage stages and parallel capabilities are rendered as one layered system map. Evidence remains evidence, parallel capabilities have no false connectors, and no compatibility rule may invent a process step merely to complete a template.
