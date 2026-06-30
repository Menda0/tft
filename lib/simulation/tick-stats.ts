export type SimulationTickStats = {
  posts: number;
  replies: number;
  agreeReplies: number;
  disagreeReplies: number;
  likes: number;
  replyLikes: number;
  reposts: number;
  follows: number;
  unfollows: number;
  postsRead: number;
};

export function createTickStats(): SimulationTickStats {
  return {
    posts: 0,
    replies: 0,
    agreeReplies: 0,
    disagreeReplies: 0,
    likes: 0,
    replyLikes: 0,
    reposts: 0,
    follows: 0,
    unfollows: 0,
    postsRead: 0,
  };
}

export function recordTickStat(
  stats: SimulationTickStats | null | undefined,
  key: keyof SimulationTickStats,
  amount = 1,
): void {
  if (!stats) {
    return;
  }

  stats[key] += amount;
}

export function formatTickStatsSummary(stats: SimulationTickStats): string {
  return [
    `${stats.posts} post(s)`,
    `${stats.replies} repl(ies) (${stats.agreeReplies} agree, ${stats.disagreeReplies} disagree)`,
    `${stats.likes} like(s)`,
    `${stats.replyLikes} reply like(s)`,
    `${stats.reposts} repost(s)`,
    `${stats.follows} follow(s)`,
    `${stats.unfollows} unfollow(s)`,
    `${stats.postsRead} post(s) read`,
  ].join(", ");
}
