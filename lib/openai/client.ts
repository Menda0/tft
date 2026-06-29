import OpenAI from "openai";

export class OpenAIConfigError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "OpenAIConfigError";
    this.details = details;
  }
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIConfigError(
      "Missing OPENAI_API_KEY.",
      "Add OPENAI_API_KEY to .env.local, then restart the dev server.",
    );
  }

  return new OpenAI({ apiKey });
}

export function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4.1-nano";
}

export function getTrendingModel(): string {
  return process.env.OPENAI_TRENDING_MODEL?.trim() || "gpt-4.1-mini";
}

export function getResearchModel(): string {
  return (
    process.env.OPENAI_RESEARCH_MODEL?.trim() ||
    process.env.OPENAI_TRENDING_MODEL?.trim() ||
    "gpt-4.1-mini"
  );
}
