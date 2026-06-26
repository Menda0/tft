import OpenAI from "openai";

import {
  ARCHETYPE_DESCRIPTIONS,
  type Archetype,
} from "@/lib/personalities/archetypes";
import { GENDER_AVATAR_HINTS, type Gender } from "@/lib/personalities/gender";
import type { Traits } from "@/lib/types/personality";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  return new OpenAI({ apiKey });
}

function buildAvatarPrompt(
  name: string,
  gender: Gender,
  archetype: Archetype,
  traits: Traits,
  interests: string[],
): string {
  const interestText =
    interests.length > 0 ? interests.join(", ") : "social media drama";

  return [
    "Create a retro pixel art profile avatar portrait.",
    "Head and shoulders only, centered, facing forward.",
    `Character: ${name}, ${GENDER_AVATAR_HINTS[gender]}.`,
    `Vibe: ${ARCHETYPE_DESCRIPTIONS[archetype]}.`,
    `Personality levels (0-10) humor ${traits.humor}, aggression ${traits.aggression}, charisma ${traits.charisma}, curiosity ${traits.curiosity}, chaos ${traits.chaos}, empathy ${traits.empathy}.`,
    `Interests: ${interestText}.`,
    "Style: 16-bit game sprite, crisp square pixels, limited vibrant palette, no anti-aliasing, no text, no watermark.",
    "Background: solid flat dark navy #1d2b53.",
  ].join(" ");
}

async function generateWithModel(
  openai: OpenAI,
  model: "gpt-image-1" | "dall-e-2",
  prompt: string,
): Promise<string> {
  const result = await openai.images.generate({
    model,
    prompt,
    size: model === "dall-e-2" ? "512x512" : "1024x1024",
    response_format: "b64_json",
    n: 1,
  });

  const image = result.data?.[0];

  if (!image?.b64_json) {
    throw new Error("OpenAI did not return an image.");
  }

  return `data:image/png;base64,${image.b64_json}`;
}

export async function generatePixelAvatar(input: {
  name: string;
  gender: Gender;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
}): Promise<string> {
  const openai = getOpenAIClient();
  const prompt = buildAvatarPrompt(
    input.name,
    input.gender,
    input.archetype,
    input.traits,
    input.interests,
  );

  try {
    return await generateWithModel(openai, "gpt-image-1", prompt);
  } catch (error) {
    console.warn("gpt-image-1 failed, falling back to dall-e-2:", error);
    return generateWithModel(openai, "dall-e-2", prompt);
  }
}
