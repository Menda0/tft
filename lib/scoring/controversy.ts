export type ControversyEvent =
  | "disagree_reply_actor"
  | "disagree_reply_target"
  | "disagree_reply_target_repeat"
  | "unfollow_after_conflict";

export const CONTROVERSY_DELTAS: Record<ControversyEvent, number> = {
  disagree_reply_actor: 1,
  disagree_reply_target: 2,
  disagree_reply_target_repeat: 1,
  unfollow_after_conflict: 2,
};

export const HEAT_DECAY_RATE = 0.06;

export function computeControversyDelta(event: ControversyEvent): number {
  return CONTROVERSY_DELTAS[event];
}

export function computeScaledControversyDelta(
  base: number,
  intensity: number,
): number {
  return Math.max(0, Math.round(base * intensity));
}

export function decayControversy(heat: number): number {
  if (heat <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(heat * (1 - HEAT_DECAY_RATE)));
}
