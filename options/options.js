import {
  FILTER_CATALOG,
  createFilterSettingsPatch,
  getFilterEnabled
} from "../src/shared/filter-catalog.js";
import {
  CHROME_SECURITY_SETTINGS_URL,
  DNS_SETUP_ENDPOINT,
  DNS_SETUP_STEPS
} from "../src/shared/dns-setup.js";

const form = {
  statusLine: document.getElementById("statusLine"),
  youtubeEnabled: document.getElementById("youtubeEnabled"),
  spotifyEnabled: document.getElementById("spotifyEnabled"),
  filterList: document.getElementById("filterList"),
  dnsEndpoint: document.getElementById("dnsEndpoint"),
  dnsSteps: document.getElementById("dnsSteps"),
  copyDnsEndpoint: document.getElementById("copyDnsEndpoint"),
  openChromeSecurity: document.getElementById("openChromeSecurity")
};

const filterInputs = new Map();

initializeFilterList();
initializeDnsSetup();
bindEvents();
void load();

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!response?.ok) {
    setStatus("Không thể tải cấu hình");
    return;
  }

  render(response.state);
}

function render(state) {
  const { settings } = state;

  form.youtubeEnabled.checked = Boolean(settings.youtube.enabled);
  form.spotifyEnabled.checked = Boolean(settings.spotify.enabled);

  for (const [filterId, input] of filterInputs.entries()) {
    input.checked = getFilterEnabled(settings, filterId);
  }

  setStatus("Đã tải cấu hình");
}

async function savePartial(payload, successMessage) {
  setStatus("Đang lưu...");
  const response = await chrome.runtime.sendMessage({
    type: "UPDATE_SETTINGS",
    payload
  });

  if (!response?.ok) {
    setStatus("Lưu thất bại");
    return;
  }

  render(response.state);
  setStatus(successMessage);
}

function bindEvents() {
  form.youtubeEnabled.addEventListener("change", () => {
    void savePartial(
      {
        youtube: {
          enabled: form.youtubeEnabled.checked
        }
      },
      "Đã cập nhật YouTube"
    );
  });

  form.spotifyEnabled.addEventListener("change", () => {
    void savePartial(
      {
        spotify: {
          enabled: form.spotifyEnabled.checked
        }
      },
      "Đã cập nhật Spotify"
    );
  });

  form.copyDnsEndpoint.addEventListener("click", () => {
    void copyDnsEndpoint();
  });

  form.openChromeSecurity.addEventListener("click", () => {
    void openChromeSecurity();
  });
}

function initializeFilterList() {
  form.filterList.replaceChildren(
    buildPlatformGroup("youtube", "YouTube"),
    buildPlatformGroup("spotify", "Spotify")
  );
}

function buildPlatformGroup(platform, title) {
  const filters = FILTER_CATALOG.filter((entry) => entry.platform === platform);
  const group = document.createElement("details");
  group.className = "filter-group";
  group.open = false;

  const summary = document.createElement("summary");
  summary.className = "filter-summary";

  const summaryCopy = document.createElement("div");
  summaryCopy.className = "filter-summary-copy";

  const heading = document.createElement("span");
  heading.className = "filter-summary-title";
  heading.textContent = title;

  const meta = document.createElement("span");
  meta.className = "filter-summary-meta";
  meta.textContent = `${filters.length} bộ lọc`;

  const icon = document.createElement("span");
  icon.className = "filter-summary-icon";
  icon.setAttribute("aria-hidden", "true");

  summaryCopy.append(heading, meta);
  summary.append(summaryCopy, icon);
  group.appendChild(summary);

  const body = document.createElement("div");
  body.className = "filter-group-body";

  for (const filter of filters) {
    const row = document.createElement("label");
    row.className = "toggle-row";

    const copy = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = filter.label;
    const description = document.createElement("span");
    description.textContent = filter.description;
    copy.append(label, description);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.addEventListener("change", () => {
      void savePartial(
        createFilterSettingsPatch(filter.id, input.checked),
        `Đã cập nhật bộ lọc: ${filter.label}`
      );
    });

    filterInputs.set(filter.id, input);
    row.append(copy, input);
    body.appendChild(row);
  }

  group.appendChild(body);
  return group;
}

function initializeDnsSetup() {
  form.dnsEndpoint.textContent = DNS_SETUP_ENDPOINT;
  form.dnsSteps.replaceChildren(
    ...DNS_SETUP_STEPS.map((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    })
  );
}

async function copyDnsEndpoint() {
  try {
    await navigator.clipboard.writeText(DNS_SETUP_ENDPOINT);
    setStatus("Đã copy DNS endpoint");
  } catch {
    setStatus("Không thể copy tự động. Hãy copy thủ công endpoint bên trên.");
  }
}

async function openChromeSecurity() {
  try {
    await chrome.tabs.create({ url: CHROME_SECURITY_SETTINGS_URL });
    setStatus("Đã mở Chrome Security");
  } catch {
    setStatus("Không thể mở trực tiếp. Hãy vào chrome://settings/security thủ công.");
  }
}

function setStatus(text) {
  form.statusLine.textContent = text;
}
