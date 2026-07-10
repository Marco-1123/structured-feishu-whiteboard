# V4.3 Beta.2 Adaptive Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace V4.3's binary half/full placement with content-driven spans and compact short-list grids while preserving dense-content readability.

**Architecture:** A pure intrinsic-profile function classifies each expression block before layout. A deterministic ordered 12-column packer consumes those profiles, and the SVG renderer uses the same profile for internal list arrangement and quality metadata. The visual gate rejects sparse over-expansion independently of rendering.

**Tech Stack:** Node.js ES modules, JSON fixtures, SVG, `@larksuite/whiteboard-cli`, `lark-cli`.

## Global Constraints

- V3 and DSL rendering behavior must not change.
- Typography must not shrink to solve overflow.
- Directional components remain full width.
- Brief order remains the reading order.
- Stable `main` remains V3.2; beta.2 stays on `codex/v4.3-control-plane`.

---

### Task 1: Reproduce Sparse Full-Width Stacking

**Files:**
- Create: `examples/briefs/v43-sparse-stack-regression.json`
- Modify: `scripts/test-v4-layout-tree.mjs`
- Modify: `scripts/test-v43-visual-quality.mjs`

**Interfaces:**
- Consumes: existing `buildExpressionLayout()` and `inspectV43VisualQuality()`.
- Produces: failing assertions for adaptive spans and sparse full-width rejection.

- [ ] **Step 1: Add the regression brief**

Create a V4 modular canvas with three metric cards, one compact status board, three four-item short lists, and one five-node mini roadmap.

- [ ] **Step 2: Add a failing intrinsic-span test**

```js
const profile = profileExpressionBlock(shortFourItemList);
assert.equal(profile.preferredSpan, 6);
assert.equal(profile.itemLayout, "grid-2");
```

- [ ] **Step 3: Add a failing quality-gate test**

```js
const result = inspectV43VisualQuality(svgWithThreeSparseFullBlocks);
assert.equal(result.ok, false);
assert.match(result.issues.join(" "), /sparse full-width/i);
```

- [ ] **Step 4: Verify the tests fail for the missing behavior**

Run:

```bash
node scripts/test-v4-layout-tree.mjs
node scripts/test-v43-visual-quality.mjs
```

Expected: both fail on adaptive-density assertions, not syntax errors.

- [ ] **Step 5: Commit the red tests**

```bash
git add examples/briefs/v43-sparse-stack-regression.json scripts/test-v4-layout-tree.mjs scripts/test-v43-visual-quality.mjs
git commit -m "test: reproduce sparse V4 stacking"
```

### Task 2: Add Intrinsic Profiles And Ordered Grid

**Files:**
- Modify: `scripts/lib/v4-layout-tree.mjs`
- Modify: `scripts/test-v4-layout-tree.mjs`

**Interfaces:**
- Produces: `profileExpressionBlock(block)` and `buildAdaptiveExpressionLayout(options)`.
- Profile fields: `span`, `minSpan`, `preferredSpan`, `maxSpan`, `density`, `itemLayout`, `reason`, `textUnits`, `itemCount`.

- [ ] **Step 1: Implement deterministic text-demand helpers**

```js
function itemText(item = {}) {
  return `${item.label || ""}${item.note || ""}${item.value || ""}`;
}
```

Classify sparse/medium/dense using maximum item length, total length, notes, and item count.

- [ ] **Step 2: Implement block profiling**

Directional block types return span 12. Four short list items return span 6 with `grid-2`; long explanatory lists return span 12 with `rows`.

- [ ] **Step 3: Implement ordered 12-column row packing**

```js
buildAdaptiveExpressionLayout({ blocks, x, startY, width, gap, measure, profile })
```

Pack spans 4/6/8/12 without reordering. Record `row`, `span`, and profile data on every node.

- [ ] **Step 4: Run layout-tree tests**

Run: `node scripts/test-v4-layout-tree.mjs`

