import OpenAI from "openai";

import {
  PAGE_KIND_LABELS,
  profileKindUsesIdentity,
  type PageKind,
} from "@/lib/avatars/page-kind";
import { ARCHETYPE_LABELS, type Archetype } from "@/lib/personalities/archetypes";
import { isDoorGender, type Gender } from "@/lib/personalities/gender";
import { PRONOUN_LABELS, type Pronouns } from "@/lib/personalities/pronouns";
import type { Traits } from "@/lib/types/personality";

const DEFAULT_TEXT_MODEL = "gpt-4.1-nano";

export class DescriptionGenerationError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "DescriptionGenerationError";
    this.details = details;
  }
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new DescriptionGenerationError(
      "Missing OPENAI_API_KEY.",
      "Add OPENAI_API_KEY to .env.local, then restart the dev server.",
    );
  }

  return new OpenAI({ apiKey });
}

function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
}

function traitSummary(traits: Traits): string {
  return [
    `humor ${traits.humor}/10`,
    `aggression ${traits.aggression}/10`,
    `charisma ${traits.charisma}/10`,
    `curiosity ${traits.curiosity}/10`,
    `chaos ${traits.chaos}/10`,
    `empathy ${traits.empathy}/10`,
  ].join(", ");
}

function buildDescriptionPrompt(input: {
  name: string;
  handle: string;
  kind: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
}): string {
  const interests =
    input.interests.length > 0 ? input.interests.join(", ") : "social media";
  const kindLabel = PAGE_KIND_LABELS[input.kind];
  const archetypeLabel = ARCHETYPE_LABELS[input.archetype];

  const identityLines = profileKindUsesIdentity(input.kind)
    ? [
        `Gender: ${input.gender}.`,
        `Pronouns: ${PRONOUN_LABELS[input.pronouns]}.`,
        isDoorGender(input.gender)
          ? "Lean into the absurd fact that this profile identifies as a door."
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "This is a page/account profile, not an individual person.";

  return [
    "Write a short FakeX social media profile bio.",
    "FakeX is a chaotic pixel-art social network where AI personalities post like people on X/Twitter.",
    `Name: ${input.name}`,
    `@${input.handle}`,
    `Profile kind: ${kindLabel}`,
    identityLines,
    `Archetype: ${archetypeLabel}`,
    `Traits: ${traitSummary(input.traits)}`,
    `Interests: ${interests}`,
    "Rules:",
    "- Return only the bio text.",
    "- 1-2 sentences, max 160 characters.",
    "- Match the voice of the archetype and profile kind.",
    "- Sound like a real social media bio: witty, specific, a little unhinged if chaos is high.",
    "- No hashtags, no quotes, no markdown, no labels.",
  ].join("\n");
}

function normalizeDescription(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

export async function generateProfileDescription(input: {
  name: string;
  handle: string;
  kind: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
}): Promise<string> {
  const openai = getOpenAIClient();
  const model = getTextModel();

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.9,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content:
          "You write punchy social media bios for fictional internet personalities.",
      },
      {
        role: "user",
        content: buildDescriptionPrompt(input),
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new DescriptionGenerationError(
      "OpenAI did not return a profile description.",
      `Model ${model} returned an empty response.`,
    );
  }

  return normalizeDescription(content);
}
