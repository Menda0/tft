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

export const HEAT_DECAY_RATE = 0.02;

export function computeControversyDelta(event: ControversyEvent): number {
  return CONTROVERSY_DELTAS[event];
}

export function decayControversy(heat: number): number {
  if (heat <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(heat * (1 - HEAT_DECAY_RATE)));
}
