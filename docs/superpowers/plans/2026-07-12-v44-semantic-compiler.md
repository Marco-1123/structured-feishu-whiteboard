# V4.4 Semantic Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a V4.4 Beta pipeline that turns source inventories into typed semantic models, produces and scores multiple expression plans for six archetypes, safely falls back to V4.3, and validates at least 42 representative cases.

**Architecture:** Add a semantic compiler between the existing V4.3 inventory and brief layers. The compiler emits a validated semantic model; a planner converts it into two or three candidate expression plans, scores them, and emits a deterministic V4 brief. Existing renderers and quality gates remain the final delivery layer.

**Tech Stack:** Node.js ES modules, JSON Schema, existing V4 renderer and pipeline runner, shell regression suite, `@larksuite/whiteboard-cli`, `lark-cli`.

## Global Constraints

- Work only on `codex/v4.4-semantic-compiler`; do not modify or install over V4.3 `main`.
- Implement all six archetypes in Beta; review and stage update receives the largest fixture set.
- Preserve 100 percent critical fact coverage and explicit high-fact accounting.
- Do not fabricate missing business facts.
- Do not let the Agent handwrite SVG or connector coordinates.
- On semantic, planning, rendering, or quality failure, return a usable V4.3 result when V4.3 can render the input.
- Keep source understanding, expression planning, and rendering in separate modules.

---

### Task 1: Semantic Model Contract

**Files:**
- Create: `schemas/semantic-model.schema.json`
- Create: `scripts/lib/semantic-model.mjs`
- Create: `scripts/validate-semantic-model.mjs`
- Create: `scripts/test-semantic-model.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: V4.3 `content-inventory.json` facts.
- Produces: `validateSemanticModel(model)`, `normalizeSemanticModel(model)`, and a versioned JSON schema.

- [ ] **Step 1: Write failing contract tests**

Cover valid facts and relationships, invalid fact references, missing source references, unsupported archetypes, fabricated confidence values, and incomplete completeness ledgers.

- [ ] **Step 2: Verify the tests fail**

Run: `node scripts/test-semantic-model.mjs`

Expected: failure because the semantic model module and schema do not exist.

- [ ] **Step 3: Implement the schema and validator**

Define archetypes `review-update`, `strategy-proposal`, `project-plan`, `research-decision`, `product-capability`, and `process-collaboration`; define typed facts, typed relationships, reading layers, and completeness ledger entries exactly as specified in the design.

- [ ] **Step 4: Verify contract tests pass**

Run: `node scripts/test-semantic-model.mjs`

Expected: `ok: semantic model tests passed`.

- [ ] **Step 5: Add the test to the regression suite and commit**

```bash
git add schemas/semantic-model.schema.json scripts/lib/semantic-model.mjs scripts/validate-semantic-model.mjs scripts/test-semantic-model.mjs scripts/validate-layout-tests.sh
git commit -m "feat: add V4.4 semantic model contract"
```

### Task 2: Six-Archetype Semantic Compiler

**Files:**
- Create: `config/semantic-archetypes.json`
- Create: `scripts/lib/semantic-compiler.mjs`
- Create: `scripts/compile-semantic-model.mjs`
- Create: `scripts/test-semantic-compiler.mjs`
- Create: `examples/evals/v44/compiler-cases.json`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: `{ inventory, hints? }`.
- Produces: `compileSemanticModel({ inventory, hints }) -> SemanticModel` and ranked archetype evidence.

- [ ] **Step 1: Write failing archetype tests**

Create at least two minimal cases per archetype and assert the expected primary archetype, required fact types, relationship types, reading-layer assignment, and unresolved markers for missing inputs.

- [ ] **Step 2: Verify the tests fail**

Run: `node scripts/test-semantic-compiler.mjs`

Expected: failure because `compileSemanticModel` does not exist.

- [ ] **Step 3: Implement evidence-based archetype scoring**

Use fact types, time orientation, relationship evidence, and source vocabulary as evidence. Return score breakdowns rather than a bare model confidence. Support one optional secondary archetype.

- [ ] **Step 4: Implement archetype-specific semantic chains**

Review maps objectives, results, metrics, trends, variance, causes, risks, and actions. Implement the corresponding chains for the other five archetypes without inserting facts absent from the inventory.

- [ ] **Step 5: Verify tests and commit**

```bash
node scripts/test-semantic-compiler.mjs
git add config/semantic-archetypes.json scripts/lib/semantic-compiler.mjs scripts/compile-semantic-model.mjs scripts/test-semantic-compiler.mjs examples/evals/v44/compiler-cases.json scripts/validate-layout-tests.sh
git commit -m "feat: compile six V4.4 semantic archetypes"
```

### Task 3: Expression Candidate Planner

**Files:**
- Create: `schemas/expression-plan.schema.json`
- Create: `config/expression-strategies.json`
- Create: `scripts/lib/expression-planner.mjs`
- Create: `scripts/plan-expression.mjs`
- Create: `scripts/test-expression-planner.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: validated `SemanticModel`.
- Produces: `planExpressions(model) -> { candidates[], confidenceEvidence }` with two or three candidates.

