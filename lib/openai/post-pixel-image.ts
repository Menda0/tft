import { PIXEL_ART_STYLE } from "@/lib/avatars/pixel-canvas";
import {
  moderatePostMediaInput,
  type PostMediaModerationResult,
} from "@/lib/openai/post-media-moderation";
import OpenAI from "openai";

const SAFE_PIXEL_ART_RULES = [
  "Family-friendly, fully clothed, no nudity, no suggestive content.",
  "No real-person likeness, no logos, no readable text.",
  "Cartoon game sprite aesthetic only.",
].join(" ");

const UNSAFE_DESCRIPTION = "UNSAFE";

export class PostPixelImageSkippedError extends Error {
  reason: string;

  constructor(reason: string) {
    super(`Post pixel art skipped: ${reason}`);
    this.name = "PostPixelImageSkippedError";
    this.reason = reason;
  }
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey });
}

function getConfiguredImageModel(): string {
  const configured = process.env.OPENAI_IMAGE_MODEL?.trim();
  return configured?.split(",")[0]?.trim() || "gpt-image-1";
}

function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4.1-mini";
}

export function isModerationBlocked(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    code?: string;
    error?: { code?: string };
    message?: string;
  };

  if (
    record.code === "moderation_blocked" ||
    record.error?.code === "moderation_blocked"
  ) {
    return true;
  }

  const message =
    error instanceof Error ? error.message : (record.message ?? "");

  return message.includes("moderation_blocked");
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not download source image (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function toDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function describeImageForSafePixelArt(
  openai: OpenAI,
  sourceDataUrl: string,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: getTextModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: sourceDataUrl },
          },
          {
            type: "text",
            text: [
              "Describe this image briefly as a family-friendly retro pixel art scene.",
              "Use generic terms for people (for example: a person in casual clothes).",
              "Focus on setting, colors, composition, and mood.",
              "Omit nudity, sexual content, violence, hate symbols, logos, and readable text.",
              `If the image is not suitable for family-friendly pixel art, respond with exactly: ${UNSAFE_DESCRIPTION}`,
            ].join(" "),
          },
        ],
      },
    ],
    max_tokens: 180,
  });

  const description = response.choices[0]?.message?.content?.trim();

  if (!description) {
    throw new Error("Could not describe source image for pixel art.");
  }

  if (description.toUpperCase() === UNSAFE_DESCRIPTION) {
    throw new PostPixelImageSkippedError("source_image_unsafe");
  }

  return description;
}

function buildPixelArtPrompt(description: string): string {
  return [
    "Create exactly one family-friendly retro pixel art social media image.",
    PIXEL_ART_STYLE,
    SAFE_PIXEL_ART_RULES,
    `Scene: ${description}`,
    "No text overlays, no watermarks, no borders, no photorealism.",
  ].join(" ");
}

async function generateFromSanitizedPrompt(
  openai: OpenAI,
  prompt: string,
): Promise<string> {
  const model = getConfiguredImageModel();

  try {
    const result = await openai.images.generate({
      model,
      prompt,
      size: "1024x1024",
      output_format: "png",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    const url = result.data?.[0]?.url;

    if (b64) {
      return toDataUrl(Buffer.from(b64, "base64"));
    }

    if (url) {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Could not download generated image (${response.status}).`);
      }

      return toDataUrl(Buffer.from(await response.arrayBuffer()));
    }

    throw new Error("OpenAI image generation did not return image data.");
  } catch (error) {
    if (isModerationBlocked(error)) {
      throw new PostPixelImageSkippedError("image_generation_moderation_blocked");
    }

    throw error;
  }
}

export async function generateMirroredPostPixelImage(input: {
  sourceImageUrl: string;
  postContent: string;
}): Promise<string> {
  const sourceBuffer = await downloadImageBuffer(input.sourceImageUrl);
  const sourceDataUrl = toDataUrl(sourceBuffer);
  const openai = getOpenAIClient();

  const moderation = await moderatePostMediaInput({
    content: input.postContent,
    sourceDataUrl,
  });

  if (!moderation.safe) {
    throw new PostPixelImageSkippedError(moderation.reason);
  }

  const description = await describeImageForSafePixelArt(openai, sourceDataUrl);
  const prompt = buildPixelArtPrompt(description);

  return generateFromSanitizedPrompt(openai, prompt);
}

export type { PostMediaModerationResult };
