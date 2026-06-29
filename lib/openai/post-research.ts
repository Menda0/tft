import { getOpenAIClient, getResearchModel } from "@/lib/openai/client";
import { trackedResponsesCreate } from "@/lib/openai/usage";
import { formatPersonalityVoiceLabel } from "@/lib/personalities/kind-archetypes";
import type { Personality } from "@/lib/types/personality";

const MAX_RESEARCH_CHARS = 900;

function buildResearchPrompt(topic: string, personality: Personality): string {
  const interests =
    personality.interests.length > 0
      ? personality.interests.join(", ")
      : "social media";

  return [
    `Search the web for current, specific details about this topic: ${topic}`,
    `You are researching for ${personality.name}, a ${formatPersonalityVoiceLabel(personality.kind, personality.archetype)} account interested in ${interests}.`,
    "Find concrete facts: names, places, numbers, recent quotes, controversies, and what people are arguing about.",
    "Return 4-6 short bullet points with the most post-worthy details.",
    "Plain text only. No markdown. No preamble.",
  ].join(" ");
}

function normalizeResearch(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_RESEARCH_CHARS);
}

export async function researchTopicForPost(
  topic: string,
  personality: Personality,
): Promise<string | null> {
  const openai = getOpenAIClient();
  const model = getResearchModel();

  const response = await trackedResponsesCreate(
    openai,
    {
      model,
      tool_choice: "required",
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "user",
          content: buildResearchPrompt(topic, personality),
        },
      ],
    },
    { operation: "post_research", personalityId: personality.id },
  );

  const text = response.output_text?.trim();

  if (!text) {
    return null;
  }

  return normalizeResearch(text);
}
