# V4.3 Beta.2 Adaptive Density Design

## Status

Approved from cross-Agent V4.3 beta feedback. The reported board is geometrically clean but visually over-expanded: multiple short list sections become full-width rows and stack into a long, repetitive page.

## Goal

Make V4.3 choose component width and internal arrangement from measured content demand, so short information compacts into balanced grids while genuinely dense content remains readable at full width.

## Root Cause

The current V4 renderer uses a one-way safety heuristic introduced by V4.2:

- list blocks with four or more items, or text above a fixed character threshold, become full width;
- every full-width block flushes both columns before the next block;
- list items inside that block are always rendered as full-width rows;
- the visual gate counts outer rectangle area as occupied area and does not measure internal content utilization.

This prevents narrow overflow but overfits the V4.2 badcase. Sparse four-item blocks receive the same treatment as four long explanatory paragraphs.

## Non-Goals

- No new top-level layout family or visual style.
- No freeform LLM-authored coordinates.
- No semantic content compiler; that remains a V4.4 concern.
- No generic constraint-solver dependency in this beta repair.
- No change to V3 or DSL rendering paths.

## 1. Intrinsic Block Profile

Add `profileExpressionBlock(block)` in `scripts/lib/v4-layout-tree.mjs`. It returns deterministic layout intent:

```js
{
  span: 4 | 6 | 8 | 12,
  minSpan: 4 | 6 | 8 | 12,
  preferredSpan: 4 | 6 | 8 | 12,
  maxSpan: 4 | 6 | 8 | 12,
  density: "sparse" | "medium" | "dense",
  itemLayout: "rows" | "grid-2" | "grid-3",
  reason: "short-parallel-items"
}
```

The profile uses item count, maximum item text length, total text length, note presence, block type, and directional semantics. It must not decide width from item count alone.

Rules:

- `narrative-chain`, `mini-roadmap`, and `variance-bridge-v2` remain full width because direction is the primary reading relation.
- A short list with up to three compact items may use one third width.
- Four to six short parallel items use half or two-thirds width and a two- or three-column internal grid.
- Lists with long notes or high measured line demand use full width and row layout.
- Progress, trend, status, decision, risk, evidence, and action blocks may use half or two-thirds width according to demand.

## 2. Twelve-Column Ordered Grid

Replace the binary half/full layout with an ordered 12-column row packer.

- Supported spans are 4, 6, 8, and 12 columns.
- Blocks preserve brief order.
- A block is placed in the current row if its span fits; otherwise the row is closed and the next row begins.
- All blocks in a row share the row top. The next row starts after the tallest block plus the standard gap.
- A 12-column block always starts a new row and closes it.
- The layout tree records `span`, `row`, and `preferredSpan` in addition to geometry.

This intentionally favors predictable reading order over masonry packing. The existing shorter-column algorithm is retained only for legacy test compatibility through an explicit mode, not for beta.2 expression composition.

## 3. Adaptive List Interior

Update V4 list rendering to consume the profile's `itemLayout`:

- `rows`: current vertical rows, for long or explanation-heavy items.
- `grid-2`: two equal columns, for four to six compact parallel items.
- `grid-3`: three equal columns, for three to six very short items when the parent width permits.

Each list item measures its own label and note. Grid items receive a stable minimum height and expand by line count. No item may be compressed by shrinking typography.

## 4. Semantic Density Markers

Top-level V4.3 SVG markers gain:

- `data-span`
- `data-density`
- `data-preferred-width`
- `data-text-units`
- `data-item-count`
- `data-item-layout`

These attributes let quality checks detect over-expansion without parsing rendered text geometry heuristically.

## 5. Visual Quality Gate

Add deterministic checks:

- **Overstretch:** sparse non-directional blocks wider than their preferred width by more than one grid step fail.
- **Sparse full-width repetition:** three consecutive full-width sparse non-directional blocks fail.
- **Content utilization:** a wide block with low text demand and no chart/directional content fails.
- **Long-page inefficiency:** when compacting valid spans could reduce page height materially, the generated full-width stack fails.

Directional blocks and charts are exempt from text-utilization thresholds because their visual marks legitimately consume space.

## 6. Regression Cases

Add a new brief that reproduces the cross-Agent failure:

- three metric cards;
- one compact status board;
- three list sections with four short items each;
- one five-node process/roadmap section.

Required assertions:

- short list sections do not all render full width;
- at least two compact sections share a row;
- compact list items use a grid interior;
- canvas height is materially below the old full-stack baseline;
- the V4.2 dense architecture fixture still promotes long lists to full width;
- all Feishu SVG checks continue to pass.

## Error Handling

- If a profile cannot determine a safe compact span, use 12 columns and row layout.
- If measured text exceeds a compact candidate, increase span before increasing height.
- If full width still overflows, expand row height; never reduce the established font scale.
- Quality failures name the block ID, selected span, preferred span, and density reason.

## Acceptance Criteria

1. The sparse-stack regression brief renders at least two non-directional content blocks on one row.
2. Four short list items render as a compact grid, not four full-width internal rows.
3. Three consecutive sparse full-width list blocks are rejected by the visual gate.
4. The V4.2 dense architecture fixture remains readable and passes all checks.
5. Existing dashboard, narrative, modular, linear-flow, and swimlane fixtures pass.
6. No text overflow, overlap, clipping, connector regression, or unsupported SVG feature appears.
7. A real Feishu document contains the repaired sparse case and the dense V4.2 regression case.

## Version And Release

- Set `VERSION` and next-channel capability version to `4.3.0-beta.2`.
- Keep branch `codex/v4.3-control-plane` and stable `main` unchanged.
- Update the local installed Skill only after full local and Feishu acceptance passes.
