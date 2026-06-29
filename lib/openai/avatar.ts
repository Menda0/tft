import OpenAI from "openai";

import {
  buildAvatarPrompt,
  profileKindUsesIdentity,
  resolveAvatarPageProfile,
} from "@/lib/avatars/page-kind";
import { generateProceduralPixelAvatar } from "@/lib/avatars/procedural-pixel";
import { generateProceduralSubjectAvatar } from "@/lib/avatars/procedural-subjects";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";
import type { Pronouns } from "@/lib/personalities/pronouns";
import type { Traits } from "@/lib/types/personality";
import type { PageKind } from "@/lib/avatars/page-kind";

const DEFAULT_IMAGE_MODELS = [
  "gpt-image-2",
  "chatgpt-image-latest",
  "gpt-image-1.5",
  "gpt-image-1-mini",
  "gpt-image-1",
] as const;

const GPT_IMAGE_MODEL_PREFIX = "gpt-image";
const IMAGE_MODEL_HINT =
  "Enable an OpenAI image model (gpt-image-1 or gpt-image-2) for your project at https://platform.openai.com/ and verify your organization if required.";

export class AvatarGenerationError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "AvatarGenerationError";
    this.details = details;
  }
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AvatarGenerationError(
      "Missing OPENAI_API_KEY.",
      "Add OPENAI_API_KEY to .env.local, then restart the dev server.",
    );
  }

  return new OpenAI({ apiKey });
}

function getConfiguredImageModels(): string[] {
  const configured = process.env.OPENAI_IMAGE_MODEL?.trim();

  if (configured) {
    return configured
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
  }

  return [...DEFAULT_IMAGE_MODELS];
}

function isGptImageModel(model: string): boolean {
  return model.startsWith(GPT_IMAGE_MODEL_PREFIX) || model === "chatgpt-image-latest";
}

function buildAvatarPromptFromInput(input: {
  name: string;
  handle: string;
  kind?: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype | null;
  traits: Traits;
  interests: string[];
}): string {
  const profile = resolveAvatarPageProfile(input);
  return buildAvatarPrompt(profile);
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

async function generateWithGptImageModel(
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
        background: "opaque",
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

async function generateWithLegacyImageModel(
  openai: OpenAI,
  model: string,
  prompt: string,
): Promise<string> {
  const result = await openai.images.generate({
    model,
    prompt,
    size: model === "dall-e-2" ? "512x512" : "1024x1024",
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
}

async function generateWithImageModel(
  openai: OpenAI,
  model: string,
  prompt: string,
): Promise<string> {
  if (isGptImageModel(model)) {
    return generateWithGptImageModel(openai, model, prompt);
  }

  return generateWithLegacyImageModel(openai, model, prompt);
}

async function resolveImageModels(openai: OpenAI): Promise<string[]> {
  const configured = getConfiguredImageModels();

  try {
    const listed = await openai.models.list();
    const available = new Set(listed.data.map((model) => model.id));
    const known = configured.filter((model) => available.has(model));

    if (known.length > 0) {
      return known;
    }
  } catch (error) {
    console.warn("Could not list OpenAI models:", error);
  }

  return configured;
}

function shouldUseProceduralFallback(): boolean {
  return process.env.OPENAI_AVATAR_PROCEDURAL_FALLBACK === "true";
}

function generateProceduralAvatar(input: {
  name: string;
  handle: string;
  kind?: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype | null;
  traits: Traits;
  interests: string[];
}): string {
  const profile = resolveAvatarPageProfile(input);

  if (profileKindUsesIdentity(profile.kind)) {
    return generateProceduralPixelAvatar(input);
  }

  return generateProceduralSubjectAvatar({
    name: input.name,
    handle: input.handle,
    archetype: input.archetype,
    traits: input.traits,
    kind: profile.kind,
  });
}

function formatOpenAIError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown OpenAI error";
}

async function generateImageFromPrompt(
  prompt: string,
  proceduralFallback?: () => string,
): Promise<string> {
  const openai = getOpenAIClient();
  const models = await resolveImageModels(openai);
  const errors: string[] = [];

  for (const model of models) {
    try {
      return await generateWithImageModel(openai, model, prompt);
    } catch (error) {
      const message = formatOpenAIError(error);
      errors.push(`${model}: ${message}`);
      console.warn("OpenAI avatar generation attempt failed:", message);
    }
  }

  if (proceduralFallback && shouldUseProceduralFallback()) {
    console.warn(
      "OpenAI image generation failed; using procedural fallback because OPENAI_AVATAR_PROCEDURAL_FALLBACK=true.",
      errors.join(" | "),
    );
    return proceduralFallback();
  }

  const lastError = errors[errors.length - 1] ?? "Unknown OpenAI error.";

  throw new AvatarGenerationError(
    "OpenAI could not generate this avatar.",
    `${lastError} ${IMAGE_MODEL_HINT}`,
  );
}

export async function generatePixelAvatar(input: {
  name: string;
  handle: string;
  kind?: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype | null;
  traits: Traits;
  interests: string[];
}): Promise<string> {
  const prompt = buildAvatarPromptFromInput(input);
  return generateImageFromPrompt(prompt, () => generateProceduralAvatar(input));
}

export { generateImageFromPrompt };
