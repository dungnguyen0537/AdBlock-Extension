import test from "node:test";
import assert from "node:assert/strict";

import { compileDynamicRules } from "../src/shared/filter-engine.js";

test("compileDynamicRules skips network rules for platforms with network filters disabled", () => {
  const rules = compileDynamicRules({
    youtube: {
      enabled: true,
      networkFiltersEnabled: false
    },
    spotify: {
      enabled: true,
      networkFiltersEnabled: true
    },
    filters: {
      enableAdaptiveNetworkFilters: true,
      customNetworkFilters: {
        youtube: ["||example.com^"],
        spotify: ["regex:^https://ads\\.spotify\\.com/.*"]
      }
    }
  });

  assert.equal(
    rules.some((rule) => rule.condition.initiatorDomains.includes("www.youtube.com")),
    false
  );
  assert.equal(
    rules.some((rule) => rule.condition.initiatorDomains.includes("open.spotify.com")),
    true
  );
});
