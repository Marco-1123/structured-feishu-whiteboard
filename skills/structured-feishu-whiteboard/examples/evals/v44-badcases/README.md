# V4.4 OnePage bad-case regression set

These fixtures preserve the two cross-Agent failures reported on 2026-07-13.

- `audit-assistant-overview`: prevents measurable signals from degrading into repeated text rows and prevents vertical report-strip output.
- `audit-assistant-capability`: prevents process and capability content from overflowing its cards while preserving the compact, information-rich onepage composition.

Acceptance rules:

- expression-canvas output must keep its width/height ratio between 1.1 and 2.4;
- measurable facts must produce metric cards;
- selected `pageSkeleton` must reach the SVG root;
- selected facts must be visibly rendered rather than only listed in metadata;
- three-item and five-item peer groups must use balanced grids without empty cells;
- item labels and notes must not repeat the same sentence;
- important facts must remain covered;
- all automated SVG, V4 layout, visual quality, and whiteboard checks must pass.
