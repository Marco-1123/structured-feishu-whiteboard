# V4.3 Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an explainable, fail-closed, replayable V4.3 pipeline that preserves source facts, ranks scene candidates, validates renderer capabilities, improves V4 layout balance, and records every run.

**Architecture:** Keep V3/DSL/V4 renderers as output backends. Add a registry-driven control plane before rendering, a layout-tree composition phase inside V4, and deterministic coverage/visual checks after planning and rendering. V4.3 artifacts are inventory JSON, route JSON, brief JSON, output SVG/PNG, and a run manifest.

**Tech Stack:** Node.js ESM, JSON Schema, existing SVG/DSL renderers, `@larksuite/whiteboard-cli`, Bash regression harness.

## Global Constraints

- V3.2 remains the stable fallback and existing briefs must continue to render.
- V4.3 version is `4.3.0-beta.1` on `codex/v4.3-control-plane`.
- Unsupported engine/layout/target/style combinations fail; no silent style fallback.
- Critical source facts must be selected; high-priority facts must be selected or explicitly omitted.
- V4.3 adds no new visual styles or top-level layout families.
- Production V4.3 output must be renderer-backed, checker-backed, and trace-backed.

---

### Task 1: Capability Registry And Fail-Closed Resolution

**Files:**
- Create: `VERSION`
- Create: `config/capabilities.json`
- Create: `scripts/lib/capabilities.mjs`
- Create: `scripts/test-capabilities.mjs`
- Modify: `scripts/validate-brief.mjs`
- Modify: `scripts/render-whiteboard.mjs`
- Modify: `scripts/render-whiteboard-dsl.mjs`
- Modify: `scripts/render-whiteboard-v4.mjs`

**Interfaces:**
- Produces: `loadCapabilities(root)`, `resolveCapability(registry, request)`, `assertCapability(registry, request)`.
- `request` is `{engine, layout, renderTarget, style}`.
- `resolveCapability` returns `{ok, renderer, engine, layout, renderTarget, style, experimental, errors, validStyles}`.

- [ ] Write `scripts/test-capabilities.mjs` to assert all committed briefs resolve and unsupported V4/DSL styles fail instead of falling back.
- [ ] Run `node scripts/test-capabilities.mjs`; verify RED because the registry module is missing.
- [ ] Add the version, registry, resolver, and renderer fail-closed checks.
- [ ] Run `node scripts/test-capabilities.mjs`; expect `ok: capability registry tests passed`.
- [ ] Run existing brief validation and representative V3/DSL/V4 renders.
- [ ] Commit with `feat: add V4.3 capability registry`.

### Task 2: Content Inventory And Coverage Verification

**Files:**
- Create: `schemas/content-inventory.schema.json`
- Create: `scripts/lib/content-coverage.mjs`
- Create: `scripts/validate-content-inventory.mjs`
- Create: `scripts/test-content-coverage.mjs`
- Modify: `schemas/whiteboard-brief.schema.json`
- Modify: `scripts/validate-brief.mjs`

**Interfaces:**
- Produces: `validateInventory(inventory): string[]` and `verifyCoverage(inventory, planning): CoverageResult`.
- `CoverageResult` is `{ok, criticalCoverage, highAccounting, selectedIds, omittedIds, issues}`.

- [ ] Write failing tests for omitted critical facts, unaccounted high facts, unknown IDs, duplicate IDs, and valid accounting.
- [ ] Run `node scripts/test-content-coverage.mjs`; verify RED.
- [ ] Implement inventory validation and coverage verification.
- [ ] Add optional `pipelineVersion` and `planning` to the brief schema; require both in the unified V4.3 runner rather than legacy renderers.
- [ ] Run tests; expect all content coverage cases to pass.
- [ ] Commit with `feat: add V4.3 content inventory`.

### Task 3: Explainable Scenario Router

**Files:**
- Create: `scripts/lib/scenario-router.mjs`
- Create: `scripts/route-whiteboard.mjs`
- Create: `scripts/test-scenario-router.mjs`
- Create: `examples/evals/v43/router-cases.json`

**Interfaces:**
- Produces: `routeInventory(inventory, capabilities): RouteDecision`.
- `RouteDecision` contains `decisionId`, `candidates`, `confidence`, `fallback`, and `signals`.

- [ ] Add at least ten route cases covering dashboard, decision, timeline, hierarchy, linear flow, swimlane, variance, long mixed report, dense architecture, and ambiguity.
- [ ] Write failing router tests asserting expected layout appears in the top two candidates.
- [ ] Run `node scripts/test-scenario-router.mjs`; verify RED.
- [ ] Implement deterministic signal extraction, candidate scoring, confidence, reasons, and fallback.
- [ ] Run tests; require at least 90% top-two accuracy and no unsupported candidate.
- [ ] Commit with `feat: add explainable V4.3 router`.

