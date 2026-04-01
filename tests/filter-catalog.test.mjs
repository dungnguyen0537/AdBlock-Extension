import test from "node:test";
import assert from "node:assert/strict";

import {
  FILTER_CATALOG,
  getFilterEnabled,
  createFilterSettingsPatch
} from "../src/shared/filter-catalog.js";

test("filter catalog exposes the approved built-in filters", () => {
  assert.deepEqual(
    FILTER_CATALOG.map((filter) => filter.id),
    [
      "youtube-network",
      "youtube-skip-video",
      "youtube-hide-sponsored",
      "youtube-shorts-cleanup",
      "spotify-network",
      "spotify-mute-audio",
      "spotify-auto-advance",
      "spotify-hide-sponsored"
    ]
  );
});

test("getFilterEnabled reads nested toggle state from settings", () => {
  const settings = {
    youtube: {
      networkFiltersEnabled: true,
      autoSkipVideoAds: false,
      hidePromotions: true,
      blockShortsAds: false
    },
    spotify: {
      networkFiltersEnabled: false,
      muteAudioAds: true,
      autoAdvance: true,
      hideSponsoredRecommendations: false
    }
  };

  assert.equal(getFilterEnabled(settings, "youtube-network"), true);
  assert.equal(getFilterEnabled(settings, "youtube-skip-video"), false);
  assert.equal(getFilterEnabled(settings, "spotify-network"), false);
  assert.equal(getFilterEnabled(settings, "spotify-hide-sponsored"), false);
});

test("createFilterSettingsPatch returns a minimal nested patch", () => {
  assert.deepEqual(createFilterSettingsPatch("youtube-network", false), {
    youtube: {
      networkFiltersEnabled: false
    }
  });

  assert.deepEqual(createFilterSettingsPatch("spotify-auto-advance", true), {
    spotify: {
      autoAdvance: true
    }
  });
});
