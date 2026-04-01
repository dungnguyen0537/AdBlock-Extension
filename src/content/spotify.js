(function mountSpotifyShield() {
  const shield = globalThis.StreamShieldContent;
  const PLATFORM = "spotify";
  const ROOT_ATTRIBUTE = "data-streamshield-spotify";
  const AD_TEXT_PATTERNS = [
    "advertisement",
    "quang cao",
    "sponsored",
    "duoc tai tro"
  ];

  let state = null;
  let observersMounted = false;
  let adSession = false;
  const mediaStates = new WeakMap();

  void initialize();

  shield.onSettingsUpdated((settings) => {
    state = {
      ...(state ?? {}),
      settings
    };
    ensureRuntime();
    applyFlags();
    runSweep();
  });

  async function initialize() {
    state = await shield.getState();
    applyFlags();

    if (!isEnabled()) {
      return;
    }

    ensureRuntime();
    runSweep();
  }

  function ensureRuntime() {
    if (!isEnabled()) {
      return;
    }

    shield.injectPageScript("src/injected/spotify-page.js");
    mountObservers();
  }

  function isEnabled() {
    if (!state?.settings?.spotify?.enabled) {
      return false;
    }

    return !shield.isDomainAllowed(
      location.hostname,
      state?.settings?.allowedDomains ?? []
    );
  }

  function applyFlags() {
    shield.setRootFlag(ROOT_ATTRIBUTE, isEnabled());
  }

  function mountObservers() {
    if (observersMounted) {
      return;
    }

    observersMounted = true;

    const observer = new MutationObserver(() => {
      runSweep();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "aria-label"]
    });

    setInterval(runSweep, 1500);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        runSweep();
      }
    });
  }

  function runSweep() {
    if (!isEnabled()) {
      restoreMedia();
      adSession = false;
      return;
    }

    applyCustomCosmeticFilters();
    hideSponsoredCards();
    handlePlaybackAds();
  }

  function handlePlaybackAds() {
    const adActive = detectAdPlayback();

    if (!adActive) {
      adSession = false;
      restoreMedia();
      return;
    }

    if (!adSession) {
      adSession = true;
      void shield.emitEvent(PLATFORM, "player", 1, {
        href: location.href,
        phase: "ad-playback"
      });
    }

    if (state?.settings?.spotify?.muteAudioAds) {
      muteMedia();
    }

    if (state?.settings?.spotify?.autoAdvance) {
      clickNext();
    }
  }

  function detectAdPlayback() {
    const badgeSelectors = [
      "[data-testid='context-item-info-ad']",
      "[data-testid='ad-badge']",
      "[aria-label*='Advertisement']",
      "[aria-label*='advertisement']",
      "[aria-label*='Quang cao']",
      "[aria-label*='quang cao']",
      "[aria-label*='Sponsored']"
    ];

    if (document.querySelector(badgeSelectors.join(", "))) {
      return true;
    }

    const titleNodes = document.querySelectorAll(
      "[data-testid='context-item-info-title'], [data-testid='entityTitle'], [data-testid='context-item-link']"
    );

    for (const node of titleNodes) {
      const text = shield.normalizeText(node.textContent);
      if (AD_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) {
        return true;
      }
    }

    return false;
  }

  function muteMedia() {
    const mediaNodes = document.querySelectorAll("audio, video");

    for (const media of mediaNodes) {
      if (!(media instanceof HTMLMediaElement)) {
        continue;
      }

      if (!mediaStates.has(media)) {
        mediaStates.set(media, {
          muted: media.muted,
          volume: media.volume
        });
      }

      media.muted = true;
    }
  }

  function restoreMedia() {
    const mediaNodes = document.querySelectorAll("audio, video");

    for (const media of mediaNodes) {
      if (!(media instanceof HTMLMediaElement)) {
        continue;
      }

      const previous = mediaStates.get(media);
      if (!previous) {
        continue;
      }

      media.muted = previous.muted;

      if (state?.settings?.spotify?.preserveVolume !== false) {
        media.volume = previous.volume;
      }

      mediaStates.delete(media);
    }
  }

  function clickNext() {
    const nextButton = shield.closestVisible(
      document.querySelector("[data-testid='control-button-skip-forward']"),
      "button"
    );

    if (nextButton instanceof HTMLElement && !nextButton.disabled) {
      nextButton.click();
    }
  }

  function hideSponsoredCards() {
    if (!state?.settings?.spotify?.hideSponsoredRecommendations) {
      return;
    }

    const sections = document.querySelectorAll(
      "[data-testid='card-click-handler'], article, section"
    );

    for (const block of sections) {
      if (!(block instanceof HTMLElement)) {
        continue;
      }

      if (block.dataset.streamshieldHidden) {
        continue;
      }

      const text = shield.normalizeText(block.textContent);
      if (!AD_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) {
        continue;
      }

      const card = block.closest("[data-testid='card-click-handler'], article, section");
      if (!(card instanceof HTMLElement)) {
        continue;
      }

      card.dataset.streamshieldHidden = "true";
      void shield.emitEvent(PLATFORM, "cosmetic", 1, {
        reason: "sponsored-recommendation"
      });
    }
  }

  function applyCustomCosmeticFilters() {
    if (!state?.settings?.filters?.enableCosmeticFilters) {
      return;
    }

    const selectors = state?.settings?.filters?.customCosmeticFilters?.spotify ?? [];
    for (const selector of selectors) {
      hideBySelector(selector);
    }
  }

  function hideBySelector(selector) {
    let matches = [];

    try {
      matches = Array.from(document.querySelectorAll(selector));
    } catch {
      return;
    }

    for (const node of matches) {
      if (!(node instanceof HTMLElement) || node.dataset.streamshieldHidden) {
        continue;
      }

      node.dataset.streamshieldHidden = "true";
      void shield.emitEvent(PLATFORM, "cosmetic", 1, {
        reason: "custom-selector",
        selector
      });
    }
  }
})();
