import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<1200"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://backend:8000";

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    "health status is 200": (r) => r.status === 200,
  });

  const summary = http.get(`${BASE_URL}/dashboard/summary`);
  check(summary, {
    "summary status is 200": (r) => r.status === 200,
  });

  const farms = http.get(`${BASE_URL}/farms`);
  check(farms, {
    "farms status is 200": (r) => r.status === 200,
  });

  sleep(1);
}
