import type { Personality } from "@/lib/types/personality";
import type { ActionType } from "@/lib/types/world";

import { weightedRandom } from "./utils";

type OptionalRoll = ActionType | "skip";

export function chooseOptionalAction(
  personality: Personality,
): ActionType | null {
  const result = weightedRandom<OptionalRoll>({
    post: 2 + personality.stats.creativity * 0.12,
    lurk: 40,
    skip: 115,
  });

  return result === "skip" ? null : result;
}
