import { mergeNotDeletedPost } from "@/lib/db/active-filters";
import { getPostsCollection } from "@/lib/db/posts";

export type PersonalityEngagementStats = {
  posts: number;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
};

const EMPTY_STATS: PersonalityEngagementStats = {
  posts: 0,
  replies: 0,
  reposts: 0,
  likes: 0,
  views: 0,
};

export async function aggregatePersonalityEngagementStats(
  personalityIds: string[],
): Promise<Map<string, PersonalityEngagementStats>> {
  if (personalityIds.length === 0) {
    return new Map();
  }

  const collection = await getPostsCollection();
  const [facetResult] = await collection
    .aggregate<{
      authoredCounts: Array<{
        _id: string;
        posts: number;
        replies: number;
        reposts: number;
      }>;
      engagementReceived: Array<{
        _id: string;
        likes: number;
        views: number;
      }>;
    }>([
      {
        $match: mergeNotDeletedPost({
          "author.personalityId": { $in: personalityIds },
        }),
      },
      {
        $facet: {
          authoredCounts: [
            {
              $group: {
                _id: "$author.personalityId",
                posts: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$replyToPostId", null] },
                          { $eq: ["$repostOfPostId", null] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                replies: {
                  $sum: {
                    $cond: [{ $ne: ["$replyToPostId", null] }, 1, 0],
                  },
                },
                reposts: {
                  $sum: {
                    $cond: [{ $ne: ["$repostOfPostId", null] }, 1, 0],
                  },
                },
              },
            },
          ],
          engagementReceived: [
            {
              $group: {
                _id: "$author.personalityId",
                likes: { $sum: "$stats.likes" },
                views: { $sum: "$stats.views" },
              },
            },
          ],
        },
      },
    ])
    .toArray();

  const statsById = new Map<string, PersonalityEngagementStats>(
    personalityIds.map((id) => [id, { ...EMPTY_STATS }]),
  );

  for (const row of facetResult?.authoredCounts ?? []) {
    const existing = statsById.get(row._id) ?? { ...EMPTY_STATS };
    statsById.set(row._id, {
      ...existing,
      posts: row.posts,
      replies: row.replies,
      reposts: row.reposts,
    });
  }

  for (const row of facetResult?.engagementReceived ?? []) {
    const existing = statsById.get(row._id) ?? { ...EMPTY_STATS };
    statsById.set(row._id, {
      ...existing,
      likes: row.likes,
      views: row.views,
    });
  }

  return statsById;
}
