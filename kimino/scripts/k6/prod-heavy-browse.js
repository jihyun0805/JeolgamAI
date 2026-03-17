import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "https://j14a502.p.ssafy.io";
const ROUTES = [
  "/",
  "/history",
  "/recommend/foreign",
  "/recommend/game",
  "/recommend/project",
  "/recommend/rename",
  "/recommend/saju",
  "/recommend/team",
];

export const options = {
  discardResponseBodies: true,
  scenarios: {
    heavy_browse: {
      executor: "ramping-arrival-rate",
      timeUnit: "1s",
      preAllocatedVUs: 300,
      maxVUs: 1200,
      stages: [
        { target: 150, duration: "1m" },
        { target: 300, duration: "2m" },
        { target: 450, duration: "2m" },
        { target: 600, duration: "2m" },
        { target: 0, duration: "30s" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.5"],
  },
};

function pickRoute() {
  return ROUTES[Math.floor(Math.random() * ROUTES.length)];
}

export default function () {
  const primaryRoute = pickRoute();
  const secondaryRoute = pickRoute();
  const responses = http.batch([
    ["GET", `${BASE_URL}${primaryRoute}`],
    ["GET", `${BASE_URL}${secondaryRoute}`],
  ]);

  for (const response of responses) {
    check(response, {
      "status is 200 or 304": (r) => r.status === 200 || r.status === 304,
    });
  }

  sleep(Math.random() * 0.5);
}
