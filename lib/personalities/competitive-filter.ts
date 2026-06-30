import { mergeNotDeleted } from "@/lib/db/active-filters";

export const COMPETITIVE_FILTER = mergeNotDeleted({
  $or: [
    { role: { $exists: false } },
    { role: { $ne: "rank_npc" as const } },
  ],
});
