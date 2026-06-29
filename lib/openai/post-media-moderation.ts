import OpenAI from "openai";

export type PostMediaModerationResult =
  | { safe: true }
  | { safe: false; reason: string };

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey });
}

function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4.1-mini";
}

export async function moderatePostMediaText(
  content: string,
): Promise<PostMediaModerationResult> {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return { safe: true };
  }

  const openai = getOpenAIClient();
  const result = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: normalized,
  });

  const moderation = result.results[0];

  if (moderation?.flagged) {
    return { safe: false, reason: "post_text_flagged" };
  }

  return { safe: true };
}

const IMAGE_SAFETY_PROMPT = [
  "Is this image suitable for a family-friendly retro pixel art recreation?",
  "Reply with only SAFE or UNSAFE.",
  "Mark UNSAFE if it contains nudity, sexual content, suggestive poses, graphic violence,",
  "gore, hate symbols, illegal drug use, or other content unsuitable for all audiences.",
].join(" ");

export async function moderatePostMediaImage(
  sourceDataUrl: string,
): Promise<PostMediaModerationResult> {
  const openai = getOpenAIClient();
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
            text: IMAGE_SAFETY_PROMPT,
          },
        ],
      },
    ],
    max_tokens: 10,
  });

  const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "";

  if (answer.includes("UNSAFE")) {
    return { safe: false, reason: "source_image_unsafe" };
  }

  return { safe: true };
}

export async function moderatePostMediaInput(input: {
  content: string;
  sourceDataUrl: string;
}): Promise<PostMediaModerationResult> {
  const textResult = await moderatePostMediaText(input.content);

  if (!textResult.safe) {
    return textResult;
  }

  return moderatePostMediaImage(input.sourceDataUrl);
}
