import { getOpenAIClient, getTrendingModel } from "@/lib/openai/client";

const FALLBACK_TOPICS = [
  "AI regulation",
  "viral memes",
  "sports playoffs",
  "celebrity drama",
  "climate news",
  "new phone launch",
  "indie games",
  "food trends",
  "space exploration",
  "internet discourse",
];

export class TrendingTopicsError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "TrendingTopicsError";
    this.details = details;
  }
}

function parseTopicsFromText(text: string): string[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;

      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 10);
      }
    } catch {
      // fall through to line parsing
    }
  }

  return text
    .split("\n")
    .map((line) => line.replace(/^[\d\-*.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

export async function fetchTrendingTopics(): Promise<string[]> {
  const openai = getOpenAIClient();
  const model = getTrendingModel();

  const response = await openai.responses.create({
    model,
    tool_choice: "required",
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "user",
        content: [
          "Search the web for what is trending today across news, culture, tech, sports, and memes.",
          "Return exactly 10 short topic labels as a JSON array of strings.",
          "Each topic should be 2-6 words, suitable as a social media post subject.",
          "Return only the JSON array, no markdown or commentary.",
        ].join(" "),
      },
    ],
  });

  const text = response.output_text?.trim();

  if (!text) {
    throw new TrendingTopicsError(
      "OpenAI did not return trending topics.",
      `Model ${model} returned an empty response.`,
    );
  }

  const topics = parseTopicsFromText(text);

  if (topics.length === 0) {
    throw new TrendingTopicsError(
      "Could not parse trending topics.",
      `Model ${model} returned unparseable content.`,
    );
  }

  return topics;
}

export function getFallbackTrendingTopics(): string[] {
  return [...FALLBACK_TOPICS];
}
