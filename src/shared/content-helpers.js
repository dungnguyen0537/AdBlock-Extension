(function bootstrapStreamShieldContent() {
  if (globalThis.StreamShieldContent) {
    return;
  }

  const recentEvents = new Map();
  const settingsListeners = new Set();
  let runtimeAvailable = true;

  function markRuntimeUnavailable(error) {
    const message = String(error?.message ?? error ?? "");
    if (
      message.includes("Extension context invalidated") ||
      message.includes("Receiving end does not exist") ||
      message.includes("context invalidated")
    ) {
      runtimeAvailable = false;
    }
  }

  async function safeSendMessage(message) {
    if (!runtimeAvailable || !chrome?.runtime?.id) {
      return null;
    }

    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      markRuntimeUnavailable(error);
      return null;
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "SETTINGS_UPDATED") {
      return;
    }

    for (const listener of settingsListeners) {
      try {
        listener(message.settings);
      } catch {
        // Ignore listener failures so the rest of the extension keeps running.
      }
    }
  });

  function remember(key, ttl = 2500) {
    const now = Date.now();
    const last = recentEvents.get(key) ?? 0;

    if (now - last < ttl) {
      return false;
    }

    recentEvents.set(key, now);
    return true;
  }

  function injectPageScript(path) {
    if (!runtimeAvailable || !chrome?.runtime?.id) {
      return;
    }

    const marker = `data-streamshield-injected-${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const activeMarker = document.documentElement.getAttribute(marker);

    if (activeMarker) {
      return;
    }

    document.documentElement.setAttribute(marker, "ready");

    const script = document.createElement("script");
    try {
      script.src = chrome.runtime.getURL(path);
    } catch (error) {
      markRuntimeUnavailable(error);
      return;
    }
    script.dataset.streamshield = "injected";
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function setRootFlag(attribute, enabled) {
    if (enabled) {
      document.documentElement.setAttribute(attribute, "on");
      return;
    }

    document.documentElement.removeAttribute(attribute);
  }

  function isDomainAllowed(hostname, allowedDomains = []) {
    const cleanHost = String(hostname ?? "").toLowerCase();
    return allowedDomains.some((domain) => {
      const cleanDomain = String(domain ?? "").toLowerCase();
      return cleanHost === cleanDomain || cleanHost.endsWith(`.${cleanDomain}`);
    });
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function closestVisible(node, selector) {
    const match = node?.closest?.(selector) ?? null;
    if (!match) {
      return null;
    }

    const style = globalThis.getComputedStyle(match);
    return style.display === "none" ? null : match;
  }

  globalThis.StreamShieldContent = {
    async getState() {
      const response = await safeSendMessage({ type: "GET_STATE" });
      return response?.ok ? response.state : null;
    },
    async updateSettings(payload) {
      const response = await safeSendMessage({
        type: "UPDATE_SETTINGS",
        payload
      });
      return response?.ok ? response.state : null;
    },
    async emitEvent(platform, category, count = 1, meta = null) {
      if (!remember(`${platform}:${category}:${JSON.stringify(meta ?? {})}`)) {
        return null;
      }

      const response = await safeSendMessage({
        type: "RECORD_EVENT",
        payload: {
          platform,
          category,
          count,
          meta
        }
      });

      return response?.ok ? response.state : null;
    },
    onSettingsUpdated(listener) {
      settingsListeners.add(listener);
      return () => settingsListeners.delete(listener);
    },
    injectPageScript,
    setRootFlag,
    isDomainAllowed,
    normalizeText,
    closestVisible
  };
})();
