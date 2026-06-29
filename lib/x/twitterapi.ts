const X_API_BASE_URL = "https://api.x.com/2";

export type ScrapedTweet = {
  id: string;
  text: string;
  createdAt: Date;
  imageUrls: string[];
};

export class TwitterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TwitterApiError";
    this.status = status;
  }
}

type XApiMedia = {
  media_key?: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
};

type XApiTweet = {
  id?: string;
  text?: string;
  created_at?: string;
  attachments?: {
    media_keys?: string[];
  };
};

type UserTweetsResponse = {
  data?: XApiTweet[];
  includes?: {
    media?: XApiMedia[];
  };
  meta?: {
    next_token?: string;
    result_count?: number;
  };
  errors?: Array<{ detail?: string; title?: string; status?: number }>;
  title?: string;
  detail?: string;
  status?: number;
};

type UserLookupResponse = {
  data?: {
    id?: string;
  };
  errors?: Array<{ detail?: string; title?: string }>;
  title?: string;
  detail?: string;
};

function getBearerToken(): string {
  const token = process.env.X_API_BEARER_TOKEN?.trim();

  if (!token) {
    throw new TwitterApiError(
      "Missing X_API_BEARER_TOKEN. Add your X API bearer token to .env.",
    );
  }

  return token;
}

export function isTwitterApiConfigured(): boolean {
  return Boolean(process.env.X_API_BEARER_TOKEN?.trim());
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

function formatApiError(
  payload: { errors?: Array<{ detail?: string; title?: string }>; title?: string; detail?: string },
  fallback: string,
): string {
  const fromErrors = payload.errors
    ?.map((error) => error.detail ?? error.title)
    .filter(Boolean)
    .join("; ");

  return fromErrors ?? payload.detail ?? payload.title ?? fallback;
}

async function xApiGet<T>(path: string, params?: URLSearchParams): Promise<T> {
  const query = params?.toString();
  const url = `${X_API_BASE_URL}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getBearerToken()}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new TwitterApiError(
      formatApiError(
        payload as UserLookupResponse,
        `X API request failed (${response.status}).`,
      ),
      response.status,
    );
  }

  return payload;
}

async function lookupUserId(screenName: string): Promise<string> {
  const payload = await xApiGet<UserLookupResponse>(
    `/users/by/username/${encodeURIComponent(screenName)}`,
    new URLSearchParams({ "user.fields": "id" }),
  );

  const userId = payload.data?.id?.trim();

  if (!userId) {
    throw new TwitterApiError(`Could not resolve X user id for @${screenName}.`);
  }

  return userId;
}

function buildMediaUrlMap(media: XApiMedia[] | undefined): Map<string, string> {
  const map = new Map<string, string>();

  for (const item of media ?? []) {
    const mediaKey = item.media_key?.trim();

    if (!mediaKey) {
      continue;
    }

    const type = item.type?.toLowerCase();
    const url =
      type === "photo"
        ? item.url?.trim()
        : item.preview_image_url?.trim() ?? item.url?.trim();

    if (url) {
      map.set(mediaKey, url);
    }
  }

  return map;
}

function extractImageUrls(
  tweet: XApiTweet,
  mediaByKey: Map<string, string>,
): string[] {
  const mediaKeys = tweet.attachments?.media_keys ?? [];
  const urls: string[] = [];

  for (const mediaKey of mediaKeys) {
    const url = mediaByKey.get(mediaKey);

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

function parseTweet(
  tweet: XApiTweet,
  mediaByKey: Map<string, string>,
): ScrapedTweet | null {
  const id = tweet.id?.trim();
  const text = tweet.text?.trim();

  if (!id || !text) {
    return null;
  }

  return {
    id,
    text: decodeHtmlEntities(text),
    createdAt:
      typeof tweet.created_at === "string"
        ? new Date(tweet.created_at)
        : new Date(),
    imageUrls: extractImageUrls(tweet, mediaByKey),
  };
}

async function fetchUserTweetsPage(
  userId: string,
  options: { maxResults: number; sinceId?: string | null; paginationToken?: string },
): Promise<UserTweetsResponse> {
  const params = new URLSearchParams({
    max_results: String(Math.max(5, Math.min(options.maxResults, 100))),
    exclude: "replies,retweets",
    "tweet.fields": "created_at,attachments",
    expansions: "attachments.media_keys",
    "media.fields": "url,preview_image_url,type",
  });

  if (options.sinceId) {
    params.set("since_id", options.sinceId);
  }

  if (options.paginationToken) {
    params.set("pagination_token", options.paginationToken);
  }

  return xApiGet<UserTweetsResponse>(`/users/${userId}/tweets`, params);
}

export function pickRandomImageUrl(urls: string[]): string | undefined {
  if (urls.length === 0) {
    return undefined;
  }

  if (urls.length === 1) {
    return urls[0];
  }

  const index = Math.floor(Math.random() * urls.length);
  return urls[index];
}

export async function fetchUserTweets(
  screenName: string,
  options: { limit?: number; sinceId?: string | null } = {},
): Promise<ScrapedTweet[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 40));
  const sinceId = options.sinceId ?? null;
  const userId = await lookupUserId(screenName);
  const tweets: ScrapedTweet[] = [];
  let paginationToken: string | undefined;

  while (tweets.length < limit) {
    const remaining = limit - tweets.length;
    const payload = await fetchUserTweetsPage(userId, {
      maxResults: remaining,
      sinceId: tweets.length === 0 ? sinceId : null,
      paginationToken,
    });
    const pageTweets = payload.data ?? [];
    const mediaByKey = buildMediaUrlMap(payload.includes?.media);

    for (const rawTweet of pageTweets) {
      const tweet = parseTweet(rawTweet, mediaByKey);

      if (!tweet) {
        continue;
      }

      if (sinceId && tweet.id <= sinceId) {
        continue;
      }

      tweets.push(tweet);

      if (tweets.length >= limit) {
        break;
      }
    }

    if (tweets.length >= limit || !payload.meta?.next_token) {
      break;
    }

    paginationToken = payload.meta.next_token;
  }

  tweets.sort((left, right) => right.id.localeCompare(left.id));

  return tweets.slice(0, limit);
}
