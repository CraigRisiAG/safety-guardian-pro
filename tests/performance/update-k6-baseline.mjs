import fs from 'node:fs';

const summaryFile = process.env.SUMMARY_FILE || 'test-results/k6-smoke-summary.json';
const baselineFile = process.env.BASELINE_FILE || 'tests/performance/baselines/k6-smoke-baseline.json';

if (!fs.existsSync(summaryFile)) {
  throw new Error(`Summary file not found: ${summaryFile}`);
}

const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));

function getMetric(metricName, valueName, fallback = 0) {
  const metric = summary?.metrics?.[metricName];
  const value = metric?.values?.[valueName] ?? metric?.[valueName] ?? metric?.value;
  return typeof value === 'number' ? value : fallback;
}

const baseline = {
  capturedAt: new Date().toISOString(),
  source: summaryFile,
  metrics: {
    global: {
      p95: getMetric('http_req_duration', 'p(95)'),
      p99: getMetric('http_req_duration', 'p(99)'),
      failedRate: getMetric('http_req_failed', 'rate'),
      checkRate: getMetric('checks', 'rate'),
    },
    routes: {
      login: { p95: getMetric('http_req_duration{page:login}', 'p(95)') },
      dashboard: { p95: getMetric('http_req_duration{page:dashboard}', 'p(95)') },
      incidents: { p95: getMetric('http_req_duration{page:incidents}', 'p(95)') },
      drills: { p95: getMetric('http_req_duration{page:drills}', 'p(95)') },
    },
  },
};

fs.writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
console.log(`Baseline updated: ${baselineFile}`);
