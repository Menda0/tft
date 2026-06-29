import {
  PAGE_KIND_LABELS,
  profileKindUsesIdentity,
  type PageKind,
} from "@/lib/avatars/page-kind";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { ARCHETYPE_LABELS, type Archetype } from "@/lib/personalities/archetypes";
import { isDoorGender, type Gender } from "@/lib/personalities/gender";
import { PRONOUN_LABELS, type Pronouns } from "@/lib/personalities/pronouns";
import { formatPoliticalSwingDescription } from "@/lib/personalities/political-swing";
import { getOpenAIClient, getTextModel } from "@/lib/openai/client";
import type { PoliticalSwing } from "@/lib/personalities/political-swing";
import type { Traits } from "@/lib/types/personality";

export class DescriptionGenerationError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "DescriptionGenerationError";
    this.details = details;
  }
}

function traitSummary(traits: Traits): string {
  return [
    `humor ${traits.humor}/10`,
    `aggression ${traits.aggression}/10`,
    `troll ${traits.troll}/10`,
    `woke ${traits.woke}/10`,
    `negacionist ${traits.negacionist}/10`,
    `radical ${traits.radical}/10`,
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
  politicalSwing: PoliticalSwing;
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
    `Write a short social media profile bio.`,
    // `${PROJECT_NAME} is ${PROJECT_TAGLINE.charAt(0).toLowerCase()}${PROJECT_TAGLINE.slice(1)}`,
    `Name: ${input.name}`,
    `@${input.handle}`,
    `Profile kind: ${kindLabel}`,
    identityLines,
    `Archetype: ${archetypeLabel}`,
    `Political swing: ${formatPoliticalSwingDescription(input.politicalSwing)}.`,
    //`Traits: ${traitSummary(input.traits)}`,
    `Interests: ${interests}`,
    "Rules:",
    "- Return only the bio text.",
    "- 1-2 sentences, max 160 characters.",
    "- Match the voice of the archetype and profile kind.",
    "- Sound like a real social media bio: witty, specific, a little unhinged if troll is high.",
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
  politicalSwing: PoliticalSwing;
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
