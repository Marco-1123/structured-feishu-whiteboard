# V4.4 Internal Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a 24-case authoritative-source benchmark for V4.4 semantic selection, information completeness, structural diversity, layout stability, and Feishu output.

**Architecture:** A versioned source catalog provides bounded factual digests and expected semantic labels. A benchmark builder converts catalog entries into the existing content-inventory contract, then the existing V4.4 compiler and renderer produce replayable run artifacts. A dedicated evaluator aggregates semantic, coverage, diversity, fallback, and visual-gate results without weakening current acceptance floors.

**Tech Stack:** Node.js ESM, JSON fixtures, existing V4.4 semantic compiler and expression planner, SVG renderer, whiteboard-cli, lark-cli.

## Global Constraints

- Keep V4.3 stable and V4.4 on `codex/v4.4-semantic-compiler`.
- Use 24 cases: 18 primary and 6 stress cases.
- Preserve source URLs and bounded factual digests; do not store complete reports.
- Critical fact coverage must remain 100%.
- Do not tune thresholds by weakening existing acceptance floors.
- Representative outputs must be written to one Feishu acceptance document.

---

### Task 1: Authoritative Source Catalog

**Files:**
- Create: `examples/evals/v44-internal/source-catalog.json`
- Create: `scripts/validate-v44-source-catalog.mjs`
- Create: `scripts/test-v44-source-catalog.mjs`

**Interfaces:**
- Produces: a JSON object with `version`, `cases[]`, source metadata, expected archetype, expected structure signals, and bounded facts.

- [ ] Write a failing validator test for exactly 24 unique cases, six primary archetypes, six stress cases, valid URLs, required expected labels, and nonempty facts.
- [ ] Run `node scripts/test-v44-source-catalog.mjs` and confirm failure before the validator exists.
- [ ] Implement the validator and create the 24-case catalog from official OpenAI, Anthropic, and primary research sources.
- [ ] Run the catalog test and validator; expect both to pass.
- [ ] Commit the source catalog and validator.

### Task 2: Inventory Builder And Replay Runner

**Files:**
- Create: `scripts/lib/v44-benchmark-builder.mjs`
- Create: `scripts/build-v44-internal-benchmark.mjs`
- Create: `scripts/run-v44-internal-benchmark.mjs`
- Create: `scripts/test-v44-benchmark-builder.mjs`
- Create: `examples/evals/v44-internal/cases/`

**Interfaces:**
- Consumes: validated source catalog entries.
- Produces: one inventory and one V4.4 run directory per case.

- [ ] Write failing tests for deterministic inventory IDs, source traceability, importance preservation, and expected-label metadata.
- [ ] Run the builder test and confirm failure.
- [ ] Implement catalog-to-inventory conversion using the existing inventory schema.
- [ ] Implement a runner that calls `runWhiteboardV44` for all 24 cases and preserves each manifest.
- [ ] Run builder tests and build all inventories; expect 24 valid case directories.
- [ ] Commit the builder and generated inventories.

### Task 3: Benchmark Evaluation

**Files:**
- Create: `scripts/lib/v44-internal-evaluator.mjs`
- Create: `scripts/eval-v44-internal.mjs`
- Create: `scripts/test-v44-internal-evaluator.mjs`
- Create: `examples/evals/v44-internal/report.json`

**Interfaces:**
- Consumes: catalog expectations and V4.4 run artifacts.
- Produces: aggregate metrics, per-case findings, and failure-layer classification.

- [ ] Write failing tests for archetype accuracy, critical coverage, skeleton diversity, fallback accounting, and layer classification.
- [ ] Run evaluator tests and confirm failure.
- [ ] Implement aggregation and hard acceptance floors.
- [ ] Execute all 24 cases locally with whiteboard rendering and layout checks.
- [ ] Generate the report and confirm every failed case has an explicit failure layer.
- [ ] Commit evaluator, report, SVG, PNG, and manifests.

### Task 4: Visual And Feishu Acceptance

**Files:**
- Create: `examples/evals/v44-internal/acceptance/README.md`
- Create: `examples/evals/v44-internal/feishu-preview/`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: representative passing cases from all six archetypes plus two review cases.
- Produces: Feishu whiteboards, exported previews, and a Chinese acceptance summary.

- [ ] Add the catalog, builder, and evaluator tests to the regression script.
- [ ] Select at least eight representative cases using semantic and structural coverage, not visual preference alone.
- [ ] Create one Feishu document with written Chinese findings and embedded editable boards.
- [ ] Export Feishu-side previews and inspect nonblank output, alignment, clipping, overflow, and connector geometry.
- [ ] Record the document URL and representative case IDs in the acceptance README.
- [ ] Run the full regression suite and commit acceptance artifacts.

### Task 5: Independent Review And Cross-Agent Handoff

**Files:**
- Create: `examples/evals/v44-internal/cross-agent-pack.json`
- Create: `examples/evals/v44-internal/findings-zh.md`

**Interfaces:**
- Produces: a source-bounded replay pack that other Agents can run without access to local intermediate reasoning.

- [ ] Generate a handoff pack containing case ID, bounded material, expected evaluation fields, and no expected visual answer.
- [ ] Ask an independent reviewer to audit semantic metrics, layout gates, and representative PNGs.
- [ ] Classify review findings by semantic, planning, rendering, Feishu, or test-infrastructure layer.
- [ ] Re-run affected tests after any accepted fixes.
- [ ] Commit and push the completed internal benchmark branch.
