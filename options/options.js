const form = {
  summaryTotal: document.getElementById("summaryTotal"),
  summaryStatus: document.getElementById("summaryStatus"),
  statusLine: document.getElementById("statusLine"),
  youtubeEnabled: document.getElementById("youtubeEnabled"),
  autoSkipVideoAds: document.getElementById("autoSkipVideoAds"),
  aggressiveMode: document.getElementById("aggressiveMode"),
  hidePromotions: document.getElementById("hidePromotions"),
  blockShortsAds: document.getElementById("blockShortsAds"),
  spotifyEnabled: document.getElementById("spotifyEnabled"),
  muteAudioAds: document.getElementById("muteAudioAds"),
  autoAdvance: document.getElementById("autoAdvance"),
  hideSponsoredRecommendations: document.getElementById(
    "hideSponsoredRecommendations"
  ),
  preserveVolume: document.getElementById("preserveVolume"),
  languageMix: document.getElementById("languageMix"),
  compactMode: document.getElementById("compactMode"),
  showBadge: document.getElementById("showBadge"),
  enableAdaptiveNetworkFilters: document.getElementById(
    "enableAdaptiveNetworkFilters"
  ),
  enableCosmeticFilters: document.getElementById("enableCosmeticFilters"),
  youtubeNetworkFilters: document.getElementById("youtubeNetworkFilters"),
  spotifyNetworkFilters: document.getElementById("spotifyNetworkFilters"),
  youtubeCosmeticFilters: document.getElementById("youtubeCosmeticFilters"),
  spotifyCosmeticFilters: document.getElementById("spotifyCosmeticFilters"),
  allowedDomains: document.getElementById("allowedDomains"),
  saveButton: document.getElementById("saveButton"),
  resetButton: document.getElementById("resetButton")
};

form.saveButton.addEventListener("click", save);
form.resetButton.addEventListener("click", resetStats);

void load();

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!response?.ok) {
    setStatus("Unable to load state");
    return;
  }

  render(response.state);
}

function render(state) {
  const { settings, stats } = state;
  form.summaryTotal.textContent = new Intl.NumberFormat().format(
    stats.totalBlocked || 0
  );

  form.summaryStatus.textContent = state.stats.lastEvent
    ? `Last intercept: ${state.stats.lastEvent.platform} / ${state.stats.lastEvent.category}`
    : "Engine online | Hệ thống đang hoạt động";

  form.youtubeEnabled.checked = Boolean(settings.youtube.enabled);
  form.autoSkipVideoAds.checked = Boolean(settings.youtube.autoSkipVideoAds);
  form.aggressiveMode.checked = Boolean(settings.youtube.aggressiveMode);
  form.hidePromotions.checked = Boolean(settings.youtube.hidePromotions);
  form.blockShortsAds.checked = Boolean(settings.youtube.blockShortsAds);

  form.spotifyEnabled.checked = Boolean(settings.spotify.enabled);
  form.muteAudioAds.checked = Boolean(settings.spotify.muteAudioAds);
  form.autoAdvance.checked = Boolean(settings.spotify.autoAdvance);
  form.hideSponsoredRecommendations.checked = Boolean(
    settings.spotify.hideSponsoredRecommendations
  );
  form.preserveVolume.checked = Boolean(settings.spotify.preserveVolume);

  form.languageMix.value = settings.experience.languageMix || "mixed";
  form.compactMode.checked = Boolean(settings.experience.compactMode);
  form.showBadge.checked = Boolean(settings.telemetry.showBadge);
  form.enableAdaptiveNetworkFilters.checked = Boolean(
    settings.filters.enableAdaptiveNetworkFilters
  );
  form.enableCosmeticFilters.checked = Boolean(settings.filters.enableCosmeticFilters);
  form.youtubeNetworkFilters.value = (
    settings.filters.customNetworkFilters.youtube || []
  ).join("\n");
  form.spotifyNetworkFilters.value = (
    settings.filters.customNetworkFilters.spotify || []
  ).join("\n");
  form.youtubeCosmeticFilters.value = (
    settings.filters.customCosmeticFilters.youtube || []
  ).join("\n");
  form.spotifyCosmeticFilters.value = (
    settings.filters.customCosmeticFilters.spotify || []
  ).join("\n");
  form.allowedDomains.value = (settings.allowedDomains || []).join("\n");

  setStatus("Loaded current configuration");
}

async function save() {
  const payload = {
    youtube: {
      enabled: form.youtubeEnabled.checked,
      autoSkipVideoAds: form.autoSkipVideoAds.checked,
      aggressiveMode: form.aggressiveMode.checked,
      hidePromotions: form.hidePromotions.checked,
      blockShortsAds: form.blockShortsAds.checked
    },
    spotify: {
      enabled: form.spotifyEnabled.checked,
      muteAudioAds: form.muteAudioAds.checked,
      autoAdvance: form.autoAdvance.checked,
      hideSponsoredRecommendations: form.hideSponsoredRecommendations.checked,
      preserveVolume: form.preserveVolume.checked
    },
    experience: {
      languageMix: form.languageMix.value,
      compactMode: form.compactMode.checked
    },
    telemetry: {
      showBadge: form.showBadge.checked
    },
    filters: {
      enableAdaptiveNetworkFilters: form.enableAdaptiveNetworkFilters.checked,
      enableCosmeticFilters: form.enableCosmeticFilters.checked,
      customNetworkFilters: {
        youtube: splitLines(form.youtubeNetworkFilters.value),
        spotify: splitLines(form.spotifyNetworkFilters.value)
      },
      customCosmeticFilters: {
        youtube: splitLines(form.youtubeCosmeticFilters.value),
        spotify: splitLines(form.spotifyCosmeticFilters.value)
      }
    },
    allowedDomains: form.allowedDomains.value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  };

  const response = await chrome.runtime.sendMessage({
    type: "UPDATE_SETTINGS",
    payload
  });

  if (!response?.ok) {
    setStatus("Save failed");
    return;
  }

  render(response.state);
  setStatus("Configuration saved | Đã áp dụng thiết lập");
}

async function resetStats() {
  const response = await chrome.runtime.sendMessage({ type: "RESET_STATS" });

  if (!response?.ok) {
    setStatus("Reset failed");
    return;
  }

  render(response.state);
  setStatus("Stats cleared | Đã xoá thống kê");
}

function setStatus(text) {
  form.statusLine.textContent = text;
}

function splitLines(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
