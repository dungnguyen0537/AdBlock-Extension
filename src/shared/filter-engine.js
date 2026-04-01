const PLATFORM_RULE_CONFIG = {
  youtube: {
    initiatorDomains: ["www.youtube.com", "music.youtube.com", "m.youtube.com"],
    resourceTypes: ["xmlhttprequest", "sub_frame", "script", "image", "media", "ping", "other"]
  },
  spotify: {
    initiatorDomains: ["open.spotify.com"],
    resourceTypes: ["xmlhttprequest", "sub_frame", "script", "image", "media", "ping", "other"]
  }
};

const ADAPTIVE_NETWORK_FILTERS = {
  youtube: [
    "||doubleclick.net^",
    "|https://googleads.g.doubleclick.net/",
    "|https://www.youtube.com/pagead/",
    "|https://www.youtube.com/api/stats/ads",
    "|https://www.youtube.com/get_midroll_info",
    "|https://www.youtube.com/ptracking"
  ],
  spotify: [
    "regex:^https://spclient\\.wg\\.spotify\\.com/ad-logic/.*",
    "regex:^https://spclient\\.wg\\.spotify\\.com/ads/.*",
    "regex:^https://.*spotify\\.com/.*/ads?.*",
    "regex:^https://.*scdn\\.co/.*/audio-ads/.*"
  ]
};

const MANAGED_DYNAMIC_RULE_ID_START = 30000;
const MANAGED_DYNAMIC_RULE_ID_END = 30999;

export function getManagedDynamicRuleRange() {
  return {
    start: MANAGED_DYNAMIC_RULE_ID_START,
    end: MANAGED_DYNAMIC_RULE_ID_END
  };
}

export function compileDynamicRules(settings) {
  const rules = [];
  let nextId = MANAGED_DYNAMIC_RULE_ID_START;

  for (const platform of ["youtube", "spotify"]) {
    if (!settings?.[platform]?.enabled || settings?.[platform]?.networkFiltersEnabled === false) {
      continue;
    }

    const lines = [];
    if (settings?.filters?.enableAdaptiveNetworkFilters !== false) {
      lines.push(...ADAPTIVE_NETWORK_FILTERS[platform]);
    }

    lines.push(...(settings?.filters?.customNetworkFilters?.[platform] ?? []));

    for (const line of dedupeLines(lines)) {
      const rule = buildRuleFromLine(platform, line, nextId);
      if (!rule) {
        continue;
      }

      rules.push(rule);
      nextId += 1;

      if (nextId > MANAGED_DYNAMIC_RULE_ID_END) {
        return rules;
      }
    }
  }

  return rules;
}

function buildRuleFromLine(platform, line, id) {
  const parsed = parseFilterLine(line);
  if (!parsed) {
    return null;
  }

  const config = PLATFORM_RULE_CONFIG[platform];
  const condition = {
    resourceTypes: config.resourceTypes,
    initiatorDomains: config.initiatorDomains
  };

  if (parsed.kind === "regexFilter") {
    condition.regexFilter = parsed.value;
  } else {
    condition.urlFilter = parsed.value;
  }

  return {
    id,
    priority: parsed.priority,
    action: {
      type: "block"
    },
    condition
  };
}

function parseFilterLine(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("regex:")) {
    const regexValue = trimmed.slice("regex:".length);
    if (!isValidRegex(regexValue)) {
      return null;
    }

    return {
      kind: "regexFilter",
      value: regexValue,
      priority: 2
    };
  }

  return {
    kind: "urlFilter",
    value: trimmed,
    priority: 2
  };
}

function dedupeLines(lines) {
  return Array.from(
    new Set(
      (lines ?? [])
        .map((line) => String(line ?? "").trim())
        .filter(Boolean)
    )
  );
}

function isValidRegex(value) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}
