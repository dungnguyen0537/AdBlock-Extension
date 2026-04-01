export const RULESET_BY_PLATFORM = {
  youtube: "youtube-base",
  spotify: "spotify-base"
};

export const DEFAULT_SETTINGS = {
  youtube: {
    enabled: true,
    networkFiltersEnabled: true,
    aggressiveMode: true,
    autoSkipVideoAds: true,
    hidePromotions: true,
    blockShortsAds: true
  },
  spotify: {
    enabled: true,
    networkFiltersEnabled: true,
    muteAudioAds: true,
    autoAdvance: true,
    hideSponsoredRecommendations: true,
    preserveVolume: true
  },
  experience: {
    languageMix: "mixed",
    compactMode: false,
    theme: "aurora"
  },
  telemetry: {
    showBadge: true
  },
  filters: {
    enableAdaptiveNetworkFilters: true,
    enableCosmeticFilters: true,
    customNetworkFilters: {
      youtube: [],
      spotify: []
    },
    customCosmeticFilters: {
      youtube: [],
      spotify: []
    }
  },
  allowedDomains: []
};

export const DEFAULT_STATS = {
  totalBlocked: 0,
  youtube: {
    network: 0,
    player: 0,
    cosmetic: 0
  },
  spotify: {
    network: 0,
    player: 0,
    cosmetic: 0
  },
  lastEvent: null
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge(base, patch) {
  if (!isPlainObject(base)) {
    return patch ?? base;
  }

  const output = { ...base };

  for (const [key, value] of Object.entries(patch ?? {})) {
    if (Array.isArray(value)) {
      output[key] = value.slice();
      continue;
    }

    if (isPlainObject(value) && isPlainObject(base[key])) {
      output[key] = deepMerge(base[key], value);
      continue;
    }

    output[key] = value;
  }

  return output;
}

export function normalizeAllowedDomains(input) {
  const asArray = Array.isArray(input)
    ? input
    : String(input ?? "")
        .split(/\r?\n|,/)
        .map((value) => value.trim());

  const clean = new Set();

  for (const entry of asArray) {
    const normalized = String(entry ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^\*\./, "");

    if (normalized) {
      clean.add(normalized);
    }
  }

  return Array.from(clean);
}

export function normalizeLineList(input) {
  const asArray = Array.isArray(input)
    ? input
    : String(input ?? "")
        .split(/\r?\n/)
        .map((value) => value.trim());

  const clean = [];

  for (const entry of asArray) {
    const normalized = String(entry ?? "").trim();
    if (!normalized || normalized.startsWith("!") || normalized.startsWith("#")) {
      continue;
    }

    clean.push(normalized);
  }

  return Array.from(new Set(clean));
}

export function normalizeSettings(incoming = {}) {
  const merged = deepMerge(DEFAULT_SETTINGS, incoming);
  merged.allowedDomains = normalizeAllowedDomains(merged.allowedDomains);
  merged.filters.customNetworkFilters.youtube = normalizeLineList(
    merged.filters.customNetworkFilters.youtube
  );
  merged.filters.customNetworkFilters.spotify = normalizeLineList(
    merged.filters.customNetworkFilters.spotify
  );
  merged.filters.customCosmeticFilters.youtube = normalizeLineList(
    merged.filters.customCosmeticFilters.youtube
  );
  merged.filters.customCosmeticFilters.spotify = normalizeLineList(
    merged.filters.customCosmeticFilters.spotify
  );
  return merged;
}

export function normalizeStats(incoming = {}) {
  return deepMerge(DEFAULT_STATS, incoming);
}
