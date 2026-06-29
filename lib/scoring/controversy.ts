export type ControversyEvent =
  | "disagree_reply_actor"
  | "disagree_reply_target"
  | "unfollow_after_conflict"
  | "scandal_memory";

export const CONTROVERSY_DELTAS: Record<ControversyEvent, number> = {
  disagree_reply_actor: 2,
  disagree_reply_target: 5,
  unfollow_after_conflict: 4,
  scandal_memory: 8,
};

export function computeControversyDelta(event: ControversyEvent): number {
  return CONTROVERSY_DELTAS[event];
}
