const ui = {
  totalBlocked: document.getElementById("totalBlocked"),
  youtubeBlocked: document.getElementById("youtubeBlocked"),
  spotifyBlocked: document.getElementById("spotifyBlocked"),
  youtubeEnabled: document.getElementById("youtubeEnabled"),
  spotifyEnabled: document.getElementById("spotifyEnabled"),
  aggressiveMode: document.getElementById("aggressiveMode"),
  spotifyMuteAds: document.getElementById("spotifyMuteAds"),
  openOptions: document.getElementById("openOptions"),
  resetStats: document.getElementById("resetStats"),
  statusLine: document.getElementById("statusLine")
};

void load();

for (const control of [
  ui.youtubeEnabled,
  ui.spotifyEnabled,
  ui.aggressiveMode,
  ui.spotifyMuteAds
]) {
  control.addEventListener("change", saveSettings);
}

ui.openOptions.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
});

ui.resetStats.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "RESET_STATS" });
  if (response?.ok) {
    render(response.state);
    flashStatus("Counter reset | Đã reset thống kê");
  }
});

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!response?.ok) {
    flashStatus("Engine unavailable");
    return;
  }

  render(response.state);
}

function render(state) {
  const { settings, stats } = state;
  ui.totalBlocked.textContent = formatNumber(stats.totalBlocked);
  ui.youtubeBlocked.textContent = formatNumber(
    (stats.youtube.network || 0) +
      (stats.youtube.player || 0) +
      (stats.youtube.cosmetic || 0)
  );
  ui.spotifyBlocked.textContent = formatNumber(
    (stats.spotify.network || 0) +
      (stats.spotify.player || 0) +
      (stats.spotify.cosmetic || 0)
  );

  ui.youtubeEnabled.checked = Boolean(settings.youtube.enabled);
  ui.spotifyEnabled.checked = Boolean(settings.spotify.enabled);
  ui.aggressiveMode.checked = Boolean(settings.youtube.aggressiveMode);
  ui.spotifyMuteAds.checked = Boolean(settings.spotify.muteAudioAds);

  const lastEvent = state.stats.lastEvent;
  if (lastEvent) {
    const time = new Date(lastEvent.at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    flashStatus(
      `${lastEvent.platform} ${lastEvent.category} intercepted at ${time}`
    );
    return;
  }

  flashStatus("Engine ready | Sẵn sàng bảo vệ");
}

async function saveSettings() {
  const payload = {
    youtube: {
      enabled: ui.youtubeEnabled.checked,
      aggressiveMode: ui.aggressiveMode.checked
    },
    spotify: {
      enabled: ui.spotifyEnabled.checked,
      muteAudioAds: ui.spotifyMuteAds.checked
    }
  };

  const response = await chrome.runtime.sendMessage({
    type: "UPDATE_SETTINGS",
    payload
  });

  if (response?.ok) {
    render(response.state);
    flashStatus("Configuration saved | Đã lưu cấu hình");
  }
}

function flashStatus(text) {
  ui.statusLine.textContent = text;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}
