import {
  ensurePersonalityIndexes,
  findCatalogPersonalities,
  findPersonalityByHandleIncludingDeleted,
  insertPersonality,
  normalizePersonality,
} from "@/lib/personalities";
import { createCatalogPersonalityDocument } from "@/lib/personalities/catalog";
import { queueBootstrapAssetGeneration } from "@/lib/personalities/bootstrap-assets";
import { validateCreatePersonalityInput } from "@/lib/personalities/validation";
import { getAdminUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import {
  getDefaultChainId,
  getNftContractAddress,
  getOpenSeaAssetUrl,
} from "@/lib/nft/config";
import type { Personality } from "@/lib/types/personality";

export type CatalogPersonalityListItem = Personality & {
  openSeaUrl: string | null;
};

function toCatalogListItem(personality: Personality): CatalogPersonalityListItem {
  const openSeaUrl =
    personality.nft && getNftContractAddress()
      ? getOpenSeaAssetUrl(
          personality.nft.chainId,
          personality.nft.contractAddress,
          personality.nft.tokenId,
        )
      : null;

  return {
    ...personality,
    openSeaUrl,
  };
}

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return authError("Admin access required.", 403);
    }

    await ensurePersonalityIndexes();
    const personalities = await findCatalogPersonalities();

    return Response.json({
      personalities: personalities.map(toCatalogListItem),
    });
  } catch (error) {
    console.error("List catalog personalities failed:", error);
    return authError("Could not load catalog personalities.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return authError("Admin access required.", 403);
    }

    const parsed = validateCreatePersonalityInput(await request.json());

    if (!parsed.ok) {
      return authError(parsed.error, 400);
    }

    await ensurePersonalityIndexes();

    const existingHandle = await findPersonalityByHandleIncludingDeleted(
      parsed.value.handle,
    );

    if (existingHandle) {
      return authError("Handle is already taken.", 409);
    }

    const personality = normalizePersonality(
      createCatalogPersonalityDocument(parsed.value),
    );

    await insertPersonality(personality);

    void queueBootstrapAssetGeneration([personality]).catch((error) => {
      console.error("Catalog asset generation failed:", error);
    });

    return Response.json(
      { personality: toCatalogListItem(personality) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create catalog personality failed:", error);
    return authError("Could not create catalog personality.", 500);
  }
}
