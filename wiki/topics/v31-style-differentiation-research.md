# V3.1 Style Differentiation Research

Purpose: record why V3.1 moved from palette-only variation toward style-specific component grammar, and which candidate styles are currently acceptable for production use.

## Summary

V3 expanded layout count and style tokens, but the visible style difference is still weak. The root cause is not color choice alone: most styles share the same component grammar, including white cards, blue left rail, pale blue summary panel, bordered modules, and similar typography scale. A user looking at the output primarily sees the same page architecture with slightly different colors.

V3.1 should shift from "more Feishu-like palettes" to "distinct but work-safe design languages". Each style must change at least three layers:

- Color role: canvas, surface, accent, semantic colors.
- Component grammar: card shape, header treatment, divider density, badges, table treatment.
- Composition rhythm: spacing, hierarchy, density, focal area, section ordering.

## External References

- Apple HIG: system colors, typography hierarchy, materials, and layout emphasize legibility, adaptive surfaces, foreground/background separation, and consistent spacing.
- Fluent 2: tokenized color, typography, spacing, radius, and stroke; neutral surfaces with semantic state tokens.
- IBM Carbon: layered surfaces, accessible color steps, dense product/data layouts, strong grid discipline.
- Linear: reduced visual noise, precise alignment, high density, controlled accent usage.

## Diagnosis Of Current V3

Current V3 styles differ mostly by token:

- `professional-blue`, `feishu-neutral`, and `feishu-status` are all light canvas + white surface + blue accent.
- `feishu-decision-dark` was made safer after Feishu preview showed dark text instability, but that also made it visually closer to blue-white.
- The renderer does not let a style alter component grammar. `card()`, `renderHeader()`, `renderSummary()`, badges, metrics, and table rows all use the same structure.

This means new style names do not guarantee new visual outcomes.

## Recommended V3.1 Style Set

### 1. Apple Studio

Use for executive summaries, polished product concepts, and clean one-page narratives.

Borrow:

- Large calm title area, strong typography hierarchy.
- Soft grouped surfaces and roomy margins.
- Minimal lines; use spacing and panels for grouping.
- System-like blue as a precise accent.

Do not copy:

- Real blur, vibrancy, translucency, or glass effects. Feishu SVG compatibility is weak for blur/filter/opacity.

Implementation direction:

- Off-white or very light gray canvas.
- Rounded large panels, fewer boxed cards.
- More whitespace and larger focal statement.
- Capsule badges instead of bordered chips.
- Use dividers sparingly.

### 2. Fluent Workbench

Use for daily operations, process dashboards, status/risk/metric views.

Borrow:

- Design tokens by role, not raw colors.
- 4px-based spacing discipline.
- Clear status colors with text/labels, not color-only meaning.
- Neutral surfaces with semantic state accents.

Implementation direction:

- Neutral canvas, clear cards, compact status bands.
- More visible state labels: risk, done, blocked, pending.
- Slightly denser than Apple Studio.
- Good default for process-chain and roadmap.

### 3. Carbon Data

Use for analysis, evidence, metrics, comparisons, before/after, and decision matrices.

Borrow:

- Strong grid and table discipline.
- Layered surfaces: base, layer 01, layer 02.
- Accessible contrast and clear data roles.
- Blue core with restrained gray scale.

Implementation direction:

- Less rounded corners, sharper enterprise feel.
- Strong table headers, row bands, metric bars, and evidence blocks.
- Supports dense but readable dashboards better than Apple-style panels.

### 4. Linear Command

Use sparingly for high-confidence strategy, product-system, or engineering narratives.

Borrow:

- Reduced visual noise.
- Precise alignment and low ornamentation.
- Dark command-center mood with one rationed accent.

Risk:

- Feishu preview can mishandle dark text contrast if SVG text color is not preserved exactly.

Implementation direction:

- Avoid full dark canvas as default.
- Prefer dark header rail, dark section title bars, or dark decision panel on light canvas.
- Require Feishu preview export before shipping any Linear-style production sample.

