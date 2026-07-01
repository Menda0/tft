import type { Personality } from "@/lib/types/personality";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type CatalogPersonalityListItem = Personality & {
  openSeaUrl: string | null;
};

export type CatalogMintPrepareData = {
  contractAddress: string;
  chainId: number;
  mintFee: string;
  metadataUri: string;
  personalityId: string;
  mintToAddress: string;
  abi: readonly unknown[];
  functionName: "mint";
};

export async function listCatalogPersonalitiesRequest(
  token: string,
): Promise<
  | { ok: true; personalities: CatalogPersonalityListItem[] }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/personalities/catalog", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as {
    personalities?: CatalogPersonalityListItem[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load catalog." };
  }

  return { ok: true, personalities: data.personalities ?? [] };
}

export async function createCatalogPersonalityRequest(
  token: string,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; personality: CatalogPersonalityListItem }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/personalities/catalog", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    personality?: CatalogPersonalityListItem;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not create personality." };
  }

  if (!data.personality) {
    return { ok: false, error: "Invalid response." };
  }

  return { ok: true, personality: data.personality };
}

export async function generateCatalogAvatarRequest(
  token: string,
  personalityId: string,
): Promise<
  | { ok: true; personality: Personality }
  | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/admin/personalities/catalog/${personalityId}/avatar`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  const data = (await response.json()) as {
    personality?: Personality;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not generate avatar." };
  }

  if (!data.personality) {
    return { ok: false, error: "Invalid response." };
  }

  return { ok: true, personality: data.personality };
}

export async function prepareCatalogMintRequest(
  token: string,
  personalityId: string,
): Promise<
  | { ok: true; data: CatalogMintPrepareData }
  | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/admin/personalities/catalog/${personalityId}/mint/prepare`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  const data = (await response.json()) as CatalogMintPrepareData & {
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not prepare mint." };
  }

  return { ok: true, data };
}

export async function confirmCatalogMintRequest(
  token: string,
  personalityId: string,
  txHash: string,
): Promise<
  | { ok: true; personality: Personality; openSeaUrl: string | null }
  | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/admin/personalities/catalog/${personalityId}/mint/confirm`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ txHash }),
    },
  );
  const data = (await response.json()) as {
    personality?: Personality;
    openSeaUrl?: string | null;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not confirm mint." };
  }

  if (!data.personality) {
    return { ok: false, error: "Invalid response." };
  }

  return {
    ok: true,
    personality: data.personality,
    openSeaUrl: data.openSeaUrl ?? null,
  };
}
