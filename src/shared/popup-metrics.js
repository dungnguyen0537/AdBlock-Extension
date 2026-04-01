function toCount(value) {
  return Number.isFinite(value) ? value : 0;
}

function getPlatformTotal(platformStats = {}) {
  return (
    toCount(platformStats.network) +
    toCount(platformStats.player) +
    toCount(platformStats.cosmetic)
  );
}

export function getPopupMetrics(stats = {}) {
  const youtube = getPlatformTotal(stats.youtube);
  const spotify = getPlatformTotal(stats.spotify);
  const website =
    toCount(stats?.youtube?.network) +
    toCount(stats?.youtube?.cosmetic) +
    toCount(stats?.spotify?.network) +
    toCount(stats?.spotify?.cosmetic);

  return {
    totalRequests: toCount(stats.totalBlocked),
    youtube,
    spotify,
    website
  };
}
