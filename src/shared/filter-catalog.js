export const FILTER_CATALOG = [
  {
    id: "youtube-network",
    platform: "youtube",
    label: "Chặn request quảng cáo",
    description: "Khoá request quảng cáo YouTube ở tầng mạng.",
    path: ["youtube", "networkFiltersEnabled"]
  },
  {
    id: "youtube-skip-video",
    platform: "youtube",
    label: "Tự bỏ qua video quảng cáo",
    description: "Tự bấm bỏ qua khi video ads xuất hiện.",
    path: ["youtube", "autoSkipVideoAds"]
  },
  {
    id: "youtube-hide-sponsored",
    platform: "youtube",
    label: "Ẩn nội dung tài trợ",
    description: "Ẩn card và khối nội dung được tài trợ.",
    path: ["youtube", "hidePromotions"]
  },
  {
    id: "youtube-shorts-cleanup",
    platform: "youtube",
    label: "Dọn quảng cáo Shorts",
    description: "Ẩn các phần quảng cáo chen trong Shorts.",
    path: ["youtube", "blockShortsAds"]
  },
  {
    id: "spotify-network",
    platform: "spotify",
    label: "Chặn request quảng cáo",
    description: "Khoá request quảng cáo Spotify ở tầng mạng.",
    path: ["spotify", "networkFiltersEnabled"]
  },
  {
    id: "spotify-mute-audio",
    platform: "spotify",
    label: "Tắt tiếng audio quảng cáo",
    description: "Giảm khó chịu khi Spotify phát audio ads.",
    path: ["spotify", "muteAudioAds"]
  },
  {
    id: "spotify-auto-advance",
    platform: "spotify",
    label: "Tự chuyển khi gặp quảng cáo",
    description: "Tự nhấn next khi player rơi vào ad state.",
    path: ["spotify", "autoAdvance"]
  },
  {
    id: "spotify-hide-sponsored",
    platform: "spotify",
    label: "Ẩn nội dung tài trợ",
    description: "Ẩn thẻ và danh sách đề xuất tài trợ.",
    path: ["spotify", "hideSponsoredRecommendations"]
  }
];

const FILTER_MAP = new Map(FILTER_CATALOG.map((filter) => [filter.id, filter]));

function getByPath(source, path) {
  return path.reduce((value, key) => value?.[key], source);
}

export function getFilterEnabled(settings, filterId) {
  const filter = FILTER_MAP.get(filterId);
  if (!filter) {
    return false;
  }

  return Boolean(getByPath(settings, filter.path));
}

export function createFilterSettingsPatch(filterId, enabled) {
  const filter = FILTER_MAP.get(filterId);
  if (!filter) {
    return {};
  }

  const [section, key] = filter.path;
  return {
    [section]: {
      [key]: Boolean(enabled)
    }
  };
}
