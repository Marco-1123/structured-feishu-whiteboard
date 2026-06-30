# Future Product Roadmap

Purpose: record the current product direction after V3.2 stabilized and V3.3 began exploring richer expression grammar.

## Current Position

The project should remain Skill-first.

The user has tested a separate web-product direction and currently considers "Skill + Agent workbench" more stable than turning the workflow into a full web product. Future web work should support adoption and communication first, not replace the Skill as the core carrier.

## Near-Term Roadmap

### V3.4: Controlled Data Expression Components

Goal: reduce template fatigue by expanding the controllable component library.

Focus on schema-backed, renderer-backed data and information components:

- status boards,
- trend small charts,
- decision matrices,
- variance bridge 2.0,
- richer dashboard onepage composition.

The aim is not more decoration. Different materials should trigger different information structures while preserving deterministic rendering and layout checks.

Initial V3.4 implementation uses `expression-canvas` blocks rather than a new top-level layout. This keeps V3.4 close to the V3.3 expression grammar while adding higher-signal components.

### V3.5: Restrained Style Expansion

Goal: expand visual variety after the component library becomes more expressive.

Explore more designed but still work-appropriate styles beyond the current blue/Apple Studio/Linear Command set:

- high-end consulting style,
- data product / SaaS dashboard style,
- restrained brand-color style with stronger visual tension.

Colors must keep semantic logic. Style should serve information hierarchy and readability, not become poster-like or arbitrary.

### V4: Multi-Renderer Stabilization

Goal: turn the current SVG + DSL experiments into a clearer engine strategy.

V4 should be considered after V3.4 components prove stable in real Feishu documents. It can then formalize when to use SVG, DSL, or other controlled renderers.

## Adjusted V5 Direction

V5 is no longer defined as a web product entry where users input prompts and generate boards through a standalone web UI.

New V5 direction: create an introduction and promotion website for the Skill.

The website should help end users understand:

- what the Skill does,
- what scenarios it supports,
- how it differs from freehand whiteboard generation,
- example outputs across styles and layouts,
- how to install and use it with an Agent.

This is a marketing / education / documentation surface, not the primary generation workflow. The primary workflow remains installing and invoking the Skill inside Agent environments.

## Strategic Principle

The project should optimize for reliable adoption:

- Skill remains the core production carrier.
- Agent workbench remains the main user workflow.
- Web pages can help explain, compare, and promote the Skill.
- Full web-product generation should not be prioritized unless the Skill workflow becomes a bottleneck.
