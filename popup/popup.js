import { getPopupMetrics } from "../src/shared/popup-metrics.js";

const ui = {
  totalRequests: document.getElementById("totalRequests"),
  youtubeRequests: document.getElementById("youtubeRequests"),
  spotifyRequests: document.getElementById("spotifyRequests"),
  websiteRequests: document.getElementById("websiteRequests"),
  openOptions: document.getElementById("openOptions"),
  statusLine: document.getElementById("statusLine")
};

void load();

ui.openOptions.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
});

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!response?.ok) {
    flashStatus("Không thể tải thống kê");
    return;
  }

  render(response.state);
}

function render(state) {
  const metrics = getPopupMetrics(state.stats);
  ui.totalRequests.textContent = formatNumber(metrics.totalRequests);
  ui.youtubeRequests.textContent = formatNumber(metrics.youtube);
  ui.spotifyRequests.textContent = formatNumber(metrics.spotify);
  ui.websiteRequests.textContent = formatNumber(metrics.website);

  const lastEvent = state.stats.lastEvent;
  if (lastEvent) {
    const time = new Date(lastEvent.at).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    });
    flashStatus(`Lần chặn gần nhất: ${formatLastEvent(lastEvent)} lúc ${time}`);
    return;
  }

  flashStatus("Đang hoạt động");
}

function flashStatus(text) {
  ui.statusLine.textContent = text;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatLastEvent(lastEvent) {
  const platform = lastEvent?.platform === "spotify" ? "Spotify" : "YouTube";
  return `${platform} / ${String(lastEvent?.category ?? "")}`;
}
