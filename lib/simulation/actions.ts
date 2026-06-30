import type { Personality } from "@/lib/types/personality";
import type { ActionType } from "@/lib/types/world";

import { simulationConfig } from "./config";
import { weightedRandom } from "./utils";

type OptionalRoll = ActionType | "skip";

const optionalActionConfig = simulationConfig.optionalAction;

export function chooseOptionalAction(
  personality: Personality,
): ActionType | null {
  const result = weightedRandom<OptionalRoll>({
    post:
      optionalActionConfig.postBase +
      personality.stats.creativity * optionalActionConfig.postCreativityMultiplier,
    lurk: optionalActionConfig.lurk,
    skip: optionalActionConfig.skip,
  });

  return result === "skip" ? null : result;
}
