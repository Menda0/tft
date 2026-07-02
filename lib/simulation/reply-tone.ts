import type { PostStats, ReplyTone } from "@/lib/types/post";
import type { Personality, Relationship } from "@/lib/types/personality";

import { weightedRandom } from "./utils";

export const REPLY_TONES: ReplyTone[] = [
  "strongly_disagree",
  "disagree",
  "neutral",
  "agree",
  "strongly_agree",
];

export function isAgreeTone(tone: ReplyTone): boolean {
  return tone === "agree" || tone === "strongly_agree";
}

export function isDisagreeTone(tone: ReplyTone): boolean {
  return tone === "disagree" || tone === "strongly_disagree";
}

export function isEndorsementTone(tone: ReplyTone): boolean {
  return isAgreeTone(tone);
}

export function breaksEndorsementStreak(tone: ReplyTone): boolean {
  return isDisagreeTone(tone);
}

function toneWeightsForCompatibility(
  compatibility: number,
  relationship?: Relationship,
): Record<ReplyTone, number> {
  const rivalry = relationship?.rivalry ?? 0;
  const admiration = relationship?.admiration ?? 0;

  const center = compatibility * 4;
  const weights: Record<ReplyTone, number> = {
    strongly_disagree: Math.max(0.02, 1.4 - center + rivalry * 0.08),
    disagree: Math.max(0.05, 1.8 - center * 0.85 + rivalry * 0.05),
    neutral: Math.max(0.1, 1.2 - Math.abs(center - 2) * 0.35),
    agree: Math.max(0.05, 0.6 + center * 0.75 + admiration * 0.04),
    strongly_agree: Math.max(0.02, 0.3 + center * 0.95 + admiration * 0.06),
  };

  return weights;
}

export function decideReplyTone(
  compatibility: number,
  _alignment: number,
  _traits: Personality["traits"],
  relationship?: Relationship,
): ReplyTone {
  const weights = toneWeightsForCompatibility(compatibility, relationship);
  return weightedRandom(weights);
}

export function replyToneToStatField(tone: ReplyTone): keyof PostStats {
  switch (tone) {
    case "strongly_agree":
      return "stronglyAgreeReplies";
    case "agree":
      return "agreeReplies";
    case "neutral":
      return "neutralReplies";
    case "disagree":
      return "disagreeReplies";
    case "strongly_disagree":
      return "stronglyDisagreeReplies";
  }
}

export function normalizeLegacyReplyTone(
  tone: ReplyTone | "agree" | "disagree" | null | undefined,
): ReplyTone {
  if (tone === "strongly_disagree") {
    return "strongly_disagree";
  }

  if (tone === "strongly_agree") {
    return "strongly_agree";
  }

  if (tone === "neutral") {
    return "neutral";
  }

  if (tone === "disagree") {
    return "disagree";
  }

  return "agree";
}
