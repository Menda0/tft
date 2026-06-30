import type { Document } from "mongodb";

import { mergeNotDeleted } from "@/lib/db/active-filters";
import { COMPETITIVE_FILTER } from "@/lib/personalities/competitive-filter";

export const FARMER_MATCH = mergeNotDeleted({
  ownerId: { $exists: true, $ne: "" },
  $or: [{ role: { $exists: false } }, { role: { $ne: "rank_npc" as const } }],
});

export function netCloutAddFieldsStages(): Document[] {
  return [
    {
      $addFields: {
        _gross: {
          $max: [
            0,
            {
              $round: {
                $ifNull: ["$stats.socialScore", 0],
              },
            },
          ],
        },
        _heat: {
          $max: [
            0,
            {
              $round: {
                $ifNull: ["$stats.controversy", 0],
              },
            },
          ],
        },
      },
    },
    {
      $addFields: {
        _heatPenalty: {
          $cond: {
            if: {
              $or: [{ $lte: ["$_gross", 0] }, { $lte: ["$_heat", 0] }],
            },
            then: 0,
            else: {
              $min: [
                { $multiply: ["$_heat", 0.1] },
                { $multiply: ["$_gross", 0.3] },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        _netClout: {
          $max: [
            0,
            {
              $round: {
                $subtract: ["$_gross", "$_heatPenalty"],
              },
            },
          ],
        },
      },
    },
  ];
}

export function heatScoreAddFieldsStage(): Document {
  return {
    $addFields: {
      _heatScore: {
        $max: [
          0,
          {
            $round: {
              $ifNull: ["$stats.controversy", 0],
            },
          },
        ],
      },
    },
  };
}

export function competitiveMatchStage(): Document {
  return { $match: COMPETITIVE_FILTER };
}

export function farmerMatchStage(): Document {
  return { $match: FARMER_MATCH };
}
