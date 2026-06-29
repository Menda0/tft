const TWITTERAPI_IO_BASE_URL = "https://api.twitterapi.io";

export type ScrapedTweet = {
  id: string;
  text: string;
  createdAt: Date;
};

export class TwitterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TwitterApiError";
    this.status = status;
  }
}

type TwitterApiTweet = {
  id?: string;
  text?: string;
  createdAt?: string;
  isReply?: boolean;
  retweeted_tweet?: unknown;
};

type LastTweetsResponse = {
  status?: string;
  code?: number;
  msg?: string;
  data?: {
    tweets?: TwitterApiTweet[];
  };
  has_next_page?: boolean;
  next_cursor?: string;
};

function getApiKey(): string {
  const apiKey = process.env.TWITTERAPI_IO_API_KEY?.trim();

  if (!apiKey) {
    throw new TwitterApiError(
      "Missing TWITTERAPI_IO_API_KEY. Get one at https://twitterapi.io/",
    );
  }

  return apiKey;
}

export function isTwitterApiConfigured(): boolean {
  return Boolean(process.env.TWITTERAPI_IO_API_KEY?.trim());
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function truncateTweetText(text: string, maxLength = 280): string {
  const normalized = decodeHtmlEntities(text).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function isOriginalTweet(tweet: TwitterApiTweet): boolean {
  if (tweet.isReply) {
    return false;
  }

  if (tweet.retweeted_tweet) {
    return false;
  }

  return Boolean(tweet.id && tweet.text?.trim());
}

function parseTweet(tweet: TwitterApiTweet): ScrapedTweet | null {
  if (!isOriginalTweet(tweet) || !tweet.id || !tweet.text) {
    return null;
  }

  return {
    id: tweet.id,
    text: decodeHtmlEntities(tweet.text).trim(),
    createdAt:
      typeof tweet.createdAt === "string"
        ? new Date(tweet.createdAt)
        : new Date(),
  };
}

async function fetchLastTweetsPage(
  screenName: string,
  cursor?: string,
): Promise<LastTweetsResponse> {
  const params = new URLSearchParams({ userName: screenName });

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(
    `${TWITTERAPI_IO_BASE_URL}/twitter/user/last_tweets?${params.toString()}`,
    {
      headers: {
        "X-API-Key": getApiKey(),
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as LastTweetsResponse & {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new TwitterApiError(
      payload.msg ??
        payload.message ??
        payload.error ??
        `TwitterAPI.io request failed (${response.status}).`,
      response.status,
    );
  }

  if (payload.status !== "success" || payload.code !== 0) {
    throw new TwitterApiError(
      payload.msg ?? "TwitterAPI.io returned an unexpected response.",
    );
  }

  return payload;
}

export async function fetchUserTweets(
  screenName: string,
  options: { limit?: number; sinceId?: string | null } = {},
): Promise<ScrapedTweet[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 40));
  const sinceId = options.sinceId ?? null;
  const tweets: ScrapedTweet[] = [];
  let cursor: string | undefined;

  while (tweets.length < limit) {
    const payload = await fetchLastTweetsPage(screenName, cursor);
    const pageTweets = payload.data?.tweets ?? [];
    let reachedOlderTweets = false;

    for (const rawTweet of pageTweets) {
      const tweet = parseTweet(rawTweet);

      if (!tweet) {
        continue;
      }

      if (sinceId && tweet.id <= sinceId) {
        reachedOlderTweets = true;
        continue;
      }

      tweets.push(tweet);

      if (tweets.length >= limit) {
        break;
      }
    }

    if (tweets.length >= limit || reachedOlderTweets || !payload.has_next_page) {
      break;
    }

    if (!payload.next_cursor) {
      break;
    }

    cursor = payload.next_cursor;
  }

  tweets.sort((left, right) => right.id.localeCompare(left.id));

  return tweets.slice(0, limit);
}
