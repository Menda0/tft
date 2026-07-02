import { getOpenAIClient, getTrendingModel } from "@/lib/openai/client";
import { trackedResponsesCreate } from "@/lib/openai/usage";

const TRENDING_TOPIC_COUNT = 5;

const FALLBACK_TOPICS = [
  "Congress debating new AI regulation after a major lab announces a powerful model with weak safety guardrails",
  "Viral meme format taking over social feeds as celebrities and brands pile on with their own versions",
  "Underdog sports team forcing a decisive playoff game after a last-minute comeback shocks fans",
  "Tech company unveiling its latest phone while users argue online over price hikes and missing features",
  "Streaming platform canceling a hit show after backlash over its season finale cliffhanger",
];

export class TrendingTopicsError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "TrendingTopicsError";
    this.details = details;
  }
}

function normalizeTopicLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function topicFromParsedItem(item: unknown): string | null {
  if (typeof item === "string") {
    const topic = normalizeTopicLabel(item);
    return topic || null;
  }

  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const candidate =
      record.topic ?? record.title ?? record.headline ?? record.label;

    if (typeof candidate === "string") {
      const topic = normalizeTopicLabel(candidate);
      return topic || null;
    }
  }

  return null;
}

function parseTopicsFromText(text: string): string[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;

      if (Array.isArray(parsed)) {
        return parsed
          .map(topicFromParsedItem)
          .filter((topic): topic is string => Boolean(topic))
          .slice(0, TRENDING_TOPIC_COUNT);
      }
    } catch {
      // fall through to line parsing
    }
  }

  return text
    .split("\n")
    .map((line) => line.replace(/^[\d\-*.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, TRENDING_TOPIC_COUNT);
}

function buildTrendingTopicsPrompt(): string {
  return [
    "Search the web for what is trending today across news, culture, tech, sports, entertainment, and memes.",
    `Return exactly ${TRENDING_TOPIC_COUNT} topics as a JSON array of strings.`,
    "Each topic must be detailed and specific: name the event, people, product, or controversy involved.",
    "Write 1-2 sentences per topic (about 15-35 words), with enough context that someone could post about it without guessing.",
    "Cover different areas if possible. Do not use generic labels like 'AI news' or 'sports'.",
    "Return only the JSON array, no markdown or commentary.",
  ].join(" ");
}

export async function fetchTrendingTopics(): Promise<string[]> {
  const openai = getOpenAIClient();
  const model = getTrendingModel();

  const response = await trackedResponsesCreate(
    openai,
    {
      model,
      tool_choice: "required",
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "user",
          content: buildTrendingTopicsPrompt(),
        },
      ],
    },
    { operation: "trending" },
  );

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

export function getTrendingTopicCount(): number {
  return TRENDING_TOPIC_COUNT;
}
