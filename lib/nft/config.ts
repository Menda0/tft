import { base, baseSepolia } from "viem/chains";

export const SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export function getDefaultChainId(): number {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : base.id;
  return Number.isFinite(parsed) ? parsed : base.id;
}

export function getNftContractAddress(): `0x${string}` | null {
  const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null;
  }
  return address as `0x${string}`;
}

export function getRpcUrl(chainId: number): string {
  if (chainId === baseSepolia.id) {
    return (
      process.env.BASE_SEPOLIA_RPC_URL?.trim() ||
      process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ||
      baseSepolia.rpcUrls.default.http[0]!
    );
  }

  return (
    process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ||
    process.env.BASE_RPC_URL?.trim() ||
    base.rpcUrls.default.http[0]!
  );
}

export function getTreasuryAddress(): `0x${string}` | null {
  const address = process.env.NFT_TREASURY_ADDRESS?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null;
  }
  return address as `0x${string}`;
}

export function getRoyaltyBps(): number {
  const raw = process.env.NFT_ROYALTY_BPS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 500;
  return Number.isFinite(parsed) ? parsed : 500;
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getOpenSeaAssetUrl(
  chainId: number,
  contractAddress: string,
  tokenId: string,
): string {
  const network = chainId === baseSepolia.id ? "base-sepolia" : "base";
  return `https://opensea.io/assets/${network}/${contractAddress}/${tokenId}`;
}

export function isNftEnabled(): boolean {
  return getNftContractAddress() !== null;
}
