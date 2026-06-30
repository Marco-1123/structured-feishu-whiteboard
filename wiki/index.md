# LLM Wiki Index

This is the navigation page for the structured Feishu whiteboard project wiki. It is maintained by the LLM and should be updated whenever pages are added or materially changed.

## Schema

- [LLM Wiki Schema](schema.md) — Operating contract for maintaining this wiki according to the LLM Wiki pattern.

## Sources

- [Karpathy LLM Wiki Pattern](sources/karpathy-llm-wiki.md) — Source summary of the LLM-maintained wiki pattern, based on the raw source in `raw/sources/karpathy-llm-wiki.md`.

## Topics

- [LLM Wiki Pattern](topics/llm-wiki-pattern.md) — Core principles: raw sources, compiled wiki, schema, index, log, ingest, query, and lint.
- [Structured Feishu Whiteboard Knowledge Scope](topics/structured-feishu-whiteboard-knowledge-scope.md) — What this project wiki should remember and how it supports the Skill.
- [V3 Layout And Style System](topics/v3-layout-style-system.md) — V3 direction for richer script-rendered layouts and Feishu-inspired restrained styles.
- [V3.1 Style Differentiation Research](topics/v31-style-differentiation-research.md) — Diagnosis of weak V3 style differences and the decision to keep Apple Studio and Linear Command as production candidates with renderer-backed layout checks.
- [V3.2 Controlled Expressiveness](topics/v32-controlled-expressiveness.md) — Controlled DSL expression primitives for timeline, funnel, and pyramid layouts without returning to freehand whiteboard generation.
- [Future Product Roadmap](topics/future-product-roadmap.md) — Current roadmap for V3.4 component expansion, V3.5 style expansion, V4 renderer stabilization, and the adjusted V5 Skill introduction website direction.

## Cases

- [Initial Wiki Setup](cases/initial-wiki-setup.md) — First application of the LLM Wiki pattern to this repository.
- [Renderer Bypass Regression](cases/renderer-bypass-regression.md) — A recurring layout defect caused by an agent using outdated/manual SVG generation instead of the deterministic renderer.

## Maintenance Notes

- Read this index first when using the wiki.
- Add new pages here immediately after creating them.
- Keep summaries short enough that future agents can scan the wiki quickly.
