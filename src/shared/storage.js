import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  deepMerge,
  normalizeSettings,
  normalizeStats
} from "./defaults.js";

const STORAGE_KEYS = ["settings", "stats"];

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function ensureState() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  const settings = normalizeSettings(stored.settings ?? DEFAULT_SETTINGS);
  const stats = normalizeStats(stored.stats ?? DEFAULT_STATS);

  const shouldWrite =
    !sameJson(settings, stored.settings ?? null) ||
    !sameJson(stats, stored.stats ?? null);

  if (shouldWrite) {
    await chrome.storage.local.set({ settings, stats });
  }

  return { settings, stats };
}

export async function getState() {
  return ensureState();
}

export async function updateSettings(partialSettings) {
  const { settings, stats } = await ensureState();
  const nextSettings = normalizeSettings(deepMerge(settings, partialSettings ?? {}));
  await chrome.storage.local.set({ settings: nextSettings });
  return { settings: nextSettings, stats };
}

export async function incrementStats({
  platform,
  category = "network",
  count = 1,
  meta = null
}) {
  const state = await ensureState();
  const stats = normalizeStats(state.stats);
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;

  stats.totalBlocked += safeCount;

  if (!stats[platform]) {
    stats[platform] = { network: 0, player: 0, cosmetic: 0 };
  }

  if (!Number.isFinite(stats[platform][category])) {
    stats[platform][category] = 0;
  }

  stats[platform][category] += safeCount;
  stats.lastEvent = {
    platform,
    category,
    count: safeCount,
    meta,
    at: new Date().toISOString()
  };

  await chrome.storage.local.set({ stats });
  return { settings: state.settings, stats };
}

export async function resetStats() {
  const { settings } = await ensureState();
  const stats = structuredClone(DEFAULT_STATS);
  await chrome.storage.local.set({ stats });
  return { settings, stats };
}
