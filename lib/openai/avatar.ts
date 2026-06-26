import OpenAI from "openai";

import { generateProceduralPixelAvatar } from "@/lib/avatars/procedural-pixel";
import {
  ARCHETYPE_DESCRIPTIONS,
  type Archetype,
} from "@/lib/personalities/archetypes";
import { GENDER_AVATAR_HINTS, type Gender } from "@/lib/personalities/gender";
import {
  PRONOUN_AVATAR_HINTS,
  type Pronouns,
} from "@/lib/personalities/pronouns";
import type { Traits } from "@/lib/types/personality";

const DEFAULT_IMAGE_MODELS = [
  "gpt-image-2",
  "chatgpt-image-latest",
  "gpt-image-1-mini",
  "gpt-image-1.5",
  "gpt-image-1",
] as const;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  return new OpenAI({ apiKey });
}

function getImageModels(): string[] {
  const configured = process.env.OPENAI_IMAGE_MODEL?.trim();

  if (configured) {
    return configured
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
  }

  return [...DEFAULT_IMAGE_MODELS];
}

function buildAvatarPrompt(
  name: string,
  gender: Gender,
  pronouns: Pronouns,
  archetype: Archetype,
  traits: Traits,
  interests: string[],
): string {
  const interestText =
    interests.length > 0 ? interests.join(", ") : "social media drama";

  return [
    "Create a pixel art social media profile avatar.",
    "Single character portrait, head and shoulders, centered, facing forward.",
    "Must look like a retro 16-bit or 32-bit video game sprite.",
    "Crisp visible square pixels, hard edges, limited 8-color palette, no smoothing, no anti-aliasing.",
    "No photorealism. No 3D. No vector art. No anime shading.",
    `Character name: ${name}.`,
    `Presentation: ${GENDER_AVATAR_HINTS[gender]}.`,
    `Pronouns: ${PRONOUN_AVATAR_HINTS[pronouns]}.`,
    `Personality archetype: ${ARCHETYPE_DESCRIPTIONS[archetype]}.`,
    `Trait levels (0-10): humor ${traits.humor}, aggression ${traits.aggression}, charisma ${traits.charisma}, curiosity ${traits.curiosity}, chaos ${traits.chaos}, empathy ${traits.empathy}.`,
    `Interests to reflect visually: ${interestText}.`,
    "Solid flat dark navy background (#1d2b53).",
    "No text, no letters, no watermark, no logo, no frame.",
  ].join(" ");
}

function toDataUrl(b64: string): string {
  return `data:image/png;base64,${b64}`;
}

async function downloadImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not download generated image (${response.status}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return toDataUrl(buffer.toString("base64"));
}

async function generateWithImageModel(
  openai: OpenAI,
  model: string,
  prompt: string,
): Promise<string> {
  const qualities = ["high", "medium", "low"] as const;
  let lastError: Error | null = null;

  for (const quality of qualities) {
    try {
      const result = await openai.images.generate({
        model,
        prompt,
        size: "1024x1024",
        quality,
        output_format: "png",
        n: 1,
      });

      const b64 = result.data?.[0]?.b64_json;
      const url = result.data?.[0]?.url;

      if (b64) {
        return toDataUrl(b64);
      }

      if (url) {
        return downloadImageAsDataUrl(url);
      }

      throw new Error(`OpenAI ${model} did not return image data.`);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown OpenAI error");
    }
  }

  throw lastError ?? new Error(`OpenAI ${model} failed.`);
}

export async function generatePixelAvatar(input: {
  name: string;
  handle: string;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
}): Promise<string> {
  const prompt = buildAvatarPrompt(
    input.name,
    input.gender,
    input.pronouns,
    input.archetype,
    input.traits,
    input.interests,
  );

  const models = getImageModels();
  const errors: string[] = [];

  if (process.env.OPENAI_API_KEY) {
    const openai = getOpenAIClient();

    for (const model of models) {
      try {
        return await generateWithImageModel(openai, model, prompt);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown OpenAI error";
        errors.push(`${model}: ${message}`);
        console.warn("Pixel avatar generation attempt failed:", message);
      }
    }
  } else {
    errors.push("Missing OPENAI_API_KEY environment variable");
  }

  console.warn(
    "OpenAI image models unavailable, using procedural pixel avatar fallback.",
    errors.join(" | "),
  );

  return generateProceduralPixelAvatar(input);
}
