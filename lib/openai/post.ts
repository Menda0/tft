import { getOpenAIClient, getTextModel } from "@/lib/openai/client";
import { trackedChatCompletion } from "@/lib/openai/usage";
import { researchTopicForPost } from "@/lib/openai/post-research";
import {
  buildReplyPrompt,
  type ReplyEngagementContext,
  type ReplyTone,
} from "@/lib/openai/reply-prompt";
import { formatPersonalityVoiceLabel } from "@/lib/personalities/kind-archetypes";
import { formatPoliticalSwingDescription } from "@/lib/personalities/political-swing";
import { formatMemoriesForPrompt } from "@/lib/simulation/memory";
import {
  formatPostAngleGuidance,
  type PostAngle,
} from "@/lib/simulation/post-angle";
import type { Personality } from "@/lib/types/personality";

export type { ReplyEngagementContext, ReplyTone } from "@/lib/openai/reply-prompt";
export { buildReplyPrompt } from "@/lib/openai/reply-prompt";

export class PostGenerationError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "PostGenerationError";
    this.details = details;
  }
}

export type PostGenerationStage = "research" | "write";

function normalizePostContent(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 280);
}

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

function buildPostPrompt(
  personality: Personality,
  topic: string,
  researchNotes: string | null,
  options?: {
    angle?: PostAngle;
    recentPostsToAvoid?: string[];
  },
): string {
  const interests =
    personality.interests.length > 0
      ? personality.interests.join(", ")
      : "social media";

  const lines = [
    `You are ${personality.name}.`,
    `Archetype: ${formatPersonalityVoiceLabel(personality.kind, personality.archetype)}.`,
    `Political swing: ${formatPoliticalSwingDescription(personality.politicalSwing)}.`,
    //`Traits: ${traitSummary(personality.traits)}`,
    `Interests: ${interests}`,
    ...memoryPromptLines(personality),
    "",
    `Write one short social-media post about: ${topic}`,
  ];

  if (researchNotes) {
    lines.push(
      "",
      "Use these research notes for depth and specificity (do not list them verbatim):",
      researchNotes,
    );
  }

  if (options?.angle) {
    lines.push(
      "",
      `Posting angle: ${formatPostAngleGuidance(options.angle)}`,
    );
  }

  if (options?.recentPostsToAvoid && options.recentPostsToAvoid.length > 0) {
    lines.push(
      "",
      "Avoid repeating these recent posts about this topic:",
      ...options.recentPostsToAvoid.map((post) => `- ${post}`),
      "Write a clearly distinct angle, wording, and punchline.",
    );
  }

  lines.push(
    "",
    "Stay in character.",
    "Do not mention that you are AI.",
    "Return only the post text.",
    "No hashtags, no quotes, no markdown.",
    "Max 280 characters.",
  );

  return lines.join("\n");
}

async function generateText(
  prompt: string,
  system: string,
  operation: "post" | "reply",
  personalityId?: string,
  postId?: string,
): Promise<string> {
  const openai = getOpenAIClient();
  const model = getTextModel();

  const response = await trackedChatCompletion(
    openai,
    {
      model,
      temperature: 0.9,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    { operation, personalityId, postId },
  );

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
  options?: {
    onStage?: (stage: PostGenerationStage) => void;
    angle?: PostAngle;
    recentPostsToAvoid?: string[];
  },
): Promise<string> {
  options?.onStage?.("research");

  let researchNotes: string | null = null;

  try {
    researchNotes = await researchTopicForPost(topic, personality);
  } catch (error) {
    console.error(
      `Topic research failed for @${personality.handle}, posting without it:`,
      error,
    );
  }

  options?.onStage?.("write");

  return generateText(
    buildPostPrompt(personality, topic, researchNotes, {
      angle: options?.angle,
      recentPostsToAvoid: options?.recentPostsToAvoid,
    }),
    "You write short, specific social media posts for fictional internet personalities.",
    "post",
    personality.id,
  );
}

export async function generateLLMReply(
  personality: Personality,
  targetPost: Parameters<typeof buildReplyPrompt>[1],
  options?: { tone?: ReplyTone; engagementContext?: ReplyEngagementContext },
): Promise<string> {
  return generateText(
    buildReplyPrompt(
      personality,
      targetPost,
      options?.tone,
      options?.engagementContext,
    ),
    "You write short social media replies for fictional internet personalities.",
    "reply",
    personality.id,
    targetPost.id,
  );
}
