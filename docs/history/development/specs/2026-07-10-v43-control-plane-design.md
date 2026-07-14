# V4.3 Control Plane Design

## Status

Approved direction: the external audit findings are the V4.3 product requirements. V4.3 is a control-plane and evaluation release, not another template or palette expansion.

## Goal

Make the latest experimental whiteboard pipeline explainable, fail-closed, replayable, and measurable across Agent environments while preserving V3.2 as the stable fallback.

## Problems Being Solved

1. GitHub `main`, the experimental branch, and the locally installed Skill expose different capabilities.
2. Layout, style, renderer, and target combinations are not governed by one registry; unsupported styles silently fall back to professional blue.
3. Material understanding and layout selection are prompt-only decisions with no candidate ranking, confidence, or trace.
4. Long-form completeness cannot be audited because source facts, selected facts, and omissions are not persisted.
5. Curated brief fixtures validate rendering but do not validate routing or information preservation.
6. Geometry checks can pass outputs that still have excessive whitespace, unbalanced columns, weak density, or poor visual rhythm.
7. The V4 renderer directly combines placement and SVG output; it does not yet expose a reusable layout tree.
8. Historical long-form expectations conflict with the current onepage policy and are not executed by regression tests.

## Non-Goals

- No new visual styles or top-level layout families.
- No replacement of Feishu SVG/DSL as the final editable media.
- No standalone web generation product.
- No automatic factual extraction by a separate hosted model inside repository scripts. The Agent still understands source material, but must persist that understanding in typed artifacts.
- No promotion of V4.3 to `main` until cross-Agent and Feishu-side acceptance criteria pass.

## Architecture

```text
Source material
  -> Agent-created content inventory
  -> deterministic scenario router (ranked candidates + reasons + confidence)
  -> Agent-created brief referencing source fact IDs and route decision
  -> capability registry validation (engine/layout/target/style)
  -> coverage verifier
  -> V3 / DSL / V4 renderer
  -> geometry + V4 visual-quality checks
  -> SVG/DSL + PNG
  -> run manifest for replay
  -> Feishu document and preview acceptance
```

## 1. Version And Capability Governance

Add `VERSION` with `4.3.0-beta.1` and `config/capabilities.json` as the executable source of truth for:

- release channel (`stable` or `next`),
- supported engines,
- renderer entry points,
- valid layouts per engine and target,
- valid styles per engine,
- experimental status.

`scripts/lib/capabilities.mjs` loads this registry and exposes:

```js
loadCapabilities(root): CapabilityRegistry
resolveCapability(registry, { engine, layout, renderTarget, style }): CapabilityResolution
assertCapability(...): CapabilityResolution
```

Unsupported combinations fail with an actionable error. Renderers must not silently substitute another style. A consistency test compares registry unions with JSON Schema enums and validator enums.

## 2. Content Inventory And Completeness

Add `schemas/content-inventory.schema.json`. An inventory contains:

- `inventoryId`, `title`, `sourceType`, and optional `sourceRef`,
- typed facts with stable IDs,
- fact type: conclusion, constraint, risk, metric, evidence, action, process, comparison, timeline, hierarchy, context,
- importance: critical, high, medium, low,
- relation tags and optional links to related fact IDs.

Add `planning` metadata to V4.3 briefs:

```json
{
  "pipelineVersion": "4.3",
  "planning": {
    "inventoryId": "inventory-id",
    "selectedFactIds": ["fact-1"],
    "omittedFacts": [{"id": "fact-9", "reason": "duplicate"}],
    "routeDecisionId": "route-id"
  }
}
```

Critical facts must be selected. High-importance facts must be selected or explicitly omitted with an allowed reason. Unknown IDs, duplicate selections, unaccounted high-priority facts, and omitted critical facts fail validation.

## 3. Explainable Scenario Router

Add `scripts/route-whiteboard.mjs` and `scripts/lib/scenario-router.mjs`. The router consumes the content inventory, not raw prose. It scores all compatible scene families from deterministic signals:

- time sequence,
- process dependency and role lanes,
- hierarchy,
- comparison dimensions,
- metric/status/trend density,
- variance attribution,
- problem/cause/action narrative,
- mixed long-form complexity.

The router returns three ranked candidates where possible:

```json
{
  "decisionId": "...",
  "candidates": [
    {"layout": "flow-canvas", "mode": "swimlane-flow", "score": 0.91, "reasons": ["..."]}
  ],
  "confidence": "high",
  "fallback": {"layout": "large-canvas"}
}
```

Ambiguous inputs keep multiple candidates and a fallback instead of pretending a single label is certain. Routing tests cover clear, ambiguous, multi-intent, and unsupported cases.