### Task 4: V4 Layout Tree And Visual Quality Gate

**Files:**
- Create: `scripts/lib/v4-layout-tree.mjs`
- Create: `scripts/test-v4-layout-tree.mjs`
- Create: `scripts/check-v43-visual-quality.mjs`
- Create: `scripts/test-v43-visual-quality.mjs`
- Modify: `scripts/render-whiteboard-v4.mjs`

**Interfaces:**
- Produces: `buildExpressionLayout({blocks, mode, width, startY, gap, measure, isWide}): LayoutTree`.
- `LayoutTree` contains `nodes`, `height`, `columnHeights`, and `contentBounds`.

- [ ] Write a failing test showing index-based alternation creates avoidable column imbalance.
- [ ] Write failing visual-gate tests for overlap, missing bottom margin, extreme aspect ratio, and excessive column imbalance.
- [ ] Run both tests; verify RED.
- [ ] Implement shortest-column placement, wide-row flushing, and top-level layout markers.
- [ ] Update V4 renderer to build the layout tree, then draw nodes.
- [ ] Implement deterministic V4.3 visual checks from markers.
- [ ] Render all V4 fixtures and run geometry, V4, and V4.3 checks.
- [ ] Commit with `feat: add V4.3 layout tree and visual gate`.

### Task 5: Unified Runner And Replay Manifest

**Files:**
- Create: `scripts/lib/run-manifest.mjs`
- Create: `scripts/run-whiteboard.mjs`
- Create: `scripts/test-run-whiteboard.mjs`
- Create: `examples/evals/v43/dashboard/`
- Create: `examples/evals/v43/long-form/`
- Create: `examples/evals/v43/flow/`

**Interfaces:**
- CLI: `node scripts/run-whiteboard.mjs --inventory <file> --route <file> --brief <file> --output-dir <dir> [--skip-whiteboard-cli]`.
- Produces output plus `run-manifest.json`.

- [ ] Write failing integration tests for a successful run, coverage rejection, capability rejection, and manifest creation on failure.
- [ ] Run `node scripts/test-run-whiteboard.mjs`; verify RED.
- [ ] Implement hashing, renderer dispatch, checker dispatch, output paths, and manifest persistence.
- [ ] Add representative dashboard, long-form, and flow artifact sets.
- [ ] Run integration tests and inspect manifests.
- [ ] Commit with `feat: add replayable V4.3 runner`.

### Task 6: Executable Evaluation And Regression Governance

**Files:**
- Create: `scripts/eval-v43.mjs`
- Modify: `scripts/validate-layout-tests.sh`
- Modify: `examples/long-form-tests/manifest.json`
- Modify: `references/report-workflow.md`
- Modify: `references/long-form-workflow.md`
- Modify: `references/deterministic-rendering.md`
- Modify: `references/quality-checklist.md`

**Interfaces:**
- CLI: `node scripts/eval-v43.mjs` prints case counts, route top-two accuracy, fact accounting, render success, and visual-gate results.

- [ ] Write the evaluator to fail when route accuracy is below 90%, fact accounting is below 100%, or any render/check fails.
- [ ] Run it before all fixtures exist; verify RED.
- [ ] Replace obsolete long-form expectations with current executable onepage cases.
- [ ] Add V4.3 tests to the fast fixture loop without rendering every SVG twice.
- [ ] Run `node scripts/eval-v43.mjs` and `bash scripts/validate-layout-tests.sh`; expect both to pass.
- [ ] Commit with `test: add V4.3 end-to-end evaluation`.

### Task 7: Skill, Distribution, Feishu Acceptance, And Release

**Files:**
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `agents/openai.yaml`
- Modify: `wiki/log.md`
- Create: `wiki/topics/v43-control-plane.md`

**Interfaces:**
- `stable` remains `main` V3.2.
- `next` is `codex/v4.3-control-plane` with version and registry hash reported by the runner.

- [ ] Update the Skill workflow to require inventory, route, brief, runner, and manifest for V4.3.
- [ ] Document exact stable and next installation links and capability boundaries.
- [ ] Run preflight, capability tests, unit tests, evaluator, full layout regression, and `git diff --check`.
- [ ] Generate dashboard, long-form, and flow outputs through the unified runner.
- [ ] Create one Feishu validation document, insert the three editable whiteboards, and export previews.
- [ ] Inspect previews for text overflow, overlap, ineffective whitespace, density imbalance, and connector attachment.
- [ ] Synchronize the verified repository files into the locally installed Skill and verify version/registry hashes match.
- [ ] Commit, push `codex/v4.3-control-plane`, and return the GitHub branch and Feishu document links.
