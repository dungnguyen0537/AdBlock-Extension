import { RULESET_BY_PLATFORM } from "../shared/defaults.js";
import {
  compileDynamicRules,
  getManagedDynamicRuleRange
} from "../shared/filter-engine.js";
import {
  ensureState,
  getState,
  incrementStats,
  resetStats,
  updateSettings
} from "../shared/storage.js";

const PLATFORM_URL_PATTERNS = {
  youtube: /(^|\.)youtube\.com$|(^|\.)googlevideo\.com$/i,
  spotify: /(^|\.)spotify\.com$|(^|\.)scdn\.co$/i
};

chrome.runtime.onInstalled.addListener(() => {
  void initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
  void initializeExtension();
});

chrome.action.setBadgeBackgroundColor({ color: "#0f766e" }).catch(() => {});

if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const rulesetId = info.rulesetId ?? "";
    const requestUrl = info.request?.url ?? "";
    const platform =
      rulesetId.includes("spotify") || /spotify\.com|scdn\.co/i.test(requestUrl)
        ? "spotify"
        : "youtube";

    void recordAndRefresh({
      platform,
      category: "network",
      meta: {
        requestUrl,
        tabId: info.request?.tabId ?? -1,
        rulesetId
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    switch (message?.type) {
      case "GET_STATE": {
        const state = await getState();
        sendResponse({ ok: true, state });
        return;
      }
      case "UPDATE_SETTINGS": {
        const state = await updateSettings(message.payload ?? {});
        await syncRulesets(state.settings);
        await syncDynamicFilters(state.settings);
        await refreshBadge(state.stats.totalBlocked, state.settings.telemetry.showBadge);
        await broadcastSettings(state.settings);
        sendResponse({ ok: true, state });
        return;
      }
      case "RESET_STATS": {
        const state = await resetStats();
        await refreshBadge(state.stats.totalBlocked, state.settings.telemetry.showBadge);
        sendResponse({ ok: true, state });
        return;
      }
      case "RECORD_EVENT": {
        const payload = message.payload ?? {};
        const state = await recordAndRefresh(payload);
        sendResponse({ ok: true, state });
        return;
      }
      case "OPEN_OPTIONS": {
        await chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return;
      }
      default: {
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    }
  })().catch((error) => {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  });

  return true;
});

async function initializeExtension() {
  const state = await ensureState();
  await syncRulesets(state.settings);
  await syncDynamicFilters(state.settings);
  await refreshBadge(state.stats.totalBlocked, state.settings.telemetry.showBadge);
}

async function syncRulesets(settings) {
  const enableRulesetIds = [];
  const disableRulesetIds = [];

  for (const [platform, rulesetId] of Object.entries(RULESET_BY_PLATFORM)) {
    if (settings?.[platform]?.enabled) {
      enableRulesetIds.push(rulesetId);
    } else {
      disableRulesetIds.push(rulesetId);
    }
  }

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds
  });
}

async function syncDynamicFilters(settings) {
  const dynamicRules = compileDynamicRules(settings);
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const managedRange = getManagedDynamicRuleRange();
  const removeRuleIds = existingRules
    .filter((rule) => rule.id >= managedRange.start && rule.id <= managedRange.end)
    .map((rule) => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: dynamicRules
  });
}

async function refreshBadge(totalBlocked, showBadge) {
  if (!showBadge) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const text = totalBlocked > 99 ? "99+" : String(totalBlocked || "");
  await chrome.action.setBadgeText({ text });
}

async function recordAndRefresh(payload) {
  const state = await incrementStats({
    platform: payload.platform ?? "youtube",
    category: payload.category ?? "network",
    count: payload.count ?? 1,
    meta: payload.meta ?? null
  });

  await refreshBadge(state.stats.totalBlocked, state.settings.telemetry.showBadge);
  return state;
}

async function broadcastSettings(settings) {
  const tabs = await chrome.tabs.query({});
  const jobs = tabs.map(async (tab) => {
    if (!tab.id || !tab.url) {
      return;
    }

    let hostname = "";

    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      return;
    }

    const shouldNotify = Object.values(PLATFORM_URL_PATTERNS).some((pattern) =>
      pattern.test(hostname)
    );

    if (!shouldNotify) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SETTINGS_UPDATED",
        settings
      });
    } catch {
      // Ignore tabs without an active content script context.
    }
  });

  await Promise.all(jobs);
}