## Style Quality Gate

A new style only counts as real if it changes at least three of the following:

- Header composition.
- Summary/focal statement treatment.
- Card shape and density.
- Divider and grid strategy.
- Badge/metric component treatment.
- Section rhythm and whitespace.
- Accent color usage policy.

If a style only changes token values, it should not be considered a production style.

## User Review Result

Initial Feishu preview testing suggested two promising directions:

- `apple-studio`: strong fit. Keep as a V3.1 production candidate for refined, high-quality, spacious work reports.
- `linear-command`: strong fit. Keep as a V3.1 production candidate for strategy, product-system, and engineering narratives.

The user did not prefer:

- `fluent-workbench`: visually weaker and still has layout problems. Do not ship as a production style yet.
- `carbon-data`: visually weaker and still has layout problems. Do not ship as a production style yet.

Follow-up Feishu-side multi-layout review refined the implementation requirement:

- `apple-studio` is a production candidate, but it cannot be implemented as generic layout plus changed tokens. Across conclusion-first, roadmap, and process-chain it showed spacing rhythm problems, weak component expression, and insufficient polish in the Feishu preview. The fix is dedicated Apple renderer paths with stable margins, card rhythm, footer spacing, and connector behavior.
- `linear-command` remains a V3.1 production candidate. Its biggest defect was roadmap/process-chain arrows rendering as floating arrowheads because the connector line segment was too short. The renderer should connect arrows from the source card edge into the target card edge.

Decision: V3.1 production should keep `professional-blue` as default and keep both `apple-studio` and `linear-command` as production candidates. Apple Studio must use dedicated renderer paths and pass Feishu-side preview review before publishing examples. Fluent Workbench and Carbon Data remain research notes or internal renderer experiments.

## Proposed Next Step

Implement V3.1 as a style grammar upgrade, not a palette upgrade:

- Keep `professional-blue` as the stable default.
- Add two validated production style grammars:
  - `apple-studio`
  - `linear-command`
- Keep `fluent-workbench` and `carbon-data` out of production until their layout problems are fixed and user-reviewed.
- Let renderer functions branch on style grammar for headers, panels, badges, tables, and density.
- Generate identical content briefs across Apple Studio and Linear Command to compare visual difference directly.
- Insert the comparison into Feishu and verify real preview before publishing.

## Multi-Layout Coverage Result

Apple Studio and Linear Command are no longer matrix-only experiments in code. The renderer applies style-specific component grammar to shared primitives:

- header treatment,
- summary/focal statement,
- card radius and stroke density,
- metric and tag chips,
- footer panels,
- safer line wrapping that avoids splitting English words such as `Skill`.

Regression examples were added for:

- conclusion-first,
- roadmap,
- process-chain,
- comparison-matrix.

All eight Apple/Linear coverage samples passed local SVG containment checks and `whiteboard-cli --check`, but Feishu-side preview exposed quality issues that local checks missed. Therefore:

- Tool checks are necessary but not sufficient for new style promotion.
- Feishu-side preview is the acceptance source for spacing, arrow connection, component polish, and visual hierarchy.
- Apple Studio must be fixed in the renderer, not demoted.
- Linear Command remains accepted after fixing arrow connectors.

## Current Project Rule

- `apple-studio` and `linear-command` are the only V3.1 production candidates.
- `apple-studio` must use dedicated renderer paths for `conclusion-first`, `roadmap`, and `process-chain`; token swaps on generic layouts are not sufficient.
- `linear-command` may use shared layout functions, but roadmap/process-chain connectors must visibly run from source card edge to target card edge.
- Any new or changed Apple/Linear production sample must pass local checks and Feishu-side preview review before it is treated as a stable example.
- `fluent-workbench` and `carbon-data` may remain in renderer experiments, but they are not part of the production schema or production sample set.

## Related Pages

- `wiki/topics/v3-layout-style-system.md`
- `wiki/cases/renderer-bypass-regression.md`
