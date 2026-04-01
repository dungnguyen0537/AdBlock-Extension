(function mountYouTubeShield() {
  const shield = globalThis.StreamShieldContent;
  const PLATFORM = "youtube";
  const ROOT_ATTRIBUTE = "data-streamshield-youtube";
  const TEXT_PROMO_PATTERNS = ["sponsored", "promoted", "duoc tai tro"];

  let state = null;
  let observersMounted = false;
  let adSession = false;

  const promotionSelectors = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer"
  ].join(", ");

  const shortsPromotionSelectors = [
    "ytd-reel-item-renderer",
    "ytd-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model"
  ].join(", ");

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

    mountObservers();
  }

  function isEnabled() {
    if (!state?.settings?.youtube?.enabled) {
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
      attributeFilter: ["class", "style", "hidden"]
    });

    setInterval(runSweep, 1200);
    document.addEventListener("yt-navigate-finish", runSweep, true);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        runSweep();
      }
    });
  }

  function runSweep() {
    if (!isEnabled()) {
      adSession = false;
      return;
    }

    applyCustomCosmeticFilters();
    removeTextPromotions();
    removeShortsPromotions();
    handleAdPlayback();
  }

  function handleAdPlayback() {
    const player = document.querySelector(".html5-video-player");
    const media = document.querySelector("video");
    const adShowing = isConfirmedAdState(player);

    if (!adShowing) {
      adSession = false;
      return;
    }

    if (!adSession) {
      adSession = true;
      void shield.emitEvent(PLATFORM, "player", 1, {
        href: location.href,
        phase: "ad-showing"
      });
    }

    closeOverlayAds();

    if (state?.settings?.youtube?.autoSkipVideoAds) {
      clickSkipButton();
    }
  }

  function isConfirmedAdState(player) {
    if (!(player instanceof HTMLElement)) {
      return false;
    }

    if (
      player.classList.contains("ad-showing") ||
      player.classList.contains("ad-interrupting")
    ) {
      return true;
    }

    const skipButton = document.querySelector(
      ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button"
    );
    const countdown = document.querySelector(".ytp-ad-duration-remaining");

    return Boolean(skipButton || countdown);
  }

  function clickSkipButton() {
    const buttons = document.querySelectorAll(
      ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button"
    );

    for (const button of buttons) {
      if (button instanceof HTMLElement) {
        button.click();
      }
    }
  }

  function closeOverlayAds() {
    const closeButtons = document.querySelectorAll(
      ".ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container button"
    );

    for (const button of closeButtons) {
      if (button instanceof HTMLElement) {
        button.click();
      }
    }
  }

  function removeTextPromotions() {
    if (!state?.settings?.youtube?.hidePromotions) {
      return;
    }

    const cards = document.querySelectorAll(promotionSelectors);

    for (const card of cards) {
      if (!(card instanceof HTMLElement)) {
        continue;
      }

      const badge = card.querySelector(
        "#badge-label, #metadata-line, ytd-badge-supported-renderer"
      );
      const text = shield.normalizeText(badge?.textContent || card.textContent);

      if (!TEXT_PROMO_PATTERNS.some((pattern) => text.includes(pattern))) {
        continue;
      }

      if (!card.dataset.streamshieldHidden) {
        card.dataset.streamshieldHidden = "true";
        void shield.emitEvent(PLATFORM, "cosmetic", 1, {
          reason: "promoted-card"
        });
      }
    }
  }

  function removeShortsPromotions() {
    if (!state?.settings?.youtube?.blockShortsAds) {
      return;
    }

    const cards = document.querySelectorAll(shortsPromotionSelectors);

    for (const card of cards) {
      if (!(card instanceof HTMLElement) || card.dataset.streamshieldHidden) {
        continue;
      }

      const badge = card.querySelector(
        "#badge-label, #metadata-line, [aria-label*='Sponsored'], [aria-label*='Promoted'], [aria-label*='Quảng cáo'], [aria-label*='Được tài trợ']"
      );
      const text = shield.normalizeText(badge?.textContent || card.textContent);
      const hasAdSignal =
        card.matches("[is-ad], [data-sponsored], [data-ad-impressions]") ||
        Boolean(
          card.querySelector(
            "[aria-label*='Sponsored'], [aria-label*='Promoted'], [aria-label*='Quảng cáo'], [aria-label*='Được tài trợ']"
          )
        );

      if (!hasAdSignal && !TEXT_PROMO_PATTERNS.some((pattern) => text.includes(pattern))) {
        continue;
      }

      card.dataset.streamshieldHidden = "true";
      void shield.emitEvent(PLATFORM, "cosmetic", 1, {
        reason: "shorts-promoted-card"
      });
    }
  }

  function applyCustomCosmeticFilters() {
    if (!state?.settings?.filters?.enableCosmeticFilters) {
      return;
    }

    const selectors = state?.settings?.filters?.customCosmeticFilters?.youtube ?? [];
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
