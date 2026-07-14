# Repository audit: V4.4 entrypoint cleanup

Audit date: 2026-07-14. Baseline: immutable tag `v4.4.0-beta.6` (`b041449`). Cleanup branch: `codex/v4.4-repository-cleanup`.

## External-Agent evidence

1. GitHub's default branch was `main` at V4.3. Its root exposed `SKILL.md`, `scripts/`, `references/` and the unpinned command `npx skills add Marco-1123/structured-feishu-whiteboard`. An Agent entering through the repository homepage therefore installed or followed V4.3 instead of beta.6.
2. The beta.6 tag contained 609 tracked files: 579 under `skills/structured-feishu-whiteboard/`. Its README used the pinned tag and standard subdirectory, proving the installation-parity fix was present but not visible on the default page.
3. The beta.6 package still exposed `scripts/run-whiteboard.mjs`, `scripts/route-whiteboard.mjs`, V3 SVG/DSL renderers and legacy capabilities next to `run-whiteboard-v44.mjs`. Historical plans also called these old files “production” entrypoints.
4. Twelve files under `docs/superpowers/` described completed V3.3–V4.4 implementation work and began with execution directives. They were historical plans, but their location made them look active.
5. The installable Skill contained about 35 MB and 579 files, including 101 PNGs, 75 SVGs and many manifests with local absolute paths. Most were reproducible outputs rather than runtime dependencies.
6. Current references and old references coexisted. For example, current `deterministic-rendering.md` prohibited version choice while older `layout-library.md`, `long-form-workflow.md` and `report-workflow.md` still taught V3/V4.3 selection rules.
7. An isolated runtime test showed that the preview gate imports Pillow, while the old preflight checked only the Python executable indirectly. The new preflight fails early with an actionable Pillow message.

## Classification and action

| Class | Contents | Action |
|---|---|---|
| Production required | `SKILL.md`, `VERSION`, agents metadata, schemas, config, V4.4 semantic compiler, V4 renderer, validators/checkers, six current references | Kept in the installable Skill; production code behavior unchanged |
| Development regression | legacy renderer code, V3–V4.3 briefs, hand-reviewed layout baselines, V4.4 inventories, bad cases, source catalog, tests and benchmark tools | Kept, explicitly labeled; old executable entrypoints moved to `scripts/legacy/` |
| Historical archive | implementation plans/specs, former wiki, superseded rules, prior release evidence and visual examples | Moved under `docs/history/` |
| Deletable noise | generated `generated-*` assets, benchmark case outputs, reports, manifests and duplicate SVG/PNG renders | Removed from the current tree and ignored; still available through Git history and immutable tags |

## Invariants

- Tags were not moved, deleted or rewritten.
- `v4.4.0-beta.6` remains the only installation target.
- `scripts/run-whiteboard-v44.mjs` remains the only production entrypoint.
- `render-whiteboard-v4.mjs` remains in place because the beta.6 runner calls it directly.
- Cleanup must pass the full regression suite, an isolated tagged GitHub installation and a real PNG render before merge.

## Default-branch requirement

This branch deliberately does not merge itself. The GitHub homepage will continue to show the old V4.3 default tree until a maintainer reviews and merges this branch (or otherwise promotes the same commit). No immutable tag needs to change.
