# Regression fixtures only

Everything under this directory is test input or a hand-reviewed baseline. It is not a gallery of production entrypoints and must not be copied as a user brief.

- `briefs/`: V3–V4.3 compatibility fixtures.
- `layout-tests/`: hand-reviewed baselines; `generated-*` files are reproducible and ignored.
- `evals/v43/`: historical control-plane regression.
- `evals/v44/`: V4.4 semantic and acceptance inputs.
- `evals/v44-badcases/`: permanent cross-Agent bad-case inventories.
- `evals/v44-internal/source-catalog.json`: source of truth for the internal benchmark; generated cases and reports are ignored.

Real work must start from the user's source material, follow `references/inventory-extraction-contract.md`, and run `scripts/run-whiteboard-v44.mjs`.
