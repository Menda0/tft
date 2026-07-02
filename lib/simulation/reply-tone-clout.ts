import type { ReplyTone } from "@/lib/types/post";

export const REPLY_TONE_CLOUT: Record<ReplyTone, number> = {
  strongly_agree: 14,
  agree: 8,
  neutral: 3,
  disagree: 2,
  strongly_disagree: 0,
};

export const REPLY_TONE_HEAT_TARGET: Record<ReplyTone, number> = {
  strongly_agree: 0,
  agree: 0,
  neutral: 0,
  disagree: 2,
  strongly_disagree: 4,
};

export const REPLY_TONE_HEAT_ACTOR: Record<ReplyTone, number> = {
  strongly_agree: 0,
  agree: 0,
  neutral: 0,
  disagree: 1,
  strongly_disagree: 2,
};

export type ReplyToneEngagementTotals = {
  replies: number;
  stronglyAgreeReplies?: number;
  agreeReplies?: number;
  neutralReplies?: number;
  disagreeReplies?: number;
  stronglyDisagreeReplies?: number;
  legacyAgreeReplies?: number;
  legacyDisagreeReplies?: number;
};

export function computeReplyToneCloutRaw(totals: ReplyToneEngagementTotals): number {
  const stronglyAgree = totals.stronglyAgreeReplies ?? 0;
  const agree = totals.agreeReplies ?? 0;
  const neutral = totals.neutralReplies ?? 0;
  const disagree = totals.disagreeReplies ?? 0;
  const stronglyDisagree = totals.stronglyDisagreeReplies ?? 0;

  const hasToneBreakdown =
    stronglyAgree + agree + neutral + disagree + stronglyDisagree > 0;

  if (hasToneBreakdown) {
    return (
      stronglyAgree * REPLY_TONE_CLOUT.strongly_agree +
      agree * REPLY_TONE_CLOUT.agree +
      neutral * REPLY_TONE_CLOUT.neutral +
      disagree * REPLY_TONE_CLOUT.disagree +
      stronglyDisagree * REPLY_TONE_CLOUT.strongly_disagree
    );
  }

  const legacyAgree = totals.legacyAgreeReplies ?? 0;
  const legacyDisagree = totals.legacyDisagreeReplies ?? 0;

  if (legacyAgree + legacyDisagree > 0) {
    return (
      legacyAgree * REPLY_TONE_CLOUT.agree +
      legacyDisagree * REPLY_TONE_CLOUT.disagree
    );
  }

  return totals.replies * REPLY_TONE_CLOUT.agree;
}

export function replyToneLogLabel(tone: ReplyTone): string {
  switch (tone) {
    case "strongly_agree":
      return "strongly agreed with";
    case "agree":
      return "agreed with";
    case "neutral":
      return "replied neutrally to";
    case "disagree":
      return "pushed back on";
    case "strongly_disagree":
      return "strongly pushed back on";
  }
}
