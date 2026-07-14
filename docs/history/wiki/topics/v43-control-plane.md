# V4.3 Control Plane

Purpose: record the operational rules introduced by V4.3 so future Agents do not treat it as another visual template release.

## Position

V4.3 is a control-plane beta. V3.2 remains the stable release while V4.3 proves that richer layouts can remain explainable, complete, deterministic, and replayable across Agent environments.

## Durable Rules

- Persist material understanding in a typed content inventory.
- Rank multiple scene candidates and record reasons and confidence.
- Treat `config/capabilities.json` as the executable registry for engine, layout, target, and style support.
- Reject unsupported combinations; never silently fall back to professional blue.
- Require every critical fact to enter the board.
- Require every high-priority fact to be selected or explicitly omitted with an allowed reason.
- Build V4 expression layouts from intrinsic block profiles and an ordered 12-column grid. Short parallel items compact into grids; directional and truly dense blocks retain full width.
- Run geometry, V4, V4.3 visual-quality, and Feishu-side preview checks.
- Preserve `run-manifest.json` as the replay and incident record.

## Artifacts

```text
content inventory
route decision
brief
SVG or DSL output
PNG preview
run manifest
Feishu document and preview
```

## Release Boundary

- `main`: stable V3.2.
- `codex/v4.3-control-plane`: V4.3 beta.

V4.3 is ready for promotion only after cross-Agent tests use the same branch and local installation, all committed evaluations pass, and representative Feishu previews pass human inspection.

## Beta.2 Adaptive Density

Cross-Agent beta testing exposed an overcorrection: V4.2 prevented narrow overflow by promoting four-item lists to full width, which created repetitive vertical stacks for short content. Beta.2 replaces item-count-only promotion with measured content demand, supports 1/3, 1/2, 2/3, and full-width spans, adds compact list interiors, and rejects sparse full-width repetition.
