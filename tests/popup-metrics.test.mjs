import test from "node:test";
import assert from "node:assert/strict";

import { getPopupMetrics } from "../src/shared/popup-metrics.js";

test("getPopupMetrics aggregates total, platform totals, and website total", () => {
  const stats = {
    totalBlocked: 42,
    youtube: {
      network: 10,
      player: 6,
      cosmetic: 3
    },
    spotify: {
      network: 8,
      player: 11,
      cosmetic: 4
    }
  };

  assert.deepEqual(getPopupMetrics(stats), {
    totalRequests: 42,
    youtube: 19,
    spotify: 23,
    website: 25
  });
});

test("getPopupMetrics tolerates missing platform counters", () => {
  assert.deepEqual(getPopupMetrics({ totalBlocked: 0 }), {
    totalRequests: 0,
    youtube: 0,
    spotify: 0,
    website: 0
  });
});
