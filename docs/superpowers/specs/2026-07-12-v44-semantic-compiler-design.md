# V4.4 Beta Semantic Compiler Design

## Status

- Target branch: `codex/v4.4-semantic-compiler`
- Stable fallback: V4.3 on `main`
- Delivery channel: Beta; it must not replace the locally installed V4.3 by default.

## Product Goal

V4.4 makes different source materials produce visibly different, semantically appropriate OnePage structures. The Skill must stop jumping directly from source text to a familiar template. It must first understand the material, model its information relationships, select an expression strategy, and only then build a deterministic layout.

The primary audience is a decision-maker or cross-team reader who needs to understand the important points quickly. This is not limited to upward reporting. The default reading order is:

1. What happened or what is being proposed.
2. The most important result or change.
3. Why it happened or why the proposal is justified.
4. What risks or unresolved questions matter.
5. What happens next.
6. What evidence supports the judgment.

Execution detail enters the board only when it changes the decision.

## Scope

All six semantic archetypes are in V4.4 Beta scope:

1. Review and stage update.
2. Strategy and proposal.
3. Project plan.
4. Research and decision.
5. Product or capability introduction.
6. Process and collaboration.

Review and stage update receives the largest fixture set and tuning budget, but the other five archetypes must also have independent semantic rules, composition policies, and passing acceptance cases.

## Shared Reading Model

Every OnePage uses two visual reading layers:

- First layer: conclusion, primary result, critical metrics, and stage judgment.
- Second layer: change, cause, evidence, risk, and next-stage plan.

Important conclusions, constraints, risks, metrics, evidence, and actions must not be deleted for visual simplicity. Low-value repetition, procedural narration, formatting fragments, and unsupported filler can be removed. The board may grow within the established OnePage rules, but it must not solve overload by shrinking text below the V4.3 readability floor.

## Architecture

The pipeline has four explicit stages:

```text
source material
  -> semantic model
  -> expression plan candidates
  -> scored layout brief
  -> V4 deterministic renderer
```

V4.4 adds the first two stages. It reuses V4.3 rendering, visual gates, Feishu compatibility checks, and replayable run manifests.

### 1. Semantic Model

The Agent produces `semantic-model.json` before producing a whiteboard brief.

Required top-level fields:

- `schemaVersion`: semantic model schema version.
- `scenario`: primary archetype and optional secondary archetype.
- `audienceIntent`: quick understanding, decision, alignment, or selection.
- `timeScope`: review period, current stage, and future planning period when present.
- `facts[]`: typed facts with stable IDs.
- `relationships[]`: typed links between facts.
- `readingLayers`: first-layer and second-layer fact IDs.
- `completenessLedger`: selected, merged, downgraded, and omitted fact IDs with reasons.

Each fact contains:

- `id`
- `type`: conclusion, objective, result, metric, trend, variance, cause, risk, evidence, action, stage, actor, capability, option, constraint, input, output, or unresolved.
- `text`
- `importance`: critical, high, medium, or low.
- `sourceRef`
- `confidence`: supported, inferred, draft, or missing.
- optional structured values such as metric value, unit, period, owner, status, or target.

Relationships support:

- causes
- supports
- contrasts
- precedes
- depends-on
- belongs-to
- conflicts-with
- mitigates
- produces
- owned-by

The model must not invent missing business facts. Missing required information is represented as `unresolved` or `missing`, and the expression planner adapts rather than filling the gap with fabricated content.

### 2. Archetype Rules

#### Review And Stage Update

Core chain:

`objective -> actual result -> change or variance -> cause -> risk -> next-stage action`

Supported subtypes include quarterly review, half-year summary and next-half plan, project stage update, OKR review, business-line comparison, operational review, and text-heavy stage summary without complete metrics.

Possible visual spines include metric-and-trend review, achievement/problem/action review, multi-line comparison, past/future split, and variance-and-cause analysis.

#### Strategy And Proposal

Core chain:

`context -> strategic judgment -> choices and trade-offs -> strategic pillars -> roadmap -> risk`

The planner must not force strategy into an operating dashboard merely because the material includes numbers.

#### Project Plan

Core chain:

`goal -> scope -> stages -> dependencies -> owners -> deliverables -> milestones -> risk`

Future work dominates. If substantial actual results are present, review becomes the primary scenario and project plan becomes secondary.

#### Research And Decision

Core chain:

`question -> evidence -> insight -> options -> comparison -> recommendation -> uncertainty`

Evidence and decision criteria must remain visible. The output must not degrade into generic conclusions and action cards.

#### Product Or Capability Introduction

Core chain:

`audience problem -> value proposition -> capability structure -> usage path -> proof -> boundary`

This archetype favors capability maps, value chains, before/after comparisons, and proof points rather than risk-heavy review layouts.

#### Process And Collaboration

