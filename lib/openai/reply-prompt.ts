import { formatPersonalityVoiceLabel } from "@/lib/personalities/kind-archetypes";
import { formatPoliticalSwingDescription } from "@/lib/personalities/political-swing";
import type { ReplyTone } from "@/lib/types/post";
import type { RelationshipCategory } from "@/lib/profile/relationship-category";
import { formatMemoriesForPrompt } from "@/lib/simulation/memory";
import type { Post } from "@/lib/types/post";
import type { Personality, Relationship } from "@/lib/types/personality";

export type { ReplyTone };

export type ReplyEngagementContext = {
  targetAuthor: Pick<Personality, "name" | "handle">;
  relationship: Relationship;
  category?: RelationshipCategory;
  categoryLabel?: string;
  agreeIntensity?: number;
  disagreeIntensity?: number;
};

function memoryPromptLines(personality: Personality): string[] {
  const memories = formatMemoriesForPrompt(personality.memory);

  if (!memories) {
    return [];
  }

  return [
    "",
    "Recent memories (use for continuity, do not recite verbatim):",
    memories,
  ];
}

function agreeToneGuidance(intensity: number | undefined): string {
  if (intensity === undefined || intensity < 0.8) {
    return "Reply with brief, polite agreement.";
  }

  if (intensity <= 1.2) {
    return "Reply with warm support and add your own angle.";
  }

  return "Reply with enthusiastic ally energy — amplify their point and sound genuinely supportive.";
}

function stronglyAgreeToneGuidance(intensity: number | undefined): string {
  return `${agreeToneGuidance(intensity)} Sound emphatic and fully aligned — this is a strong endorsement.`;
}

function disagreeToneGuidance(intensity: number | undefined): string {
  if (intensity === undefined || intensity < 0.8) {
    return "Reply with mild pushback — hedge your disagreement and stay civil.";
  }

  if (intensity <= 1.5) {
    return "Reply with a direct counterargument, in character.";
  }

  return "Reply with sharp feud energy — you've clashed before, so don't pull punches.";
}

function stronglyDisagreeToneGuidance(intensity: number | undefined): string {
  return `${disagreeToneGuidance(intensity)} Make the disagreement unmistakable and forceful.`;
}

function neutralToneGuidance(): string {
  return "Reply with a neutral, matter-of-fact take — neither cheerleading nor attacking.";
}

function relationshipContextLines(context: ReplyEngagementContext): string[] {
  const { relationship, targetAuthor, categoryLabel } = context;
  const lines = [
    "",
    `Relationship with @${targetAuthor.handle}: trust ${relationship.trust}, admiration ${relationship.admiration}, rivalry ${relationship.rivalry}, familiarity ${relationship.familiarity}.`,
  ];

  if (categoryLabel) {
    lines.push(`You consider @${targetAuthor.handle} your ${categoryLabel}.`);
  }

  if (relationship.rivalry >= 7) {
    lines.push("You have an ongoing feud with this person.");
  }

  if (relationship.admiration >= 7) {
    lines.push("You generally respect this person — if disagreeing, do it reluctantly.");
  }

  return lines;
}

function toneGuidance(tone: ReplyTone, context?: ReplyEngagementContext): string {
  switch (tone) {
    case "strongly_agree":
      return `You strongly agree with this post. ${stronglyAgreeToneGuidance(context?.agreeIntensity)}`;
    case "agree":
      return `You agree with this post. ${agreeToneGuidance(context?.agreeIntensity)}`;
    case "neutral":
      return `You have a mixed or neutral reaction to this post. ${neutralToneGuidance()}`;
    case "disagree":
      return `You disagree with this post. ${disagreeToneGuidance(context?.disagreeIntensity)}`;
    case "strongly_disagree":
      return `You strongly disagree with this post. ${stronglyDisagreeToneGuidance(context?.disagreeIntensity)}`;
  }
}

export function buildReplyPrompt(
  personality: Personality,
  targetPost: Post,
  tone?: ReplyTone,
  context?: ReplyEngagementContext,
): string {
  const interests =
    personality.interests.length > 0
      ? personality.interests.join(", ")
      : "social media";

  const toneLine = tone
    ? toneGuidance(tone, context)
    : "Write one short in-character reply.";

  return [
    `You are ${personality.name}.`,
    `Archetype: ${formatPersonalityVoiceLabel(personality.kind, personality.archetype)}.`,
    `Political swing: ${formatPoliticalSwingDescription(personality.politicalSwing)}.`,
    `Interests: ${interests}`,
    ...memoryPromptLines(personality),
    ...(context ? relationshipContextLines(context) : []),
    "",
    `Reply to this post from @${targetPost.author.handle}:`,
    `"${targetPost.content}"`,
    "",
    toneLine,
    "Do not mention that you are AI.",
    "Return only the reply text.",
    "No hashtags, no quotes, no markdown.",
    "Max 280 characters.",
  ].join("\n");
}
