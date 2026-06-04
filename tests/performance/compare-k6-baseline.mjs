import fs from 'node:fs';

const summaryFile = process.env.SUMMARY_FILE || 'test-results/k6-smoke-summary.json';
const baselineFile = process.env.BASELINE_FILE || 'tests/performance/baselines/k6-smoke-baseline.json';
const maxRegressionPct = Number(process.env.MAX_REGRESSION_PCT || 15);

function readJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function getSummaryMetric(summary, metricName, valueName) {
  const metric = summary?.metrics?.[metricName];
  return metric?.values?.[valueName] ?? metric?.[valueName] ?? metric?.value;
}

function percentRegression(current, baseline) {
  if (baseline === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - baseline) / baseline) * 100;
}

function compareLowerIsBetter(label, current, baseline, tolerancePct, failures) {
  if (typeof current !== 'number' || typeof baseline !== 'number') {
    console.warn(`Skipping ${label}: metric missing in summary or baseline`);
    return;
  }

  const regression = percentRegression(current, baseline);
  const pass = regression <= tolerancePct;
  const status = pass ? 'PASS' : 'FAIL';

  console.log(`${status} ${label} current=${current.toFixed(2)} baseline=${baseline.toFixed(2)} regression=${regression.toFixed(2)}%`);

  if (!pass) {
    failures.push(`${label} regressed by ${regression.toFixed(2)}% (allowed ${tolerancePct}%)`);
  }
}

function compareHigherIsBetter(label, current, baseline, tolerancePct, failures) {
  if (typeof current !== 'number' || typeof baseline !== 'number') {
    console.warn(`Skipping ${label}: metric missing in summary or baseline`);
    return;
  }

  if (baseline <= 0) {
    const pass = current > 0;
    const status = pass ? 'PASS' : 'FAIL';
    console.log(`${status} ${label} current=${current.toFixed(4)} baseline=${baseline.toFixed(4)} drop=n/a`);
    if (!pass) {
      failures.push(`${label} current value must be > 0 when baseline is 0`);
    }
    return;
  }

  const drop = ((baseline - current) / baseline) * 100;
  const pass = drop <= tolerancePct;
  const status = pass ? 'PASS' : 'FAIL';

  console.log(`${status} ${label} current=${current.toFixed(4)} baseline=${baseline.toFixed(4)} drop=${drop.toFixed(2)}%`);

  if (!pass) {
    failures.push(`${label} dropped by ${drop.toFixed(2)}% (allowed ${tolerancePct}%)`);
  }
}

const summary = readJson(summaryFile);
const baseline = readJson(baselineFile);
const failures = [];

const checks = [
  {
    label: 'Global p95 latency',
    current: getSummaryMetric(summary, 'http_req_duration', 'p(95)'),
    baseline: baseline.metrics.global.p95,
    type: 'lower',
  },
  {
    label: 'Global p99 latency',
    current: getSummaryMetric(summary, 'http_req_duration', 'p(99)'),
    baseline: baseline.metrics.global.p99,
    type: 'lower',
  },
  {
    label: 'HTTP failure rate',
    current: getSummaryMetric(summary, 'http_req_failed', 'rate'),
    baseline: baseline.metrics.global.failedRate,
    type: 'lower',
  },
  {
    label: 'Check pass rate',
    current: getSummaryMetric(summary, 'checks', 'rate'),
    baseline: baseline.metrics.global.checkRate,
    type: 'higher',
  },
  {
    label: 'Login p95 latency',
    current: getSummaryMetric(summary, 'http_req_duration{page:login}', 'p(95)'),
    baseline: baseline.metrics.routes.login.p95,
    type: 'lower',
  },
  {
    label: 'Dashboard p95 latency',
    current: getSummaryMetric(summary, 'http_req_duration{page:dashboard}', 'p(95)'),
    baseline: baseline.metrics.routes.dashboard.p95,
    type: 'lower',
  },
  {
    label: 'Incidents p95 latency',
    current: getSummaryMetric(summary, 'http_req_duration{page:incidents}', 'p(95)'),
    baseline: baseline.metrics.routes.incidents.p95,
    type: 'lower',
  },
  {
    label: 'Drills p95 latency',
    current: getSummaryMetric(summary, 'http_req_duration{page:drills}', 'p(95)'),
    baseline: baseline.metrics.routes.drills.p95,
    type: 'lower',
  },
];

for (const check of checks) {
  if (check.type === 'higher') {
    compareHigherIsBetter(check.label, check.current, check.baseline, maxRegressionPct, failures);
  } else {
    compareLowerIsBetter(check.label, check.current, check.baseline, maxRegressionPct, failures);
  }
}

if (failures.length > 0) {
  console.error('\nBaseline comparison failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nBaseline comparison passed.');
