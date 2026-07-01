import { mergeNotDeleted } from "@/lib/db/active-filters";

export const COMPETITIVE_FILTER = mergeNotDeleted({
  $or: [
    { role: { $exists: false } },
    { role: { $nin: ["rank_npc", "catalog"] as const } },
  ],
});
