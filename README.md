# DShineeTools

DShineeTools is a Manifest V3 browser extension scaffold focused on reducing ad interruptions on YouTube and Spotify Web with a hybrid strategy:

- `declarativeNetRequest` rules for common ad endpoints.
- Adaptive + custom filter bundles compiled into dynamic DNR rules.
- Injected page-context patches for fetch/XHR interception.
- Content-script player logic for skip, mute, and cosmetic cleanup.
- Bilingual dashboard UI in Vietnamese + English.

## Structure

- `manifest.json`: extension manifest and permissions.
- `src/background/service-worker.js`: settings, ruleset sync, stats, messaging.
- `src/content/`: YouTube and Spotify content scripts.
- `src/injected/`: page-context network patch scripts.
- `popup/` and `options/`: user interface.
- `rules/`: static DNR rulesets.
- `src/shared/filter-engine.js`: custom filter compilation for dynamic rules.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Choose `Load unpacked`.
4. Select `C:\Extension-AdBlock`.

## Notes

- YouTube logic combines request blocking, DOM cleanup, skip-button automation, and ad-state seeking.
- Spotify Web logic combines ad endpoint blocking, DOM detection, mute/restore playback, and sponsored-card cleanup.
- Some platform flows can change over time, so selectors and endpoint patterns may need periodic updates.
- Custom network filter syntax:
  - `||doubleclick.net^`
  - `|https://www.youtube.com/pagead/`
  - `regex:^https://example\\.com/ad/.*`
- Custom cosmetic filters accept one CSS selector per line.
