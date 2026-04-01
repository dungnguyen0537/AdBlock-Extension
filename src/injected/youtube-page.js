(function patchYouTubePageContext() {
  if (window.__streamShieldYouTubePatched) {
    return;
  }

  window.__streamShieldYouTubePatched = true;

  const SANITIZE_PATTERNS = [
    /youtubei\/v1\/player/i,
    /youtubei\/v1\/next/i,
    /\/player\?/i
  ];

  const STRIP_KEYS = new Set([
    "adPlacements",
    "playerAds",
    "adBreakHeartbeatParams",
    "adSlots",
    "adSafetyReason",
    "ad3Module",
    "adLoggingData",
    "adParams"
  ]);

  const originalFetch = window.fetch.bind(window);
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalJsonParse = JSON.parse.bind(JSON);

  patchInitialPlayerResponse();
  patchInitialData();
  patchJsonParse();

  window.fetch = async function streamShieldFetch(resource, init) {
    const url = resolveUrl(resource);
    const response = await originalFetch(resource, init);

    if (!shouldSanitize(url, response)) {
      return response;
    }

    return sanitizeJsonResponse(response);
  };

  XMLHttpRequest.prototype.open = function streamShieldOpen(method, url) {
    this.__streamShieldUrl = String(url ?? "");
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function streamShieldSend() {
    this.addEventListener("readystatechange", sanitizeXhrResponse);

    return originalSend.apply(this, arguments);
  };

  function shouldSanitize(url, response) {
    const contentType = response.headers.get("content-type") || "";
    return (
      SANITIZE_PATTERNS.some((pattern) => pattern.test(url)) &&
      contentType.includes("application/json")
    );
  }

  async function sanitizeJsonResponse(response) {
    try {
      const clone = response.clone();
      const body = await clone.json();
      const cleaned = maybeSanitizePayload(body);
      return new Response(JSON.stringify(cleaned), {
        status: response.status,
        statusText: response.statusText,
        headers: clone.headers
      });
    } catch {
      return response;
    }
  }

  function sanitizeXhrResponse() {
    if (this.readyState !== 4 || this.__streamShieldSanitized) {
      return;
    }

    const url = this.__streamShieldUrl || "";
    if (!SANITIZE_PATTERNS.some((pattern) => pattern.test(url))) {
      return;
    }

    const contentType = this.getResponseHeader("content-type") || "";
    if (!contentType.includes("application/json")) {
      return;
    }

    const responseType = this.responseType || "";
    if (responseType && responseType !== "text" && responseType !== "json") {
      return;
    }

    try {
      const source =
        responseType === "json"
          ? this.response
          : originalJsonParse(this.responseText);
      const cleaned = maybeSanitizePayload(source, this.responseText);
      const cleanedText = JSON.stringify(cleaned);

      try {
        Object.defineProperty(this, "responseText", {
          configurable: true,
          get() {
            return cleanedText;
          }
        });
      } catch {
        // Ignore if browser disallows redefining responseText.
      }

      try {
        Object.defineProperty(this, "response", {
          configurable: true,
          get() {
            return responseType === "json" ? cleaned : cleanedText;
          }
        });
      } catch {
        // Ignore if browser disallows redefining response.
      }

      this.__streamShieldSanitized = true;
    } catch {
      // Ignore malformed or non-standard responses.
    }
  }

  function maybeSanitizePayload(value, rawText = "") {
    if (!value || typeof value !== "object") {
      return value;
    }

    if (
      looksLikeAdPayloadText(rawText) ||
      containsAdFields(value, 4) ||
      looksLikePlayerPayload(value)
    ) {
      return stripAdFields(value);
    }

    return value;
  }

  function looksLikeAdPayloadText(rawText) {
    return /"adPlacements"|"playerAds"|"adSlots"|"adBreakHeartbeatParams"/.test(
      String(rawText ?? "")
    );
  }

  function containsAdFields(value, depth) {
    if (!value || typeof value !== "object" || depth < 0) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some((entry) => containsAdFields(entry, depth - 1));
    }

    for (const [key, currentValue] of Object.entries(value)) {
      if (STRIP_KEYS.has(key)) {
        return true;
      }

      if (containsAdFields(currentValue, depth - 1)) {
        return true;
      }
    }

    return false;
  }

  function looksLikePlayerPayload(value) {
    return Boolean(
      value?.videoDetails ||
        value?.playabilityStatus ||
        value?.streamingData ||
        value?.playerResponse?.videoDetails
    );
  }

  function stripAdFields(value) {
    if (Array.isArray(value)) {
      return value.map(stripAdFields);
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    const output = {};

    for (const [key, currentValue] of Object.entries(value)) {
      if (STRIP_KEYS.has(key)) {
        continue;
      }

      if (key === "playerResponse" && currentValue && typeof currentValue === "object") {
        output[key] = stripAdFields(currentValue);
        continue;
      }

      output[key] = stripAdFields(currentValue);
    }

    return output;
  }

  function patchInitialPlayerResponse() {
    let initialValue = maybeSanitizePayload(window.ytInitialPlayerResponse);

    try {
      Object.defineProperty(window, "ytInitialPlayerResponse", {
        configurable: true,
        get() {
          return initialValue;
        },
        set(value) {
          initialValue = maybeSanitizePayload(value);
        }
      });
    } catch {
      // Ignore if the page defines this as non-configurable.
    }
  }

  function patchInitialData() {
    let initialData = maybeSanitizePayload(window.ytInitialData);

    try {
      Object.defineProperty(window, "ytInitialData", {
        configurable: true,
        get() {
          return initialData;
        },
        set(value) {
          initialData = maybeSanitizePayload(value);
        }
      });
    } catch {
      // Ignore if the page defines this as non-configurable.
    }
  }

  function patchJsonParse() {
    JSON.parse = function streamShieldJsonParse(text, reviver) {
      const parsed = originalJsonParse(text, reviver);
      return maybeSanitizePayload(parsed, text);
    };
  }

  function resolveUrl(resource) {
    if (typeof resource === "string") {
      return resource;
    }

    if (resource instanceof Request) {
      return resource.url;
    }

    return String(resource ?? "");
  }
})();