- [ ] **Step 1: Write failing candidate-diversity tests**

Assert that data-rich review, text-heavy review, past/future review, research decision, product introduction, and collaboration flow produce different narrative types, page skeletons, region purposes, and component mixes.

- [ ] **Step 2: Verify the tests fail**

Run: `node scripts/test-expression-planner.mjs`

Expected: failure because the planner does not exist.

- [ ] **Step 3: Implement strategy configuration and candidate construction**

Construct candidates in the order narrative type, page skeleton, semantic regions, and component mix. Enforce archetype component allowlists and repetition limits.

- [ ] **Step 4: Implement candidate scoring**

Score critical coverage, high accounting, semantic component match, narrative coherence, reading-layer clarity, space utilization estimate, repetition penalty, unsupported inference penalty, and renderer compatibility.

- [ ] **Step 5: Verify tests and commit**

```bash
node scripts/test-expression-planner.mjs
git add schemas/expression-plan.schema.json config/expression-strategies.json scripts/lib/expression-planner.mjs scripts/plan-expression.mjs scripts/test-expression-planner.mjs scripts/validate-layout-tests.sh
git commit -m "feat: plan and score V4.4 expression candidates"
```

### Task 4: Brief Compiler And Confidence Policy

**Files:**
- Create: `scripts/lib/v44-brief-compiler.mjs`
- Create: `scripts/compile-v44-brief.mjs`
- Create: `scripts/test-v44-brief-compiler.mjs`
- Modify: `schemas/whiteboard-brief.schema.json`
- Modify: `scripts/validate-brief.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: semantic model plus scored expression candidates.
- Produces: a V4-compatible brief with `pipelineVersion: "4.4"`, selected fact IDs, candidate ID, score evidence, and fallback metadata.

- [ ] **Step 1: Write failing confidence-policy tests**

Assert high-confidence direct selection, medium-confidence recorded alternatives, low-confidence user-choice state, and V4.3 fallback metadata when no candidate is valid.

- [ ] **Step 2: Verify the tests fail**

Run: `node scripts/test-v44-brief-compiler.mjs`

- [ ] **Step 3: Implement candidate-to-brief component mapping**

Map semantic regions to existing verified V4 components. Preserve fact IDs on every generated block so coverage remains traceable.

- [ ] **Step 4: Implement configurable confidence thresholds**

Store thresholds in `config/expression-strategies.json`; base confidence on score margins, missing required signals, unsupported inference count, and renderer compatibility.

- [ ] **Step 5: Verify tests and commit**

```bash
node scripts/test-v44-brief-compiler.mjs
git add scripts/lib/v44-brief-compiler.mjs scripts/compile-v44-brief.mjs scripts/test-v44-brief-compiler.mjs schemas/whiteboard-brief.schema.json scripts/validate-brief.mjs scripts/validate-layout-tests.sh
git commit -m "feat: compile confidence-aware V4.4 briefs"
```

### Task 5: Replayable V4.4 Pipeline And V4.3 Fallback

**Files:**
- Create: `scripts/lib/v44-pipeline-runner.mjs`
- Create: `scripts/run-whiteboard-v44.mjs`
- Create: `scripts/test-run-whiteboard-v44.mjs`
- Modify: `scripts/lib/pipeline-runner.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: inventory path, optional hints, output directory.
- Produces: semantic model, candidate plans, selected brief, rendered output, checks, fallback output, and V4.4 run manifest.

- [ ] **Step 1: Write failing end-to-end and fallback tests**

Test a valid review, a valid research decision, a low-confidence mixed case, an invalid candidate that falls back to V4.3, and a critical-fact omission that cannot be accepted.

- [ ] **Step 2: Verify the tests fail**

Run: `node scripts/test-run-whiteboard-v44.mjs`

