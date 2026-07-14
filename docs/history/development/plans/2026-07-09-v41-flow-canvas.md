# V4.1 Flow Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an experimental V4 `flow-canvas` layout for real flowcharts without changing V3.5 stable output.

**Architecture:** Briefs continue to be JSON. `engine: "v4"` routes `flow-canvas` through the parallel V4 SVG renderer, while V3 and existing V4 `expression-canvas` output remain unchanged. The first implementation supports linear process flows and swimlane responsibility flows.

**Tech Stack:** Node.js scripts, JSON brief schema, SVG output, existing whiteboard CLI validation.

## Global Constraints

- V3.5 remains the stable default.
- V4.1 only activates when `engine: "v4"` and `layout: "flow-canvas"`.
- Flowcharts must use deterministic JSON brief fields; agents must not hand-write SVG.
- Flow connectors must attach to node boundaries, not float between cards.
- Colors express semantics only: primary flow, risk/exception, success/result, neutral system steps.
- First scope supports `linear-flow` and `swimlane-flow`; branch-heavy flowcharts are deferred.

---

### Task 1: Add Flow Brief Contract

**Files:**
- Modify: `schemas/whiteboard-brief.schema.json`
- Modify: `scripts/validate-brief.mjs`
- Create: `examples/briefs/v41-linear-flow-engine.json`
- Create: `examples/briefs/v41-swimlane-flow-engine.json`

**Interfaces:**
- Produces: `layout: "flow-canvas"`, `flowMode`, `flowNodes[]`, `flowEdges[]`, optional `lanes[]`.

- [ ] Add two V4 flow sample briefs.
- [ ] Run `node scripts/validate-brief.mjs examples/briefs/v41-linear-flow-engine.json` and confirm it fails because `flow-canvas` is unsupported.
- [ ] Extend schema and validator.
- [ ] Re-run the same validation and confirm it passes.

### Task 2: Render Flow Canvas in V4

**Files:**
- Modify: `scripts/render-whiteboard-v4.mjs`

**Interfaces:**
- Consumes: `flowMode`, `flowNodes[]`, `flowEdges[]`, optional `lanes[]`.
- Produces: SVG with `data-layout-engine="v4"` and `data-flow-mode`.

- [ ] Run `node scripts/render-whiteboard-v4.mjs --input examples/briefs/v41-linear-flow-engine.json --output examples/layout-tests/generated-v41-linear-flow-engine.svg` and confirm it fails before implementation.
- [ ] Add `renderFlowCanvas`, `renderLinearFlow`, and `renderSwimlaneFlow`.
- [ ] Add flow node rectangles with `data-flow-node`.
- [ ] Add connector lines with `data-flow-edge`, `data-from`, and `data-to`.
- [ ] Re-run both sample renders and confirm SVG files are created.

### Task 3: Add V4 Flow Checks

**Files:**
- Modify: `scripts/check-v4-layout.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: V4 flow SVG metadata.
- Produces: failures for orphan nodes, invalid edges, connector endpoints outside node boundaries, and missing swimlane structure.

- [ ] Extend V4 checker to parse `data-flow-node` and `data-flow-edge`.
- [ ] Ensure every edge references existing nodes.
- [ ] Ensure connector start and end points touch the source and target node boundary.
- [ ] Ensure swimlane SVG contains lane markers.
- [ ] Run `bash scripts/validate-layout-tests.sh`.

### Task 4: Update Skill Guidance

**Files:**
- Modify: `SKILL.md`
- Modify: `references/deterministic-rendering.md`
- Modify: `references/expression-grammar.md`
- Modify: `references/layout-library.md`
- Modify: `references/style-library.md`

**Interfaces:**
- Produces: agent-facing rules for when to choose `flow-canvas`.

- [ ] Document that flowcharts are separate from expression canvases.
- [ ] Document `linear-flow` and `swimlane-flow` selection rules.
- [ ] Document style defaults: Linear System for technical flows, Feishu Status for business/status flows.
- [ ] Run `bash scripts/preflight.sh` and `bash scripts/validate-layout-tests.sh`.
