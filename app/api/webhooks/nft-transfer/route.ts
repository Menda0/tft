import { createHmac, timingSafeEqual } from "node:crypto";

import {
  ensurePersonalityIndexes,
  findPersonalityByNftTokenId,
  updatePersonality,
} from "@/lib/personalities";
import { normalizeWalletAddress } from "@/lib/nft/chain";
import { getNftContractAddress } from "@/lib/nft/config";

type AlchemyWebhookEvent = {
  type?: string;
  event?: {
    network?: string;
    activity?: Array<{
      fromAddress?: string;
      toAddress?: string;
      erc721TokenId?: string;
      category?: string;
      rawContract?: {
        address?: string;
      };
    }>;
  };
};

type TransferLogPayload = {
  event?: {
    data?: {
      block?: {
        logs?: Array<{
          topics?: string[];
          data?: string;
          account?: { address?: string };
        }>;
      };
    };
  };
};

function verifyAlchemySignature(
  body: string,
  signature: string | null,
): boolean {
  const signingKey = process.env.ALCHEMY_NOTIFY_SIGNING_KEY?.trim();

  if (!signingKey || !signature) {
    return false;
  }

  const digest = createHmac("sha256", signingKey).update(body).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return digest === signature;
  }
}

function parseTokenIdFromHex(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const tokenId = BigInt(value);
    if (tokenId === BigInt(0)) {
      return null;
    }
    return tokenId.toString();
  } catch {
    return null;
  }
}

async function handleTransfer(
  tokenId: string,
  toAddress: string,
): Promise<void> {
  const personality = await findPersonalityByNftTokenId(tokenId);

  if (!personality) {
    return;
  }

  await updatePersonality(personality.id, {
    nftOwnerAddress: normalizeWalletAddress(toAddress),
    importedViaNft: false,
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-alchemy-signature");

    if (!verifyAlchemySignature(rawBody, signature)) {
      return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const contractAddress = getNftContractAddress()?.toLowerCase();

    if (!contractAddress) {
      return Response.json({ ok: true, skipped: "nft_not_configured" });
    }

    await ensurePersonalityIndexes();

    let payload: AlchemyWebhookEvent & TransferLogPayload;

    try {
      payload = JSON.parse(rawBody) as AlchemyWebhookEvent & TransferLogPayload;
    } catch {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const activities = payload.event?.activity ?? [];

    for (const activity of activities) {
      const activityContract = activity.rawContract?.address?.toLowerCase();

      if (
        activity.category !== "erc721" ||
        activityContract !== contractAddress
      ) {
        continue;
      }

      const tokenId = parseTokenIdFromHex(activity.erc721TokenId);
      const toAddress = activity.toAddress;

      if (tokenId && toAddress) {
        await handleTransfer(tokenId, toAddress);
      }
    }

    const logs = payload.event?.data?.block?.logs ?? [];

    for (const log of logs) {
      const logContract = log.account?.address?.toLowerCase();

      if (logContract !== contractAddress) {
        continue;
      }

      const topics = log.topics ?? [];

      if (topics.length < 4 || topics[0] !== transferTopic()) {
        continue;
      }

      const tokenId = parseTokenIdFromHex(topics[3]);
      const toAddress = topicToAddress(topics[2]);

      if (tokenId && toAddress) {
        await handleTransfer(tokenId, toAddress);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("NFT transfer webhook failed:", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

function transferTopic(): string {
  return "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
}

function topicToAddress(topic: string | undefined): string | null {
  if (!topic || topic.length < 42) {
    return null;
  }

  return `0x${topic.slice(-40)}`;
}
