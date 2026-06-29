type TextModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
};

type ImageModelPricing = {
  perImage1024: number;
};

const DEFAULT_TEXT_PRICING: Record<string, TextModelPricing> = {
  "gpt-4.1-nano": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "gpt-4.1": { inputPer1M: 2.0, outputPer1M: 8.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
};

const DEFAULT_IMAGE_PRICING: Record<string, ImageModelPricing> = {
  "gpt-image-1": { perImage1024: 0.04 },
  "gpt-image-2": { perImage1024: 0.04 },
  "gpt-image-1.5": { perImage1024: 0.04 },
  "gpt-image-1-mini": { perImage1024: 0.02 },
  "chatgpt-image-latest": { perImage1024: 0.04 },
  "dall-e-3": { perImage1024: 0.04 },
  "dall-e-2": { perImage1024: 0.02 },
};

const FALLBACK_TEXT: TextModelPricing = { inputPer1M: 0.4, outputPer1M: 1.6 };
const FALLBACK_IMAGE: ImageModelPricing = { perImage1024: 0.04 };

function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase();
}

function getTextPricing(model: string): TextModelPricing {
  const key = normalizeModelKey(model);
  return DEFAULT_TEXT_PRICING[key] ?? FALLBACK_TEXT;
}

function getImagePricing(model: string): ImageModelPricing {
  const key = normalizeModelKey(model);
  return DEFAULT_IMAGE_PRICING[key] ?? FALLBACK_IMAGE;
}

export function estimateTextCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = getTextPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

export function estimateImageCostUsd(model: string, size = "1024x1024"): number {
  const pricing = getImagePricing(model);
  if (size === "512x512") {
    return pricing.perImage1024 * 0.5;
  }
  return pricing.perImage1024;
}
