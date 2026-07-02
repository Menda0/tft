import {
  getUserCount,
  listUsersByLastAccess,
  normalizeLinkedWallets,
} from "@/lib/db/users";
import {
  farmerMatchStage,
  heatScoreAddFieldsStage,
  netCloutAddFieldsStages,
} from "@/lib/leaderboards/aggregation";
import { getPersonalitiesCollection } from "@/lib/personalities";

export type AdminUserRow = {
  id: string;
  username: string;
  createdAt: string;
  lastAccessAt: string | null;
  personalityCount: number;
  mintCount: number;
  totalClout: number;
  totalHeat: number;
  linkedWalletCount: number;
};

export type AdminUsersPage = {
  total: number;
  items: AdminUserRow[];
};

type PersonalityMetricsRow = {
  ownerId: string;
  personalityCount: number;
  mintCount: number;
  totalClout: number;
  totalHeat: number;
};

async function getPersonalityMetricsByOwnerIds(
  ownerIds: string[],
): Promise<Map<string, PersonalityMetricsRow>> {
  if (ownerIds.length === 0) {
    return new Map();
  }

  const collection = await getPersonalitiesCollection();
  const rows = await collection
    .aggregate<PersonalityMetricsRow>([
      farmerMatchStage(),
      { $match: { ownerId: { $in: ownerIds } } },
      ...netCloutAddFieldsStages(),
      heatScoreAddFieldsStage(),
      {
        $group: {
          _id: "$ownerId",
          personalityCount: { $sum: 1 },
          mintCount: {
            $sum: {
              $cond: [{ $ifNull: ["$nft", false] }, 1, 0],
            },
          },
          totalClout: { $sum: "$_netClout" },
          totalHeat: { $sum: "$_heatScore" },
        },
      },
      {
        $project: {
          _id: 0,
          ownerId: "$_id",
          personalityCount: 1,
          mintCount: 1,
          totalClout: 1,
          totalHeat: 1,
        },
      },
    ])
    .toArray();

  return new Map(rows.map((row) => [row.ownerId, row]));
}

function toIsoString(value: Date | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function listAdminUsers({
  offset,
  limit,
}: {
  offset: number;
  limit: number;
}): Promise<AdminUsersPage> {
  const [total, users] = await Promise.all([
    getUserCount(),
    listUsersByLastAccess({ offset, limit }),
  ]);

  const ownerIds = users
    .map((user) => user._id?.toString())
    .filter((id): id is string => Boolean(id));
  const metricsByOwnerId = await getPersonalityMetricsByOwnerIds(ownerIds);

  const items = users
    .filter((user) => user._id)
    .map((user) => {
      const id = user._id!.toString();
      const metrics = metricsByOwnerId.get(id);

      return {
        id,
        username: user.username,
        createdAt: toIsoString(user.createdAt) ?? new Date(0).toISOString(),
        lastAccessAt: toIsoString(user.lastAccessAt),
        personalityCount: metrics?.personalityCount ?? 0,
        mintCount: metrics?.mintCount ?? 0,
        totalClout: metrics?.totalClout ?? 0,
        totalHeat: metrics?.totalHeat ?? 0,
        linkedWalletCount: normalizeLinkedWallets(user.linkedWallets).length,
      };
    });

  return { total, items };
}
