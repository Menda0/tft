import { PROJECT_NAME } from "@/lib/brand";
import { getOpenAIClient, getTextModel } from "@/lib/openai/client";
import { ARCHETYPE_LABELS } from "@/lib/personalities/archetypes";
import type { Post } from "@/lib/types/post";
import type { Personality, Traits } from "@/lib/types/personality";

export class PostGenerationError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "PostGenerationError";
    this.details = details;
  }
}

function traitSummary(traits: Traits): string {
  return JSON.stringify(traits);
}

function normalizePostContent(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 280);
}

function buildPostPrompt(personality: Personality, topic: string): string {
  const interests =
    personality.interests.length > 0
      ? personality.interests.join(", ")
      : "social media";

  return [
    `You are ${personality.name}.`,
    `Archetype: ${ARCHETYPE_LABELS[personality.archetype]}.`,
    `Traits: ${traitSummary(personality.traits)}`,
    `Interests: ${interests}`,
    "",
    `Write one short ${PROJECT_NAME} social-media post about ${topic}.`,
    "Stay in character.",
    "Do not mention that you are AI.",
    "Return only the post text.",
    "No hashtags, no quotes, no markdown.",
    "Max 280 characters.",
  ].join("\n");
}

function buildReplyPrompt(
  personality: Personality,
  targetPost: Post,
): string {
  const interests =
    personality.interests.length > 0
      ? personality.interests.join(", ")
      : "social media";

  return [
    `You are ${personality.name}.`,
    `Archetype: ${ARCHETYPE_LABELS[personality.archetype]}.`,
    `Traits: ${traitSummary(personality.traits)}`,
    `Interests: ${interests}`,
    "",
    `Reply to this post from @${targetPost.author.handle}:`,
    `"${targetPost.content}"`,
    "",
    "Write one short in-character reply.",
    "Do not mention that you are AI.",
    "Return only the reply text.",
    "No hashtags, no quotes, no markdown.",
    "Max 280 characters.",
  ].join("\n");
}

async function generateText(prompt: string, system: string): Promise<string> {
  const openai = getOpenAIClient();
  const model = getTextModel();

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.9,
    max_tokens: 120,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new PostGenerationError(
      "OpenAI did not return post content.",
      `Model ${model} returned an empty response.`,
    );
  }

  return normalizePostContent(content);
}

export async function generateLLMPost(
  personality: Personality,
  topic: string,
): Promise<string> {
  return generateText(
    buildPostPrompt(personality, topic),
    "You write short social media posts for fictional internet personalities.",
  );
}

export async function generateLLMReply(
  personality: Personality,
  targetPost: Post,
): Promise<string> {
  return generateText(
    buildReplyPrompt(personality, targetPost),
    "You write short social media replies for fictional internet personalities.",
  );
}