- [ ] **Step 3: Implement the replayable pipeline**

Persist every stage before moving to the next. Attempt candidates in score order. Run the existing brief, coverage, renderer, SVG, V4 layout, V4.3 visual quality, and whiteboard checks.

- [ ] **Step 4: Implement V4.3 fallback**

Fallback must record the triggering error, selected V4.3 route, resulting artifact hash, and check status. It must never silently label a fallback artifact as V4.4.

- [ ] **Step 5: Verify tests and commit**

```bash
node scripts/test-run-whiteboard-v44.mjs
git add scripts/lib/v44-pipeline-runner.mjs scripts/run-whiteboard-v44.mjs scripts/test-run-whiteboard-v44.mjs scripts/lib/pipeline-runner.mjs scripts/validate-layout-tests.sh
git commit -m "feat: add replayable V4.4 pipeline and fallback"
```

### Task 6: Forty-Two-Case Evaluation Corpus

**Files:**
- Create: `examples/evals/v44/cases.json`
- Create: `examples/evals/v44/cases/*.json`
- Create: `scripts/lib/v44-evaluator.mjs`
- Create: `scripts/eval-v44.mjs`
- Create: `scripts/test-v44-evaluator.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: 42 source inventories and expected semantic/structural outcomes.
- Produces: aggregate and per-archetype accuracy, coverage, diversity, consistency, fallback, and render metrics.

- [ ] **Step 1: Add the 42-case manifest and failing evaluator test**

Include 12 review cases, five cases for each other archetype, and five mixed or low-confidence cases. Assert the exact case counts and per-archetype distribution.

- [ ] **Step 2: Verify the evaluator test fails**

Run: `node scripts/test-v44-evaluator.mjs`

- [ ] **Step 3: Implement evaluator metrics**

Report top-one and top-two archetype accuracy, critical coverage, high accounting, semantic component match, structural diversity by archetype, cross-run determinism, fallback success, and renderer pass rate.

- [ ] **Step 4: Calibrate configurations without weakening acceptance floors**

Tune archetype evidence weights and confidence margins. Do not lower critical coverage below 100 percent or top-two accuracy below 90 percent.

- [ ] **Step 5: Verify tests and commit**

```bash
node scripts/test-v44-evaluator.mjs
node scripts/eval-v44.mjs
git add examples/evals/v44 scripts/lib/v44-evaluator.mjs scripts/eval-v44.mjs scripts/test-v44-evaluator.mjs scripts/validate-layout-tests.sh config/semantic-archetypes.json config/expression-strategies.json
git commit -m "test: add V4.4 six-archetype evaluation corpus"
```

### Task 7: Documentation, Beta Packaging, And Feishu Acceptance

**Files:**
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `VERSION`
- Modify: `references/report-workflow.md`
- Modify: `references/deterministic-rendering.md`
- Modify: `references/expression-grammar.md`
- Modify: `references/quality-checklist.md`
- Create: `examples/acceptance/v44/README.md`
- Create: `examples/acceptance/v44/*.svg`
- Create: `examples/acceptance/v44/*.png`

**Interfaces:**
- Consumes: passing V4.4 pipeline and selected representative cases.
- Produces: installable `4.4.0-beta.1`, documented Beta workflow, local previews, Feishu document links, and unchanged V4.3 stable installation.

- [ ] **Step 1: Update Beta documentation and version metadata**

Document all six archetypes, confidence behavior, run artifacts, fallback behavior, and the separate Beta installation branch. Keep `main` documented as V4.3 stable.

- [ ] **Step 2: Generate representative acceptance artifacts**

Generate at least one SVG and PNG for every archetype, plus four additional review variants: data-rich, text-heavy, multi-line, and past/future.

- [ ] **Step 3: Run full local verification**

```bash
bash scripts/preflight.sh
bash scripts/validate-layout-tests.sh
node scripts/eval-v44.mjs
```

Expected: all commands exit zero and the V4.4 evaluation report satisfies every acceptance floor.

- [ ] **Step 4: Run Feishu acceptance**

Create one Feishu test document containing representative boards from all six archetypes. Export previews and confirm nonblank, editable, readable output without overflow, connector defects, or silent generic-dashboard fallback.

- [ ] **Step 5: Commit and push Beta**

```bash
git add SKILL.md README.md VERSION references examples/acceptance/v44
git commit -m "release: publish V4.4 semantic compiler beta"
git push -u origin codex/v4.4-semantic-compiler
```

