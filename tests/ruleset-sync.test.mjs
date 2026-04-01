import test from "node:test";
import assert from "node:assert/strict";

import { getRulesetSyncPayload } from "../src/shared/ruleset-sync.js";

test("getRulesetSyncPayload disables rulesets when platform or network filters are off", () => {
  assert.deepEqual(
    getRulesetSyncPayload(
      {
        youtube: {
          enabled: true,
          networkFiltersEnabled: false
        },
        spotify: {
          enabled: false,
          networkFiltersEnabled: true
        }
      },
      {
        youtube: "youtube-base",
        spotify: "spotify-base"
      }
    ),
    {
      enableRulesetIds: [],
      disableRulesetIds: ["youtube-base", "spotify-base"]
    }
  );
});

test("getRulesetSyncPayload enables only network-active platforms", () => {
  assert.deepEqual(
    getRulesetSyncPayload(
      {
        youtube: {
          enabled: true,
          networkFiltersEnabled: true
        },
        spotify: {
          enabled: true,
          networkFiltersEnabled: false
        }
      },
      {
        youtube: "youtube-base",
        spotify: "spotify-base"
      }
    ),
    {
      enableRulesetIds: ["youtube-base"],
      disableRulesetIds: ["spotify-base"]
    }
  );
});