## 4. Unified Runner And Replay Manifest

Add `scripts/run-whiteboard.mjs` as the production entry point for V4.3. It:

1. validates inventory and brief,
2. verifies route decision and content coverage,
3. resolves capabilities,
4. invokes the registered renderer,
5. runs geometry and engine-specific visual checks,
6. optionally runs `whiteboard-cli`,
7. writes a run manifest.

The manifest records:

- Skill version and current Git commit when available,
- hashes for inventory, route decision, brief, and output,
- selected engine/layout/mode/style/target,
- ranked route candidates and reasons,
- content coverage result,
- checks run and their status,
- output paths and timestamps.

This manifest is the replay and incident-debugging record. It contains no source body unless the user already persisted it in the inventory.

## 5. V4 Layout Tree

Refactor expression-canvas composition into a layout-tree phase before SVG output. A layout node contains:

```js
{
  id,
  type,
  x,
  y,
  width,
  height,
  children,
  sourceBlockIndex
}
```

The first V4.3 algorithm supports:

- full-width title, statement, metric group, and wide semantic blocks,
- compact blocks placed into the currently shorter column,
- wide blocks that flush both columns before continuing,
- content-derived canvas height,
- top-level block markers in SVG for quality inspection.

This replaces index-based alternating columns. Component SVG functions remain reusable; V4.3 separates composition from component drawing without rewriting all components.

## 6. Visual Quality Gate

Add `scripts/check-v43-visual-quality.mjs` using top-level layout markers. It checks:

- overlapping top-level blocks,
- minimum horizontal and vertical gaps,
- canvas bottom safety margin,
- excessive column imbalance,
- excessive empty canvas ratio,
- unsupported extreme aspect ratios,
- minimum component width and height,
- missing layout markers.

The gate is deterministic and complements, rather than replaces, Feishu-side human preview. V4.3 acceptance still requires real Feishu preview for changed layout primitives.

## 7. Evaluation Corpus

Add paired fixtures under `examples/evals/v43/` covering:

- operating dashboard,
- decision comparison,
- timeline,
- hierarchy,
- linear process,
- swimlane collaboration,
- variance attribution,
- long mixed report,
- dense architecture/governance badcase,
- ambiguous multi-intent material.

Each case includes inventory, expected route candidates, required fact IDs, forbidden omissions, and a brief where rendering is part of the case. `scripts/eval-v43.mjs` reports route accuracy, critical/high fact coverage, capability validity, render success, and visual-gate pass rate.

The obsolete long-form manifest is replaced with executable V4.3 cases aligned with the current unified-onepage policy.

## 8. Distribution And Installation

Document two channels:

- `stable`: GitHub `main`, currently V3.2.
- `next`: `codex/v4.3-control-plane`, V4.3 beta.

Update README and Skill instructions with exact repository/channel behavior. After all gates pass, synchronize the verified V4.3 beta into the local installed Skill so current Codex tests the same commit that is pushed for other Agents.

## Error Handling

- Unsupported combinations fail closed with the valid alternatives listed.
- Missing or invalid inventory/route files fail before rendering.
- Coverage failure reports exact unaccounted fact IDs.
- Router confidence below the threshold returns candidates and fallback; it does not fabricate certainty.
- Renderer or checker failures are written to the manifest with `status: "failed"` when the runner can safely create the manifest.
- `whiteboard-cli` remains an external acceptance dependency; local unit tests can skip it, full release tests cannot.

## Acceptance Criteria

1. No engine silently falls back to a different style.
2. Registry, schema, validator, and renderer capabilities are consistent.
3. Every V4.3 render has inventory, route decision, coverage result, and run manifest.
4. Critical fact coverage is 100%; high-priority fact accounting is 100%.
5. Router top-two accuracy is at least 90% across the V4.3 corpus.
6. All V3.2/V3.5/V4.2 regression fixtures remain valid.
7. All V4.3 fixtures pass geometry, V4, and V4.3 visual-quality checks.
8. No top-level block overlap, bottom-margin failure, or unsupported style/engine combination is accepted.
9. A real Feishu document contains representative V4.3 dashboard, long-form, and flow outputs with readable previews.
10. GitHub `next` branch and local installed Skill report the same V4.3 version and capability registry hash.

## Measurement

- capability mismatch count: 0,
- silent fallback count: 0,
- critical/high fact accounting: 100%,
- route top-two accuracy: >= 90%,
- deterministic render/check success: 100% on committed fixtures,
- Feishu first-pass visual acceptance: >= 90% on the representative V4.3 set,
- cross-Agent pipeline artifact completeness: 100%.
