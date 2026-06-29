import { PIXEL_ART_STYLE } from "@/lib/avatars/pixel-canvas";
import { generateImageFromPrompt } from "@/lib/openai/avatar";
import OpenAI, { toFile } from "openai";

const PIXEL_POST_PROMPT = [
  "Convert this social media image into retro pixel art for a parody feed.",
  "Keep the same scene, subjects, and composition recognizable.",
  PIXEL_ART_STYLE,
  "No photorealism, no text overlays, no watermarks, no borders.",
].join(" ");

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

async function describeImageForPixelArt(
  openai: OpenAI,
  sourceDataUrl: string,
  postContent: string,
): Promise<string> {
  const textModel = process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4.1-mini";
  const response = await openai.chat.completions.create({
    model: textModel,
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
              "Describe this social media image briefly so it can be recreated as retro pixel art.",
              postContent
                ? `The post text is: "${postContent.slice(0, 180)}"`
                : "",
              "Focus on visible subjects, setting, colors, and composition.",
            ]
              .filter(Boolean)
              .join(" "),
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

  return description;
}

async function generateWithImageEdit(
  openai: OpenAI,
  sourceBuffer: Buffer,
  postContent: string,
): Promise<string> {
  const model = getConfiguredImageModel();
  const file = await toFile(sourceBuffer, "source.png", { type: "image/png" });
  const prompt = postContent
    ? `${PIXEL_POST_PROMPT} Post context: "${postContent.slice(0, 180)}".`
    : PIXEL_POST_PROMPT;

  const result = await openai.images.edit({
    model,
    image: file,
    prompt,
    size: "1024x1024",
    output_format: "png",
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

  throw new Error("OpenAI image edit did not return image data.");
}

export async function generatePostPixelImage(input: {
  sourceImageUrl: string;
  postContent: string;
}): Promise<string> {
  const sourceBuffer = await downloadImageBuffer(input.sourceImageUrl);
  const openai = getOpenAIClient();

  try {
    return await generateWithImageEdit(openai, sourceBuffer, input.postContent);
  } catch (editError) {
    console.warn(
      "OpenAI image edit failed; falling back to describe + generate:",
      editError,
    );
  }

  const description = await describeImageForPixelArt(
    openai,
    toDataUrl(sourceBuffer),
    input.postContent,
  );

  const prompt = [
    "Create exactly one retro pixel art social media image.",
    PIXEL_ART_STYLE,
    `Scene: ${description}`,
    postContentSnippet(input.postContent),
    "No text overlays, no watermarks, no borders.",
  ]
    .filter(Boolean)
    .join(" ");

  return generateImageFromPrompt(prompt);
}

function postContentSnippet(postContent: string): string {
  const normalized = postContent.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  return `Mood/context from post: "${normalized.slice(0, 180)}".`;
}
