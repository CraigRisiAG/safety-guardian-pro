import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4173';
const P95_MS = Number(__ENV.LOAD_P95_MS || 1400);
const P99_MS = Number(__ENV.LOAD_P99_MS || 2300);

const routes = ['/login', '/safety-checkin', '/', '/incidents', '/drills'];

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    load_profile: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 12 },
        { duration: '30s', target: 5 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${P95_MS}`, `p(99)<${P99_MS}`],
    checks: ['rate>0.98'],
    'http_req_duration{page:login}': ['p(95)<900'],
    'http_req_duration{page:dashboard}': ['p(95)<1200'],
    'http_req_duration{page:incidents}': ['p(95)<1300'],
    'http_req_duration{page:drills}': ['p(95)<1300'],
  },
};

export default function () {
  const route = routes[Math.floor(Math.random() * routes.length)];
  const page = route.replace('/', '') || 'dashboard';
  const res = http.get(`${BASE_URL}${route}`, {
    tags: { page },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'duration under 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(0.4);
}
