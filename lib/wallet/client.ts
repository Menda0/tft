import type { LinkedWallet } from "@/lib/db/users";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type WalletNftItem = {
  personalityId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  tokenId: string | null;
  importedViaNft: boolean;
  openSeaUrl: string | null;
};

export async function fetchWalletNonce(
  token: string,
  address: string,
): Promise<{ ok: true; nonce: string } | { ok: false; error: string }> {
  const response = await fetch(
    `/api/wallets/nonce?address=${encodeURIComponent(address)}`,
    { headers: authHeaders(token) },
  );
  const data = (await response.json()) as { nonce?: string; error?: string };

  if (!response.ok || !data.nonce) {
    return { ok: false, error: data.error ?? "Could not get wallet nonce." };
  }

  return { ok: true, nonce: data.nonce };
}

export async function linkWalletRequest(
  token: string,
  message: string,
  signature: string,
): Promise<
  { ok: true; wallets: LinkedWallet[] } | { ok: false; error: string }
> {
  const response = await fetch("/api/wallets/link", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message, signature }),
  });
  const data = (await response.json()) as {
    wallets?: LinkedWallet[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not link wallet." };
  }

  return { ok: true, wallets: data.wallets ?? [] };
}

export async function listLinkedWalletsRequest(
  token: string,
): Promise<
  { ok: true; wallets: LinkedWallet[] } | { ok: false; error: string }
> {
  const response = await fetch("/api/wallets", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as {
    wallets?: LinkedWallet[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load wallets." };
  }

  return { ok: true, wallets: data.wallets ?? [] };
}

export async function unlinkWalletRequest(
  token: string,
  address: string,
): Promise<
  { ok: true; wallets: LinkedWallet[] } | { ok: false; error: string }
> {
  const response = await fetch("/api/wallets", {
    method: "DELETE",
    headers: authHeaders(token),
    body: JSON.stringify({ address }),
  });
  const data = (await response.json()) as {
    wallets?: LinkedWallet[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not unlink wallet." };
  }

  return { ok: true, wallets: data.wallets ?? [] };
}

export type MintPrepareResponse = {
  contractAddress: string;
  chainId: number;
  mintFee: string;
  metadataUri: string;
  personalityId: string;
};

export async function prepareMintRequest(
  token: string,
  personalityId: string,
): Promise<
  { ok: true; data: MintPrepareResponse } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/personalities/${personalityId}/mint/prepare`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  const data = (await response.json()) as MintPrepareResponse & {
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not prepare mint." };
  }

  return { ok: true, data };
}

export async function confirmMintRequest(
  token: string,
  personalityId: string,
  txHash: string,
): Promise<
  | { ok: true; openSeaUrl: string | null }
  | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/personalities/${personalityId}/mint/confirm`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ txHash }),
    },
  );
  const data = (await response.json()) as {
    openSeaUrl?: string | null;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not confirm mint." };
  }

  return { ok: true, openSeaUrl: data.openSeaUrl ?? null };
}

export async function importNftRequest(
  token: string,
  tokenId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/personalities/import", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ tokenId }),
  });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not import NFT." };
  }

  return { ok: true };
}

export async function listWalletNftsRequest(
  token: string,
): Promise<
  | {
      ok: true;
      enabled: boolean;
      nfts: WalletNftItem[];
      mintFee: string;
    }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/wallets/nfts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as {
    enabled?: boolean;
    nfts?: WalletNftItem[];
    mintFee?: string;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load wallet NFTs." };
  }

  return {
    ok: true,
    enabled: data.enabled ?? false,
    nfts: data.nfts ?? [],
    mintFee: data.mintFee ?? "0",
  };
}
