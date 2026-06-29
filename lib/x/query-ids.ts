import { X_USER_AGENT } from "@/lib/x/constants";

type QueryIdCache = {
  fetchedAt: number;
  ids: Map<string, string>;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cache: QueryIdCache | null = null;

async function fetchMainBundleSource(): Promise<string> {
  const response = await fetch("https://x.com", {
    headers: {
      "user-agent": X_USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load x.com homepage (${response.status}).`);
  }

  const html = await response.text();
  const bundleMatch = html.match(
    /https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main\.[a-z0-9]+\.js/,
  );

  if (!bundleMatch) {
    throw new Error("Could not find X main JavaScript bundle URL.");
  }

  const bundleResponse = await fetch(bundleMatch[0], {
    headers: { "user-agent": X_USER_AGENT },
  });

  if (!bundleResponse.ok) {
    throw new Error(`Failed to load X main bundle (${bundleResponse.status}).`);
  }

  return bundleResponse.text();
}

function extractQueryIds(source: string): Map<string, string> {
  const ids = new Map<string, string>();
  const pattern =
    /queryId:"([^"]+)",operationName:"([^"]+)"|operationName:"([^"]+)",queryId:"([^"]+)"/g;

  for (const match of source.matchAll(pattern)) {
    const queryId = match[1] ?? match[4];
    const operationName = match[2] ?? match[3];

    if (queryId && operationName) {
      ids.set(operationName, queryId);
    }
  }

  return ids;
}

async function refreshQueryIdCache(): Promise<QueryIdCache> {
  const source = await fetchMainBundleSource();
  const ids = extractQueryIds(source);

  if (ids.size === 0) {
    throw new Error("Could not discover any X GraphQL query IDs.");
  }

  cache = {
    fetchedAt: Date.now(),
    ids,
  };

  return cache;
}

export async function getQueryId(operationName: string): Promise<string> {
  const now = Date.now();

  if (!cache || now - cache.fetchedAt > CACHE_TTL_MS) {
    await refreshQueryIdCache();
  }

  const queryId = cache?.ids.get(operationName);

  if (!queryId) {
    await refreshQueryIdCache();
  }

  const refreshedId = cache?.ids.get(operationName);

  if (!refreshedId) {
    throw new Error(`Could not find GraphQL query ID for ${operationName}.`);
  }

  return refreshedId;
}

export function getQueryIdCacheAgeMs(): number | null {
  if (!cache) {
    return null;
  }

  return Date.now() - cache.fetchedAt;
}
