import type { Personality } from "@/lib/types/personality";
import type { ActionType } from "@/lib/types/world";

import { weightedRandom } from "./utils";

export function chooseAction(personality: Personality): ActionType {
  const weights = {
    post: 20 + personality.stats.creativity * 2,
    reply: 20 + personality.traits.aggression + personality.traits.troll,
    repost: 10 + personality.traits.radical,
    lurk: 30,
    follow: 5 + personality.traits.negacionist,
  };

  return weightedRandom(weights);
}
