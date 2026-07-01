import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  type Hash,
} from "viem";
import { base, baseSepolia } from "viem/chains";

import { TROLL_FARM_TYCOON_NFT_ABI } from "@/lib/nft/contract";
import {
  getDefaultChainId,
  getNftContractAddress,
  getRpcUrl,
} from "@/lib/nft/config";

function chainForId(chainId: number) {
  return chainId === baseSepolia.id ? baseSepolia : base;
}

export function getPublicClient(chainId = getDefaultChainId()) {
  return createPublicClient({
    chain: chainForId(chainId),
    transport: http(getRpcUrl(chainId)),
  });
}

export function normalizeWalletAddress(address: string): `0x${string}` {
  return getAddress(address);
}

export async function readMintFee(chainId?: number): Promise<bigint> {
  const contractAddress = getNftContractAddress();
  if (!contractAddress) {
    return BigInt(0);
  }

  const client = getPublicClient(chainId ?? getDefaultChainId());
  return client.readContract({
    address: contractAddress,
    abi: TROLL_FARM_TYCOON_NFT_ABI,
    functionName: "mintFee",
  });
}

export async function readTokenOwner(
  tokenId: string,
  chainId?: number,
): Promise<`0x${string}` | null> {
  const contractAddress = getNftContractAddress();
  if (!contractAddress) {
    return null;
  }

  try {
    const client = getPublicClient(chainId ?? getDefaultChainId());
    return await client.readContract({
      address: contractAddress,
      abi: TROLL_FARM_TYCOON_NFT_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    });
  } catch {
    return null;
  }
}

export async function readPersonalityIdForToken(
  tokenId: string,
  chainId?: number,
): Promise<string | null> {
  const contractAddress = getNftContractAddress();
  if (!contractAddress) {
    return null;
  }

  try {
    const client = getPublicClient(chainId ?? getDefaultChainId());
    const personalityId = await client.readContract({
      address: contractAddress,
      abi: TROLL_FARM_TYCOON_NFT_ABI,
      functionName: "personalityIdOf",
      args: [BigInt(tokenId)],
    });
    return personalityId || null;
  } catch {
    return null;
  }
}

export async function readTokenIdForPersonality(
  personalityId: string,
  chainId?: number,
): Promise<string | null> {
  const contractAddress = getNftContractAddress();
  if (!contractAddress) {
    return null;
  }

  try {
    const client = getPublicClient(chainId ?? getDefaultChainId());
    const tokenId = await client.readContract({
      address: contractAddress,
      abi: TROLL_FARM_TYCOON_NFT_ABI,
      functionName: "tokenIdOfPersonality",
      args: [personalityId],
    });
    if (tokenId === BigInt(0)) {
      return null;
    }
    return tokenId.toString();
  } catch {
    return null;
  }
}

export type MintReceipt = {
  tokenId: string;
  personalityId: string;
  ownerAddress: `0x${string}`;
  metadataUri: string;
};

export async function verifyMintTransaction(
  txHash: Hash,
  expectedPersonalityId: string,
  chainId: number = getDefaultChainId(),
): Promise<MintReceipt | null> {
  const contractAddress = getNftContractAddress();
  if (!contractAddress) {
    return null;
  }

  const client = getPublicClient(chainId);
  const receipt = await client.getTransactionReceipt({ hash: txHash });

  if (receipt.status !== "success") {
    return null;
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: TROLL_FARM_TYCOON_NFT_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "PersonalityMinted") {
        const { tokenId, personalityId, to, tokenURI } = decoded.args as {
          tokenId: bigint;
          personalityId: string;
          to: `0x${string}`;
          tokenURI: string;
        };

        if (personalityId !== expectedPersonalityId) {
          return null;
        }

        return {
          tokenId: tokenId.toString(),
          personalityId,
          ownerAddress: normalizeWalletAddress(to),
          metadataUri: tokenURI,
        };
      }
    } catch {
      // not our event
    }
  }

  return null;
}

export async function walletOwnsToken(
  walletAddress: string,
  tokenId: string,
  chainId?: number,
): Promise<boolean> {
  const owner = await readTokenOwner(tokenId, chainId);
  if (!owner) {
    return false;
  }

  return (
    normalizeWalletAddress(walletAddress).toLowerCase() === owner.toLowerCase()
  );
}
