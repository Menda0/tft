import {
  USER_BY_SCREEN_NAME_FEATURES,
  USER_TWEETS_FEATURES,
  X_BEARER_TOKEN,
  X_GRAPHQL_URL,
  X_USER_AGENT,
} from "@/lib/x/constants";
import { getQueryId } from "@/lib/x/query-ids";

export type ScrapedTweet = {
  id: string;
  text: string;
  createdAt: Date;
};

export class XScraperError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "XScraperError";
    this.status = status;
  }
}

function getSyncDelayMs(): number {
  const raw = process.env.X_SYNC_DELAY_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 2000;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthConfig(): { authToken: string; ct0: string } {
  const authToken = process.env.X_AUTH_TOKEN?.trim();
  const ct0 = process.env.X_CT0?.trim();

  if (!authToken || !ct0) {
    throw new XScraperError(
      "Missing X_AUTH_TOKEN or X_CT0. Log into x.com and copy auth_token + ct0 cookies.",
    );
  }

  return { authToken, ct0 };
}

export function isXAuthConfigured(): boolean {
  return Boolean(process.env.X_AUTH_TOKEN?.trim() && process.env.X_CT0?.trim());
}

function buildHeaders(ct0: string, authToken: string): HeadersInit {
  return {
    authorization: `Bearer ${X_BEARER_TOKEN}`,
    cookie: `auth_token=${authToken}; ct0=${ct0}`,
    "x-csrf-token": ct0,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "user-agent": X_USER_AGENT,
    accept: "*/*",
    "content-type": "application/json",
  };
}

async function graphqlGet(
  operationName: string,
  variables: Record<string, unknown>,
  features: Record<string, boolean>,
): Promise<unknown> {
  const queryId = await getQueryId(operationName);
  const { authToken, ct0 } = getAuthConfig();
  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(features),
  });
  const url = `${X_GRAPHQL_URL}/${queryId}/${operationName}?${params.toString()}`;

  const response = await fetch(url, {
    headers: buildHeaders(ct0, authToken),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new XScraperError(
        "X cookies expired or invalid. Refresh X_AUTH_TOKEN and X_CT0.",
        response.status,
      );
    }

    throw new XScraperError(
      `X GraphQL ${operationName} failed (${response.status}).`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new XScraperError(
      payload.errors.map((error) => error.message).filter(Boolean).join("; ") ||
        `X GraphQL ${operationName} returned errors.`,
    );
  }

  return payload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getNested(root: unknown, path: string[]): unknown {
  let current: unknown = root;

  for (const key of path) {
    const record = asRecord(current);
    if (!record) {
      return undefined;
    }
    current = record[key];
  }

  return current;
}

function extractTweetText(result: Record<string, unknown>): string {
  const legacy = asRecord(result.legacy);
  const noteTweet = asRecord(result.note_tweet);
  const noteResults = asRecord(noteTweet?.note_tweet_results);
  const noteResult = asRecord(noteResults?.result);
  const noteText =
    typeof noteResult?.text === "string" ? noteResult.text.trim() : "";

  if (noteText) {
    return noteText;
  }

  return typeof legacy?.full_text === "string" ? legacy.full_text.trim() : "";
}

function parseTweetResult(result: unknown): ScrapedTweet | null {
  const record = asRecord(result);

  if (!record || record.__typename !== "Tweet") {
    return null;
  }

  const legacy = asRecord(record.legacy);

  if (!legacy) {
    return null;
  }

  if (legacy.retweeted_status_result || legacy.in_reply_to_status_id_str) {
    return null;
  }

  const id =
    typeof legacy.id_str === "string"
      ? legacy.id_str
      : typeof record.rest_id === "string"
        ? record.rest_id
        : null;

  if (!id) {
    return null;
  }

  const text = extractTweetText(record);

  if (!text) {
    return null;
  }

  const createdAtRaw = legacy.created_at;

  return {
    id,
    text,
    createdAt:
      typeof createdAtRaw === "string" ? new Date(createdAtRaw) : new Date(),
  };
}

function parseTimelineEntry(entry: unknown): ScrapedTweet | null {
  const record = asRecord(entry);
  const content = asRecord(record?.content);
  const itemContent = asRecord(content?.itemContent);
  const tweetResults = asRecord(itemContent?.tweet_results);
  return parseTweetResult(tweetResults?.result);
}

function collectTweetsDeep(payload: unknown): ScrapedTweet[] {
  const tweets: ScrapedTweet[] = [];
  const seen = new Set<string>();

  function visit(value: unknown): void {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    const tweet = parseTweetResult(record);

    if (tweet && !seen.has(tweet.id)) {
      seen.add(tweet.id);
      tweets.push(tweet);
    }

    for (const nested of Object.values(record)) {
      visit(nested);
    }
  }

  visit(payload);
  return tweets;
}

function extractTweetsFromTimeline(payload: unknown): ScrapedTweet[] {
  const instructions =
    getNested(payload, [
      "data",
      "user",
      "result",
      "timeline_v2",
      "timeline",
      "instructions",
    ]) ??
    getNested(payload, [
      "data",
      "user",
      "result",
      "timeline",
      "timeline",
      "instructions",
    ]);

  if (!Array.isArray(instructions)) {
    return collectTweetsDeep(payload);
  }

  const tweets: ScrapedTweet[] = [];

  for (const instruction of instructions) {
    const instructionRecord = asRecord(instruction);

    if (instructionRecord?.type !== "TimelineAddEntries") {
      continue;
    }

    const entries = instructionRecord.entries;

    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      const tweet = parseTimelineEntry(entry);

      if (tweet) {
        tweets.push(tweet);
      }
    }
  }

  if (tweets.length === 0) {
    return collectTweetsDeep(payload);
  }

  return tweets;
}

export async function lookupUserId(screenName: string): Promise<string> {
  const payload = await graphqlGet(
    "UserByScreenName",
    {
      screen_name: screenName,
      withSafetyModeUserFields: true,
    },
    USER_BY_SCREEN_NAME_FEATURES,
  );

  const userId = getNested(payload, [
    "data",
    "user",
    "result",
    "rest_id",
  ]);

  if (typeof userId !== "string" || !userId) {
    throw new XScraperError(`Could not resolve X user id for @${screenName}.`);
  }

  return userId;
}

export async function fetchUserTweets(
  screenName: string,
  options: { limit?: number; sinceId?: string | null } = {},
): Promise<ScrapedTweet[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 40));
  const userId = await lookupUserId(screenName);

  await sleep(getSyncDelayMs());

  const payload = await graphqlGet(
    "UserTweets",
    {
      userId,
      count: limit,
      includePromotedContent: true,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
    },
    USER_TWEETS_FEATURES,
  );

  let tweets = extractTweetsFromTimeline(payload);

  if (options.sinceId) {
    const sinceId = options.sinceId;
    tweets = tweets.filter((tweet) => tweet.id > sinceId);
  }

  tweets.sort((a, b) => b.id.localeCompare(a.id));

  return tweets.slice(0, limit);
}

export function truncateTweetText(text: string, maxLength = 280): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