Expected: `ok: V4.3 layout tree tests passed`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/v4-layout-tree.mjs scripts/test-v4-layout-tree.mjs
git commit -m "feat: add intrinsic V4 block sizing"
```

### Task 3: Render Adaptive Spans And List Grids

**Files:**
- Modify: `scripts/render-whiteboard-v4.mjs`
- Create: `scripts/test-v43-adaptive-render.mjs`

**Interfaces:**
- Consumes: `profileExpressionBlock()` and `buildAdaptiveExpressionLayout()`.
- Produces: SVG nodes with span/density metadata and list rows or grids selected from the profile.

- [ ] **Step 1: Add a failing rendered-SVG test**

Render `v43-sparse-stack-regression.json` and assert:

```js
assert.match(svg, /data-item-layout="grid-2"/);
assert.ok([...svg.matchAll(/data-span="6"/g)].length >= 2);
```

Also render the V4.2 architecture fixture and assert its explanatory list blocks remain at least `data-span="6"` with `data-item-layout="rows"`; a separate synthetic dense profile test retains the full-width requirement.

- [ ] **Step 2: Verify the render test fails**

Run: `node scripts/test-v43-adaptive-render.mjs`

Expected: failure because metadata and adaptive grid rendering do not exist.

- [ ] **Step 3: Update list rendering**

Pass the profile into `blockRenderer()` and `listBlock()`. Implement row, two-column, and three-column item geometry with line-derived item height.

- [ ] **Step 4: Update top-level markers**

Emit `data-span`, `data-density`, `data-preferred-width`, `data-text-units`, `data-item-count`, and `data-item-layout` from layout nodes.

- [ ] **Step 5: Use the adaptive layout in expression canvases**

Replace `buildExpressionLayout()` in `renderCanvas()` with `buildAdaptiveExpressionLayout()` while retaining the legacy function for existing unit coverage.

- [ ] **Step 6: Verify adaptive and existing V4 tests**

```bash
node scripts/test-v43-adaptive-render.mjs
node scripts/test-v4-layout-tree.mjs
node scripts/check-v4-layout.mjs examples/layout-tests/generated-v43-sparse-stack-regression.svg
```

Expected: adaptive tests pass and existing fixtures render.

- [ ] **Step 7: Commit**

```bash
git add scripts/render-whiteboard-v4.mjs scripts/test-v43-adaptive-render.mjs
git commit -m "feat: render adaptive V4 expression grids"
```

### Task 4: Enforce Semantic Density Quality

**Files:**
- Modify: `scripts/lib/v43-visual-quality.mjs`
- Modify: `scripts/test-v43-visual-quality.mjs`
- Modify: `scripts/validate-layout-tests.sh`

**Interfaces:**
- Consumes: V4.3 SVG marker metadata.
- Produces: actionable failures for overstretch and repetitive sparse full-width stacking.

- [ ] **Step 1: Parse density metadata in the checker**

Read span, density, preferred width, text units, item count, and item layout into each block record.

- [ ] **Step 2: Implement sparse-overstretch checks**

Reject sparse non-directional full-width blocks whose preferred width is at least one grid step smaller. Reject three consecutive sparse full-width non-directional blocks.

- [ ] **Step 3: Verify quality tests**

Run: `node scripts/test-v43-visual-quality.mjs`

Expected: valid compact examples pass; sparse stacks fail with block IDs and span details.

- [ ] **Step 4: Add the adaptive render test to full regression**

Append `node scripts/test-v43-adaptive-render.mjs >/dev/null` to `scripts/validate-layout-tests.sh`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/v43-visual-quality.mjs scripts/test-v43-visual-quality.mjs scripts/validate-layout-tests.sh
git commit -m "feat: reject sparse V4 overexpansion"
```

### Task 5: Version, Documentation, Acceptance, And Release

**Files:**
- Modify: `VERSION`
- Modify: `config/capabilities.json`
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `references/expression-grammar.md`
- Modify: `references/quality-checklist.md`
- Modify: `wiki/log.md`
- Modify: `wiki/topics/v43-control-plane.md`

**Interfaces:**
- Produces: installable `4.3.0-beta.2`, updated governance guidance, regression assets, and Feishu acceptance document.

- [ ] **Step 1: Update version and guidance**

Document adaptive spans, short-list grids, sparse-stack rejection, and the distinction between beta.2 layout repair and V4.4 semantic compilation.

- [ ] **Step 2: Run focused verification**

```bash
node scripts/test-v4-layout-tree.mjs
node scripts/test-v43-adaptive-render.mjs
node scripts/test-v43-visual-quality.mjs
node scripts/eval-v43.mjs
```

Expected: all pass.

- [ ] **Step 3: Run complete regression**

Run: `bash scripts/validate-layout-tests.sh`

Expected: `ok: layout test fixtures rendered and checked`.

- [ ] **Step 4: Create Feishu acceptance document**

Write both the sparse regression output and dense V4.2 output as editable whiteboards, export Feishu previews, and inspect them for overflow, repetitive stacking, and excessive canvas height.

- [ ] **Step 5: Synchronize the installed Skill**

Copy the verified branch to `~/.codex/skills/structured-feishu-whiteboard`, then compare `VERSION` and `config/capabilities.json` hashes and run focused tests from the installed directory.

- [ ] **Step 6: Commit and push beta.2**

```bash
git add VERSION config/capabilities.json SKILL.md README.md references wiki
git commit -m "docs: release V4.3 beta.2 adaptive density"
git push origin codex/v4.3-control-plane
```
