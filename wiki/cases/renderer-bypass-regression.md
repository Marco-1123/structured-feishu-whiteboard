# Renderer Bypass Regression

Purpose: record a recurring failure mode where an agent appears to use the Skill conceptually but does not use the deterministic renderer.

## Symptom

An agent generated a professional-blue Feishu whiteboard that visually resembled the project style, but old layout defects reappeared:

- header content was not vertically balanced inside its container,
- lower flow cards were crowded against their container,
- arrows and flow elements were manually positioned,
- the output did not match the stable renderer templates.

## Root Cause

Two conditions made the regression possible:

1. The locally installed Skill copy was stale and did not include the V2 deterministic rendering files, schemas, or long-form rules.
2. The repository Skill instructions still allowed unsupported layouts to fall back to hand-written SVG.

Together, this meant another agent could read the Skill as design guidance but still produce a freehand SVG. That bypassed the fixes for spacing, baseline alignment, containment, and invalid whitespace.

## Project Rule

For production-quality output, `structured-feishu-whiteboard` must not rely on freehand SVG generation.

Agents should:

- create a JSON brief,
- validate it against `schemas/whiteboard-brief.schema.json`,
- render with `scripts/render-whiteboard.mjs`,
- run layout and whiteboard checks,
- only then write to Feishu.

If the desired structure looks like a route map, process, or value chain but no dedicated renderer exists, it should be mapped to `large-canvas` rather than manually drawn.

## Implication

Methodology-only Skills are not enough for stable visual output. Stable output requires executable templates and hard routing rules.

Related pages:

- `wiki/topics/llm-wiki-pattern.md`
- `wiki/topics/structured-feishu-whiteboard-knowledge-scope.md`
