import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4173';
const P95_MS = Number(__ENV.SMOKE_P95_MS || 1100);
const P99_MS = Number(__ENV.SMOKE_P99_MS || 1800);
const CHECK_RATE = Number(__ENV.SMOKE_CHECK_RATE || 0.99);

const routes = [
  '/login',
  '/safety-checkin',
  '/',
  '/incidents',
  '/drills',
  '/check-in',
  '/health-official-gaps',
  '/admin',
  '/chat',
];

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    smoke: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: routes.length * 8,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${P95_MS}`, `p(99)<${P99_MS}`],
    checks: [`rate>${CHECK_RATE}`],
    'http_req_duration{page:login}': ['p(95)<800'],
    'http_req_duration{page:dashboard}': ['p(95)<950'],
    'http_req_duration{page:incidents}': ['p(95)<1050'],
    'http_req_duration{page:drills}': ['p(95)<1050'],
    'http_req_duration{page:check-in}': ['p(95)<1000'],
    'http_req_duration{page:admin}': ['p(95)<1150'],
  },
};

export default function () {
  const index = (__VU + __ITER) % routes.length;
  const route = routes[index];
  const page = route.replace('/', '') || 'dashboard';
  const res = http.get(`${BASE_URL}${route}`, {
    tags: { page },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'ttfb under 900ms': (r) => r.timings.waiting < 900,
    'duration under 1700ms': (r) => r.timings.duration < 1700,
  });

  sleep(0.2);
}
