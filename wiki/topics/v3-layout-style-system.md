# V3 Layout And Style System

Purpose: record the V3 direction for expanding `structured-feishu-whiteboard` without losing deterministic output stability.

## Decision

V3 expands the Skill from a stability-focused V2 into a richer work-report template system.

The upgrade adds script-rendered layouts and Feishu-inspired restrained styles. It does not return to freehand SVG generation or highly colorful poster aesthetics.

## Layout Direction

V3 production layouts include:

- `conclusion-first`
- `problem-breakdown`
- `large-canvas`
- `roadmap`
- `process-chain`
- `comparison-matrix`

The new layouts cover common work-report scenarios:

- staged implementation,
- process or value-chain explanation,
- structured comparison and recommendation.

## Style Direction

V3 adds three restrained Feishu-oriented styles:

- `feishu-neutral`: light gray workspace feel for everyday business updates.
- `feishu-status`: low-saturation function-color style for process, risk, status, and metrics.
- `feishu-decision-dark`: restrained dark style for decision and executive views.

These styles should feel like work surfaces, not posters.

V3.1 extends this direction with style-specific grammar experiments. The current production candidates are documented in `wiki/topics/v31-style-differentiation-research.md`.

## Guardrail

Richer visual output must still be deterministic.

Agents should not use the existence of more layouts as permission to compose arbitrary SVG. Every production layout must be backed by:

- JSON brief schema,
- renderer function,
- sample brief,
- generated SVG/PNG fixture,
- whiteboard check,
- layout containment check.

## Related Pages

- `wiki/cases/renderer-bypass-regression.md`
- `wiki/topics/structured-feishu-whiteboard-knowledge-scope.md`
- `wiki/topics/v31-style-differentiation-research.md`
