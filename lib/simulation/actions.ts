import type { Personality } from "@/lib/types/personality";
import type { ActionType } from "@/lib/types/world";

import { weightedRandom } from "./utils";

type OptionalRoll = ActionType | "skip";

export function chooseOptionalAction(
  personality: Personality,
): ActionType | null {
  const result = weightedRandom<OptionalRoll>({
    post: 20 + personality.stats.creativity * 2,
    lurk: 30,
    skip: 50,
  });

  return result === "skip" ? null : result;
}
