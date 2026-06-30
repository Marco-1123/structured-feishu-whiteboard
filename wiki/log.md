# LLM Wiki Log

Append-only timeline of wiki operations. Use a consistent heading format so future agents can scan recent activity.

## [2026-06-25] ingest | Karpathy LLM Wiki Pattern

- Added raw source: `raw/sources/karpathy-llm-wiki.md`.
- Created source summary: `wiki/sources/karpathy-llm-wiki.md`.
- Created topic page: `wiki/topics/llm-wiki-pattern.md`.
- Created project scope page: `wiki/topics/structured-feishu-whiteboard-knowledge-scope.md`.
- Created setup case: `wiki/cases/initial-wiki-setup.md`.
- Created schema and index files for future wiki maintenance.

## [2026-06-26] query | Renderer Bypass Regression

- Recorded a recurring layout failure caused by a stale installed Skill and manual SVG fallback.
- Added case page: `wiki/cases/renderer-bypass-regression.md`.
- Updated Skill rules to make deterministic rendering a production requirement instead of a preference.

## [2026-06-26] query | V3 Layout And Style System

- Added V3 direction page: `wiki/topics/v3-layout-style-system.md`.
- Recorded the principle that richer layouts must remain schema-backed and renderer-backed.
- Captured the Feishu-inspired restrained style direction for V3.

## [2026-06-26] query | V3.1 Style Differentiation Research

- Added research page: `wiki/topics/v31-style-differentiation-research.md`.
- Diagnosed that V3 style differences are weak because renderer component grammar is mostly unchanged.
- Proposed a V3.1 style grammar upgrade using Apple Studio, Fluent Workbench, Carbon Data, and Linear Command directions.
- After user review, narrowed V3.1 production candidates to Apple Studio and Linear Command.
- Removed Fluent Workbench and Carbon Data from production schema/examples because their visual effect and layout quality were not acceptable yet.
- Extended Apple Studio and Linear Command beyond comparison matrices to conclusion-first, roadmap, and process-chain via shared component grammar.
- Added regression examples for both styles across the covered layouts and verified them with SVG containment checks and `whiteboard-cli --check`.

## [2026-06-26] update | Feishu-side V3.1 style review

- Feishu-side preview review showed Apple Studio needed real layout fixes, not demotion: spacing, component strength, and footer/card rhythm did not consistently match the intended quality.
- Added Apple-specific renderer paths for conclusion-first, roadmap, and process-chain so Apple Studio is not just a generic template with changed tokens.
- Kept Apple Studio and Linear Command as V3.1 production candidates, with mandatory Feishu-side preview review after style/layout changes.
- Fixed roadmap/process-chain arrows so they connect card edges instead of rendering as floating arrowheads.

## [2026-06-26] maintain | V3.1 production-style acceptance rules

- Consolidated the current V3.1 state in topic pages: style-specific renderer grammar is now durable project knowledge, not just experiment context.
- Recorded the acceptance rule that Apple Studio and Linear Command samples require both local checks and Feishu-side preview review before being treated as stable production examples.

## [2026-06-26] update | V3.2 controlled expressiveness

- Added the V3.2 direction page: `wiki/topics/v32-controlled-expressiveness.md`.
- Recorded the product decision that richer expression should come from schema-backed primitives, not freehand whiteboard generation.
- Captured the first DSL pilot set: `milestone-timeline`, `funnel`, and `pyramid`.

## [2026-06-26] fix | V3.2 layout polish and metric dashboard

- Fixed V3.2 DSL preview issues reported from Feishu-side review: title/subtitle spacing, timeline end-card crowding, and the floating funnel explanation card.
- Added `metric-dashboard` as the fourth controlled DSL primitive for metric cards, progress bars, project status, and lightweight data analysis.
- Updated schema, validator, renderer, documentation, and regression fixture coverage for the new metric dashboard layout.

## [2026-06-30] release | V3.2 stable

- Promoted V3.2 controlled expressiveness from branch work to the stable `main` release.
- Treated the DSL expression set as production supported: timeline, funnel, pyramid, metric dashboard, progress wall, ranked bars, and variance bridge.
- Kept the core release rule: richer visual expression must remain schema-backed, renderer-backed, fixture-backed, and checked before Feishu delivery.

## [2026-06-30] query | Future product roadmap

- Added roadmap page: `wiki/topics/future-product-roadmap.md`.
- Recorded the near-term sequence: V3.4 controlled data-expression components, V3.5 restrained style expansion, V4 multi-renderer stabilization.
- Adjusted V5 away from a standalone web generation product. V5 is now an introduction and promotion website for the Skill, while the core workflow remains Skill + Agent workbench.
