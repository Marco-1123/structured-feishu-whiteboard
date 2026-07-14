# Script boundaries

## Production

External Agents must call only:

```bash
node scripts/run-whiteboard-v44.mjs --input <inventory.json> --output-dir <output-dir>
```

`run-whiteboard-v44.mjs` owns validation, semantic compilation, expression planning, V4 rendering, geometry checks, visual checks, PNG conversion and manifest creation. Files such as `render-whiteboard-v4.mjs`, validators and checkers are internal pipeline components, not alternative entrypoints.

The preview gate requires Python 3 with Pillow. Run `bash scripts/preflight.sh` before production use; a PNG that was created before the Pillow check failed still has a failed manifest and is not deliverable.

## Development regression

Files named `test-*`, `eval-*`, `build-*` and `generate-*` support repository maintenance. `validate-layout-tests.sh` is the complete regression suite.

## Historical compatibility

`legacy/` contains V3/V4.3 runners and renderers required by historical regression fixtures. They must never be selected for a user-facing result or used as fallback from V4.4.
