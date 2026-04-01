(function patchSpotifyPageContext() {
  if (window.__streamShieldSpotifyPatched) {
    return;
  }

  window.__streamShieldSpotifyPatched = true;

  const BLOCK_PATTERNS = [
    /spclient\.wg\.spotify\.com\/ad-logic/i,
    /spclient\.wg\.spotify\.com\/ads/i,
    /gabo-receiver-service.*ads/i,
    /audio-ads/i
  ];

  const originalFetch = window.fetch.bind(window);
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  window.fetch = async function streamShieldFetch(resource, init) {
    const url = resolveUrl(resource);

    if (shouldBlock(url)) {
      return jsonResponse({
        ads: [],
        slots: [],
        success: true
      });
    }

    return originalFetch(resource, init);
  };

  XMLHttpRequest.prototype.open = function streamShieldOpen(method, url) {
    this.__streamShieldUrl = String(url ?? "");
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function streamShieldSend() {
    if (shouldBlock(this.__streamShieldUrl)) {
      try {
        this.abort();
      } catch {
        // Ignore abort issues in page context.
      }
      return;
    }

    return originalSend.apply(this, arguments);
  };

  function shouldBlock(url) {
    return BLOCK_PATTERNS.some((pattern) => pattern.test(url));
  }

  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
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