Core chain:

`trigger -> actor -> input -> action or decision -> output -> next owner -> exception`

True dependency and responsibility relationships route to `flow-canvas`; non-dependent conceptual mechanisms stay in report-style process or value-chain layouts.

### 3. Expression Planner

The planner converts one semantic model into two or three `expression-plan` candidates.

Each candidate records:

- `narrativeType`: result-driven, problem-driven, comparison-driven, causal, temporal, hierarchical, or flow-driven.
- `pageSkeleton`: overview-and-detail, past-future split, left-right argument, multi-line comparison, centered system, timeline, or swimlane.
- `regions[]`: semantic purpose, fact IDs, preferred component family, visual priority, and width intent.
- `componentMix`: selected components and repetition limits.
- `fallbackLayout`
- `scoreBreakdown`

The component vocabulary includes existing verified V4 components such as statement, metric card, progress group, trend sparkline, status board, decision matrix, variance bridge, evidence tile, risk cluster, action checklist, roadmap, narrative chain, and flow node. V4.4 may add semantic variants only when an archetype cannot be expressed with the existing vocabulary.

The planner must not use a whole-page template as its first decision. It selects a narrative, skeleton, regions, and components in that order.

### 4. Candidate Scoring And Confidence

Confidence is evidence-based, not an unconstrained model self-rating.

Candidate scoring includes:

- critical and high fact coverage
- semantic component match
- narrative coherence
- first-layer clarity
- second-layer evidence support
- space utilization
- component repetition penalty
- unsupported inference penalty
- renderer capability compatibility

Decision policy:

- High confidence: one candidate clearly leads and all required facts are supported; render it directly.
- Medium confidence: score all candidates and deliver the best one while recording alternatives in the run manifest.
- Low confidence: expose two or three structural directions for user selection. If no selection is available, fall back to V4.3.

Initial thresholds are configuration values and will be calibrated through the evaluation set. The first release must record score evidence even if threshold values change during Beta.

## Failure And Fallback Policy

- Semantic validation failure: do not render V4.4; use V4.3.
- Critical fact omission: candidate is invalid.
- Missing archetype fields: adapt the narrative or mark unresolved; do not fabricate.
- Unsupported component combination: choose another candidate.
- Layout or visual gate failure: try the next valid candidate, then fall back to V4.3.
- Feishu conversion failure: return the V4.3 result and preserve the failed V4.4 manifest for debugging.

The user must receive a usable board whenever V4.3 can produce one. V4.4 experimentation must not lower stable delivery.

## Run Artifacts

A V4.4 run preserves:

- normalized source inventory
- `semantic-model.json`
- candidate expression plans
- candidate scores and confidence evidence
- selected brief
- rendered SVG
- visual and Feishu checks
- V4.3 fallback result when used
- `run-manifest.json`

These artifacts make cross-Agent differences replayable and diagnosable.

## Evaluation Plan

Minimum semantic and composition cases:

- Review and stage update: 12
- Strategy and proposal: 5
- Project plan: 5
- Research and decision: 5
- Product or capability introduction: 5
- Process and collaboration: 5
- Mixed or low-confidence material: 5

Total minimum: 42 cases.

Review fixtures must include:

- text-only summary without metrics
- scattered metrics and narrative
- complete quarterly or half-year review
- review plus next-stage plan
- multiple business lines or teams
- duplicate or conflicting source statements
- weak conclusion requiring unresolved markers

Automated metrics:

- archetype top-one and top-two accuracy
- critical fact coverage
- high fact accounting
- semantic component match rate
- layout and component diversity
- same-archetype structural diversity
- cross-Agent consistency
- V4.3 fallback success rate
- SVG, layout, and Feishu conversion pass rate

Visual acceptance compares at least one representative output from every archetype in Feishu. Review and stage update receives multiple Feishu-side samples across data-rich, text-heavy, multi-line, and past/future materials.

## Acceptance Criteria

V4.4 Beta is ready for cross-Agent testing when:

- all six archetypes are implemented
- all 42 minimum cases pass schema and coverage checks
- archetype top-two accuracy is at least 90 percent
- critical fact coverage is 100 percent
- high facts are selected or explicitly accounted for
- each archetype produces at least two visibly distinct valid structures across its fixtures
- no candidate passes by silently falling back to a generic dashboard
- V4.3 fallback succeeds for every intentionally failed V4.4 case
- selected Feishu previews are readable, editable, nonblank, and free of overflow or connector defects

## Non-Goals

- V4.4 does not replace Skill + Agent with a standalone web product.
- V4.4 does not add arbitrary freehand SVG generation.
- V4.4 does not require a new final rendering medium.
- V4.4 does not promote itself to `main` before cross-Agent Beta evidence is reviewed.
- V4.4 does not make all six archetypes share one visual skeleton.

