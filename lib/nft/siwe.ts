import { generateNonce, SiweMessage } from "siwe";

import { getDefaultChainId, getSiteUrl } from "@/lib/nft/config";

const NONCE_TTL_MS = 10 * 60 * 1000;
const nonceStore = new Map<string, number>();

export function createSiweNonce(address: string): string {
  const nonce = generateNonce();
  nonceStore.set(`${address.toLowerCase()}:${nonce}`, Date.now() + NONCE_TTL_MS);
  return nonce;
}

function consumeNonce(address: string, nonce: string): boolean {
  const key = `${address.toLowerCase()}:${nonce}`;
  const expiresAt = nonceStore.get(key);
  nonceStore.delete(key);

  if (!expiresAt || Date.now() > expiresAt) {
    return false;
  }

  return true;
}

export type VerifySiweInput = {
  message: string;
  signature: string;
};

export async function verifySiweMessage(
  input: VerifySiweInput,
): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  try {
    const siweMessage = new SiweMessage(input.message);
    const fields = await siweMessage.verify({
      signature: input.signature,
      domain: new URL(getSiteUrl()).host,
    });

    if (!consumeNonce(fields.data.address, fields.data.nonce)) {
      return { ok: false, error: "Invalid or expired sign-in nonce." };
    }

    const chainId = getDefaultChainId();
    if (fields.data.chainId !== chainId) {
      return {
        ok: false,
        error: `Wallet must be on chain ${chainId}.`,
      };
    }

    return { ok: true, address: fields.data.address };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify wallet signature.";
    return { ok: false, error: message };
  }
}

export function buildSiweMessage(address: string, nonce: string): SiweMessage {
  return new SiweMessage({
    domain: new URL(getSiteUrl()).host,
    address,
    statement: "Link your wallet to your Troll Farm Tycoon account.",
    uri: getSiteUrl(),
    version: "1",
    chainId: getDefaultChainId(),
    nonce,
  });
}
