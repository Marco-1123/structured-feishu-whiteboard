# V4.4 Internal Benchmark Design

## Objective

Build a 24-case internal benchmark that tests whether V4.4 can turn diverse, authoritative source material into semantically appropriate, complete, visually stable Feishu whiteboards before cross-Agent calibration begins.

The benchmark separates four questions:

1. Did the semantic compiler identify the correct business archetype?
2. Did the selected facts preserve the important conclusions, evidence, metrics, risks, and actions?
3. Did the expression planner choose a structure that fits the material instead of falling back to one repeated skeleton?
4. Did the renderer produce a readable and aligned board locally and in Feishu?

## Scope

The suite contains 24 cases:

- 18 primary cases: three cases for each of the six supported archetypes.
- 6 stress cases: mixed intent, long-form input, scattered metrics, conflicting facts, missing evidence, and weak conclusions.

Review and stage-update remains the highest-priority archetype, but every archetype must have independent passing evidence.

## Source Policy

Use authoritative public sources, primarily:

- OpenAI official research, product, system-card, and enterprise reports.
- Anthropic official research, economic, governance, and product reports.
- Primary research papers and official technical documentation when they provide a distinct structure.

Do not copy full copyrighted reports into the repository. Each fixture stores a source URL, citation metadata, and a bounded factual digest that preserves the report's relevant structure and numbers.

## Case Matrix

### Review And Stage Update

Test metric-rich enterprise adoption, multi-period usage changes, and review-plus-next-stage-planning. Expected structures include dashboard, past/future split, and result-risk-action review.

### Strategy And Proposal

Test governance strategy, enterprise agent deployment, and organizational adoption. Expected structures include causal argument, strategic pillars, and recommendation-with-validation.

### Project Plan

Test staged rollout, capability-building roadmap, and research execution plan. Expected structures include temporal roadmap, dependency plan, and milestone ownership view.

### Research And Decision

Test benchmark analysis, comparative research, and evidence-led selection. Expected structures include comparison matrix, evidence-to-insight chain, and uncertainty-aware recommendation.

### Product Or Capability Introduction

Test agent products, developer platforms, and coding-agent capabilities. Expected structures include capability map, usage path, and value-proof-boundary view.

### Process And Collaboration

Test agent workflows, governance processes, and human-AI responsibility transfer. Expected structures include linear flow, decision branch, and swimlane flow.

### Stress Cases

Test mixed archetypes, conflicting claims, weak conclusions, missing metrics, long input, and duplicated or scattered facts. Low-confidence inputs must expose uncertainty or use the V4.3 fallback rather than fabricate structure.

## Artifacts

Each case preserves:

- source metadata and bounded digest
- expected archetype and required facts
- normalized inventory
- semantic model
- expression candidates and scores
- selected brief and run manifest
- SVG and local PNG
- layout and coverage checks
- Feishu preview for the representative acceptance subset

The suite also produces a summary report with scenario accuracy, fact coverage, structural diversity, fallback rate, layout failures, and qualitative findings.

## Evaluation

### Semantic Gates

- Top-one archetype accuracy: at least 90%.
- Top-two archetype accuracy: at least 95%.
- Critical fact coverage: 100%.
- High-importance facts: selected or explicitly accounted for.
- Unsupported inference: zero for metrics, evidence, risks, and commitments.

### Expression Gates

- At least two visibly distinct valid structures per primary archetype across its three cases.
- No archetype may route every case to the same page skeleton.
- Component selection must match semantic purpose.
- Low-confidence cases must record alternatives or fallback.

### Layout Gates

- No overflow, overlap, clipping, unintended grid holes, or uneven same-row card bottoms.
- No forced tiny text or excessive truncation when container space is available.
- No repeated decorative component used without semantic purpose.
- Whiteboard CLI render and check must pass.

### Feishu Acceptance

At least one representative case per archetype and two review cases are written to a Feishu acceptance document. Exported Feishu previews must be nonblank, editable, readable, and geometrically consistent with local previews.

## Failure Classification

Every failure is assigned to one primary layer:

- source normalization
- semantic classification
- fact selection or completeness
- expression planning
- confidence or fallback policy
- layout engine
- SVG-to-Feishu conversion
- cross-Agent execution

This classification prevents renderer defects from being treated as semantic errors and prevents weak semantic planning from being hidden by visual polish.

## Deliverables

1. A versioned 24-case benchmark fixture set.
2. Automated benchmark runner and report.
3. Local SVG and PNG artifacts for all cases.
4. A Feishu acceptance document with representative boards and written findings.
5. A cross-Agent handoff pack that reuses the same cases tomorrow.

## Non-Goals

- This benchmark does not promote V4.4 to main by itself.
- It does not add new visual styles or renderer components.
- It does not tune thresholds by weakening acceptance floors.
- It does not use synthetic passing cases as a substitute for authoritative material.
