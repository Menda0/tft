import type OpenAI from "openai";

import { insertAiUsageEvent } from "@/lib/db/ai-usage";
import {
  estimateImageCostUsd,
  estimateTextCostUsd,
} from "@/lib/openai/pricing";
import type { AiOperation } from "@/lib/types/ai-usage";

export type AiUsageMetadata = {
  operation: AiOperation;
  personalityId?: string;
  postId?: string;
};

function recordUsage(
  input: {
    operation: AiOperation;
    model: string;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    personalityId?: string;
    postId?: string;
  },
): void {
  const totalTokens = input.promptTokens + input.completionTokens;

  void insertAiUsageEvent({
    operation: input.operation,
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens,
    estimatedCostUsd: input.estimatedCostUsd,
    personalityId: input.personalityId,
    postId: input.postId,
  }).catch((error) => {
    console.warn("Failed to record AI usage event:", error);
  });
}

export async function trackedChatCompletion(
  openai: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  meta: AiUsageMetadata,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const response = await openai.chat.completions.create(params);
  const usage = response.usage;

  recordUsage({
    operation: meta.operation,
    model: params.model,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    estimatedCostUsd: estimateTextCostUsd(
      params.model,
      usage?.prompt_tokens ?? 0,
      usage?.completion_tokens ?? 0,
    ),
    personalityId: meta.personalityId,
    postId: meta.postId,
  });

  return response;
}

export async function trackedResponsesCreate(
  openai: OpenAI,
  params: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  meta: AiUsageMetadata,
): Promise<OpenAI.Responses.Response> {
  const response = await openai.responses.create(params);
  const usage = response.usage;
  const model = params.model ?? "unknown";

  recordUsage({
    operation: meta.operation,
    model,
    promptTokens: usage?.input_tokens ?? 0,
    completionTokens: usage?.output_tokens ?? 0,
    estimatedCostUsd: estimateTextCostUsd(
      model,
      usage?.input_tokens ?? 0,
      usage?.output_tokens ?? 0,
    ),
    personalityId: meta.personalityId,
    postId: meta.postId,
  });

  return response;
}

export async function trackedImageGenerate(
  openai: OpenAI,
  params: OpenAI.Images.ImageGenerateParamsNonStreaming,
  meta: AiUsageMetadata,
): Promise<OpenAI.Images.ImagesResponse> {
  const response = await openai.images.generate(params);
  const size = typeof params.size === "string" ? params.size : "1024x1024";
  const imageCount = params.n ?? 1;
  const model = params.model ?? "unknown";

  recordUsage({
    operation: meta.operation,
    model,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: estimateImageCostUsd(model, size) * imageCount,
    personalityId: meta.personalityId,
    postId: meta.postId,
  });

  return response;
}

export async function trackedModeration(
  openai: OpenAI,
  params: OpenAI.Moderations.ModerationCreateParams,
  meta: AiUsageMetadata,
): Promise<OpenAI.Moderations.ModerationCreateResponse> {
  const response = await openai.moderations.create(params);
  const model =
    typeof params.model === "string" ? params.model : "omni-moderation-latest";

  recordUsage({
    operation: meta.operation,
    model,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    personalityId: meta.personalityId,
    postId: meta.postId,
  });

  return response;
}
