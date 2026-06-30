import type { SimulationTickStats } from "@/lib/simulation/tick-stats";

export type TickResult = {
  id: string;
  tickNumber: number;
  completedAt: Date;
  simulatedPersonalityCount: number;
  eligiblePersonalityCount: number;
  stats: SimulationTickStats;
};

export type TickResultsPage = {
  items: TickResult[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
