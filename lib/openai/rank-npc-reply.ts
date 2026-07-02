import { PROJECT_NAME } from "@/lib/brand";
import { getOpenAIClient, getTextModel } from "@/lib/openai/client";
import { trackedChatCompletion } from "@/lib/openai/usage";
import { PostGenerationError } from "@/lib/openai/post";
import { getRankNpcRealName } from "@/lib/personalities/rank-npc";
import type { Post, ReplyTone } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

export type RankNpcReplyTone = ReplyTone;

function normalizeReplyContent(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 280);
}

function tonePromptLine(tone: ReplyTone): string {
  switch (tone) {
    case "strongly_agree":
      return "You strongly agree with this post. Reply with emphatic support while sounding exactly like the real person would.";
    case "agree":
      return "You agree with this post. Reply in support while sounding exactly like the real person would.";
    case "neutral":
      return "You have a neutral reaction to this post. Reply with a balanced take while sounding exactly like the real person would.";
    case "disagree":
      return "You disagree with this post. Push back while sounding exactly like the real person would.";
    case "strongly_disagree":
      return "You strongly disagree with this post. Push back sharply while sounding exactly like the real person would.";
  }
}

function buildRankNpcReplyPrompt(
  npc: Personality,
  targetPost: Post,
  tone: RankNpcReplyTone,
): string {
  const realName = getRankNpcRealName(npc);

  return [
    `You are ${npc.name} (@${npc.handle}), a knock-off parody account.`,
    `You are a parody version of ${realName}.`,
    `Write this reply exactly as ${realName} would — their voice, tone, mannerisms, and worldview — while staying in the knock-off persona.`,
    "",
    `Reply to @${targetPost.author.handle}:`,
    `"${targetPost.content}"`,
    "",
    tonePromptLine(tone),
    "Do not mention that you are AI.",
    "Return only the reply text.",
    "No hashtags, no quotes, no markdown.",
    "Max 280 characters.",
  ].join("\n");
}

export async function generateRankNpcReply(
  npc: Personality,
  targetPost: Post,
  tone: RankNpcReplyTone,
): Promise<string> {
  const openai = getOpenAIClient();
  const model = getTextModel();

  const response = await trackedChatCompletion(
    openai,
    {
      model,
      temperature: 0.95,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "You write short social media replies for knock-off celebrity parody accounts. Capture the real celebrity's voice faithfully.",
        },
        {
          role: "user",
          content: buildRankNpcReplyPrompt(npc, targetPost, tone),
        },
      ],
    },
    {
      operation: "rank_npc_reply",
      personalityId: npc.id,
      postId: targetPost.id,
    },
  );

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new PostGenerationError(
      "OpenAI did not return rank NPC reply content.",
      `Model ${model} returned an empty response.`,
    );
  }

  return normalizeReplyContent(content);
}
