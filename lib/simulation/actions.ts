import type { Personality } from "@/lib/types/personality";
import type { ActionType } from "@/lib/types/world";

import { getDailyPostLimit } from "./limits";
import { simulationConfig } from "./config";
import { weightedRandom } from "./utils";

type OptionalRoll = ActionType | "skip";

const optionalActionConfig = simulationConfig.optionalAction;

function postWeightForToday(
  personality: Personality,
  postsToday: number,
): number {
  const base =
    optionalActionConfig.postBase +
    personality.stats.creativity * optionalActionConfig.postCreativityMultiplier;

  if (postsToday <= 0) {
    return base;
  }

  if (postsToday === 1) {
    return base * optionalActionConfig.postSecondMultiplier;
  }

  if (postsToday === 2) {
    return base * optionalActionConfig.postThirdMultiplier;
  }

  return 0;
}

export function chooseOptionalAction(
  personality: Personality,
  postsToday = 0,
): ActionType | null {
  const dailyLimit = getDailyPostLimit();
  const postWeight =
    postsToday >= dailyLimit ? 0 : postWeightForToday(personality, postsToday);

  const weights: Partial<Record<OptionalRoll, number>> = {
    lurk: optionalActionConfig.lurk,
    skip: optionalActionConfig.skip,
  };

  if (postWeight > 0) {
    weights.post = postWeight;
  }

  const result = weightedRandom<OptionalRoll>(weights as Record<OptionalRoll, number>);

  return result === "skip" ? null : result;
}
