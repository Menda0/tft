const LOW_VIEW_BOOST_SCALE = 4;
const FEED_DISCOVERY_BONUS = 35;

export function threadingLowViewBoost(views: number): number {
  const safeViews = Math.max(0, views);

  return 1 + LOW_VIEW_BOOST_SCALE / (1 + Math.log1p(safeViews));
}

export function threadingFeedDiscoveryBonus(views: number): number {
  const safeViews = Math.max(0, views);

  return FEED_DISCOVERY_BONUS / (1 + Math.log1p(safeViews));
}

export function threadingFeedRankScore(
  engagementScore: number,
  views: number,
): number {
  return engagementScore + threadingFeedDiscoveryBonus(views);
}
