import {
  getTopFarmersByClout,
  getTopFarmersByHeat,
  getTopPersonalitiesByClout,
  getTopPersonalitiesByHeat,
} from "@/lib/leaderboards";
import type { LeaderboardsPayload } from "@/lib/types/desktop";

export async function buildLeaderboards(): Promise<LeaderboardsPayload> {
  const [
    personalitiesByClout,
    farmersByClout,
    personalitiesByHeat,
    farmersByHeat,
  ] = await Promise.all([
    getTopPersonalitiesByClout(),
    getTopFarmersByClout(),
    getTopPersonalitiesByHeat(),
    getTopFarmersByHeat(),
  ]);

  return {
    personalitiesByClout,
    farmersByClout,
    personalitiesByHeat,
    farmersByHeat,
    updatedAt: new Date().toISOString(),
  };
}
