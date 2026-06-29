export type RankNpcLog = (message: string) => void;

export const defaultRankNpcLog: RankNpcLog = (message) => {
  console.info(`[rank-npc] ${message}`);
};
