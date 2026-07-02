const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "also",
  "because",
  "been",
  "being",
  "could",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "most",
  "really",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "very",
  "what",
  "when",
  "with",
  "would",
]);

export const POST_DUPLICATE_SIMILARITY_THRESHOLD = 0.72;
export const POST_GENERATION_MAX_ATTEMPTS = 3;

export function normalizePostContentForComparison(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTokens(content: string): Set<string> {
  return new Set(
    normalizePostContentForComparison(content)
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );
}

export function postContentSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizePostContentForComparison(left);
  const normalizedRight = normalizePostContentForComparison(right);

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const leftTokens = contentTokens(left);
  const rightTokens = contentTokens(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return normalizedLeft === normalizedRight ? 1 : 0;
  }

  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return overlap / unionSize;
}

export function postsAreTooSimilar(
  left: string,
  right: string,
  threshold = POST_DUPLICATE_SIMILARITY_THRESHOLD,
): boolean {
  return postContentSimilarity(left, right) >= threshold;
}

export function findTooSimilarPost(
  candidate: string,
  existingPosts: string[],
  threshold = POST_DUPLICATE_SIMILARITY_THRESHOLD,
): string | null {
  for (const existing of existingPosts) {
    if (postsAreTooSimilar(candidate, existing, threshold)) {
      return existing;
    }
  }

  return null;
}
