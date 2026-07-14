# V5 Scene Grammar

V5 introduces a topology layer between semantic understanding and visual components. V4.4 remains the stable production pipeline until V5 passes cross-Agent evaluation.

## Pipeline

```text
source -> fact inventory -> semantic model -> scene candidates
       -> selected topology -> deterministic geometry -> style tokens -> SVG
```

## Design boundary

- A scene is selected because relationships qualify it, not because its name appears in the prompt.
- Geometry communicates meaning. Position, direction, area, nesting, and connection cannot be decorative.
- A scene renderer owns coordinates, wrapping, connectors, and capacity. Agents never handwrite SVG or coordinates.
- Facts retain source IDs. A topology cannot silently discard high or critical facts.
- If no scene qualifies with medium confidence, the production runner automatically invokes V4.4. A fallback is recorded explicitly and is never labeled as V5 output.
- Confidence is not a language-model opinion. It is computed from explicit relationship signals, scenario fit, topology completeness, and the score margin over the second candidate.
- Selection and rendering are separate gates: a scene can score well but still be rejected when its visible carriers do not cover every critical and high-importance fact.

## Alpha contract

- Input: a schema-valid `semantic-model.json` produced by the audited V4.4 extraction chain.
- Decision: `scene-decision.json` records all candidates, scores, reasons, margin, and coverage.
- Layout: `scene-plan.json` contains visible nodes, edges, layers or lanes, and source fact IDs; it contains no free coordinates from an Agent.
- Output: deterministic SVG plus Feishu-side preview and geometry check.
- Fallback: no partial V5 output is delivered. Production inputs continue through V4.4 and the manifest records the fallback pipeline and reason. Test-only semantic fixtures fail instead of fabricating a fallback source chain.

V5 Alpha does not yet replace the raw-source extraction and source audit in V4.4. It upgrades the expression and composition half of the pipeline first.

## Alpha.2 scene set

### Layered architecture

Use for capabilities, systems, responsibilities, or strategy layers connected by `belongs-to`, `supports`, or `depends-on` relationships.

- 2-4 layers.
- 2-6 nodes per layer.
- Layers use horizontal bands; nodes inside a layer use equal-width cells and wrap into a second row when required.
- Peer nodes have no arrows. Only cross-layer dependencies may connect.

### Swimlane process

Use when ordered steps have explicit owners and at least two ownership handoffs.

- 2-4 lanes and 4-10 steps in the Alpha onepage geometry.
- Lanes encode responsibility; horizontal order encodes sequence.
- Edges connect actual step anchors and use orthogonal paths.
- A decision node requires explicit branch labels; otherwise it remains an action node.
- More than 10 visible steps must fall back until a segmented or snake-flow geometry is implemented.

### Flywheel loop

Use only when the final stage explicitly produces, supports, or precedes the first stage.

- 4-6 stages.
- Equal angular spacing around one center theme.
- Curved directional segments make the loop visible.
- A merely ordered list is not a flywheel.

### Decision comparison

Use only when the material contains 2-4 explicit options, at least two criteria, and explicit option-to-criterion relationships.

- Columns represent options; rows represent criteria.
- Cell state comes from semantic relationships: match, conflict, dependency, contrast, or pending validation.
- The recommendation remains traceable to a conclusion fact.
- A list of unrelated proposals is not a comparison matrix.

### Evidence argument

Use when one explicit thesis is supported or explained by at least three evidence, cause, or result facts and at least two support/causal edges.

- The thesis is the visual center.
- Evidence is distributed on both sides and connects through orthogonal paths.
- Geometry encodes support direction; evidence cards are not a decorative grid.
- Unsupported claims and loose fact lists must fall back.

### Operating dashboard

Use for review/update material with at least three result, metric, trend, or variance facts, including at least two numeric indicators.

- Hero metrics carry the primary numbers.
- Secondary indicators use progress carriers only when a comparable scale exists.
- Risks and actions retain distinct semantic color roles.
- Narrative-only reports do not qualify as dashboards.

## Future scene set

After these six scenes pass cross-Agent evaluation, consider causal fishbone, funnel/pyramid, milestone roadmap, and additional data-native charts. Each must have a dedicated qualification contract and deterministic geometry algorithm.
