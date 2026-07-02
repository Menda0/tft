import type { Personality } from "@/lib/types/personality";

import { weightedRandom } from "./utils";

export type PostAngle =
  | "skeptical"
  | "joke"
  | "hot_take"
  | "contrarian"
  | "moral_framing"
  | "practical"
  | "personal_story"
  | "question_hook"
  | "policy_push"
  | "conspiracy_adjacent";

export const POST_ANGLE_GUIDANCE: Record<PostAngle, string> = {
  skeptical:
    "Take a skeptical angle — question the hype, missing context, or what people are overlooking.",
  joke:
    "Lead with humor, irony, or a meme-ready punchline while still landing a real point.",
  hot_take:
    "Write a blunt, high-energy hot take with strong conviction and sharp wording.",
  contrarian:
    "Push a contrarian angle that challenges the obvious narrative around this topic.",
  moral_framing:
    "Frame the topic through ethics, fairness, or who gets harmed or helped.",
  practical:
    "Focus on practical consequences, costs, tradeoffs, or what this means day to day.",
  personal_story:
    "Sound like a personal reaction or lived-experience take, not a news recap.",
  question_hook:
    "Open with a provocative question that invites argument in the replies.",
  policy_push:
    "Argue for a bold policy, systemic fix, or structural change tied to the topic.",
  conspiracy_adjacent:
    "Hint that something deeper is being hidden or oversimplified, without going full unhinged.",
};

function angleWeightsForPersonality(
  personality: Personality,
): Record<PostAngle, number> {
  const { traits, politicalSwing, stats } = personality;

  return {
    skeptical: 1 + traits.negacionist * 0.12,
    joke: 1 + traits.humor * 0.14,
    hot_take: 1 + traits.aggression * 0.12,
    contrarian: 1 + traits.troll * 0.1 + traits.negacionist * 0.06,
    moral_framing: 1 + traits.woke * 0.12,
    practical: 1.2,
    personal_story: 1 + stats.creativity * 0.04,
    question_hook: 1 + traits.troll * 0.08 + traits.humor * 0.05,
    policy_push: 1 + traits.radical * 0.12 + Math.abs(politicalSwing) * 0.04,
    conspiracy_adjacent:
      1 + traits.negacionist * 0.1 + traits.troll * 0.06,
  };
}

export function pickPostAngle(personality: Personality): PostAngle {
  const weights = angleWeightsForPersonality(personality);
  return weightedRandom(weights);
}

export function formatPostAngleGuidance(angle: PostAngle): string {
  return POST_ANGLE_GUIDANCE[angle];
}
