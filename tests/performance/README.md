# k6 Performance Tests

These k6 scripts provide baseline frontend route performance checks to catch regressions.

## Prerequisites

- Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Start app locally:
  - npm run build:dev
  - npm run preview -- --host 127.0.0.1 --port 4173

## Scripts

- Smoke gate (fast): tests/performance/k6-smoke.js
- Load profile (deeper): tests/performance/k6-load.js
- Baseline comparator: tests/performance/compare-k6-baseline.mjs
- Baseline updater: tests/performance/update-k6-baseline.mjs

## Run

- k6 run --env BASE_URL=http://127.0.0.1:4173 tests/performance/k6-smoke.js
- k6 run --env BASE_URL=http://127.0.0.1:4173 tests/performance/k6-load.js

## Environment-specific threshold tuning

The smoke and load scripts support threshold overrides to fit local/CI environments.

- Smoke defaults:
  - `SMOKE_P95_MS=1100`
  - `SMOKE_P99_MS=1800`
  - `SMOKE_CHECK_RATE=0.99`
- Load defaults:
  - `LOAD_P95_MS=1400`
  - `LOAD_P99_MS=2300`

Example:

- k6 run --env BASE_URL=http://127.0.0.1:4173 --env SMOKE_P95_MS=1200 --env SMOKE_P99_MS=2000 tests/performance/k6-smoke.js

## Baseline regression checks

CI compares the latest smoke summary against the stored baseline:

- `tests/performance/baselines/k6-smoke-baseline.json`

To refresh baseline after intentional performance improvements or infrastructure changes:

1. Generate a summary:
   - `npm run perf:smoke:summary`
2. Update baseline from the generated summary:
   - `npm run perf:baseline:update`
3. Commit the updated baseline file.

Threshold failures will exit with code 1, suitable for CI quality gates.
