import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_OWNER_ID,
  createCatalogPersonalityDocument,
  isCatalogPersonality,
} from "@/lib/personalities/catalog";
import { isPublicPersonality } from "@/lib/personalities/rank-npc";
import {
  canAdminMintCatalogPersonality,
} from "@/lib/nft/ownership";
import type { CreatePersonalityInput } from "@/lib/personalities/validation";
import type { Personality } from "@/lib/types/personality";

const baseInput: CreatePersonalityInput = {
  name: "Catalog Bot",
  handle: "catalog_bot",
  kind: "person",
  gender: "nonbinary",
  pronouns: "they_them",
  archetype: "troll",
  traits: {
    humor: 5,
    aggression: 3,
    troll: 4,
    woke: 2,
    negacionist: 1,
    radical: 2,
  },
  politicalSwing: 0,
  interests: ["memes"],
  beliefs: {},
};

function basePersonality(overrides: Partial<Personality> = {}): Personality {
  return {
    ...createCatalogPersonalityDocument(baseInput),
    avatarUrl: "https://gateway.pinata.cloud/ipfs/QmTest",
    avatarStatus: "ready",
    description: "A catalog bot.",
    descriptionStatus: "ready",
    ...overrides,
  };
}

describe("catalog helpers", () => {
  it("identifies catalog personalities", () => {
    assert.equal(isCatalogPersonality(basePersonality()), true);
    assert.equal(
      isCatalogPersonality(basePersonality({ role: "player" })),
      false,
    );
  });

  it("creates catalog documents with sentinel owner", () => {
    const doc = createCatalogPersonalityDocument(baseInput);

    assert.equal(doc.role, "catalog");
    assert.equal(doc.ownerId, CATALOG_OWNER_ID);
    assert.equal(doc.avatarStatus, "pending");
  });

  it("hides catalog personalities from public profiles", () => {
    assert.equal(isPublicPersonality(basePersonality()), false);
  });
});

describe("canAdminMintCatalogPersonality", () => {
  const admin = { id: "admin_1", username: "admin", role: "admin" as const };
  const user = { id: "user_1", username: "alice", role: "user" as const };

  it("allows admin to mint unminted catalog personality", () => {
    assert.equal(
      canAdminMintCatalogPersonality(admin, basePersonality()),
      true,
    );
  });

  it("blocks non-admin users", () => {
    assert.equal(
      canAdminMintCatalogPersonality(user, basePersonality()),
      false,
    );
  });

  it("blocks mint when already minted", () => {
    const minted = basePersonality({
      nft: {
        chainId: 8453,
        contractAddress: "0x0000000000000000000000000000000000000001",
        tokenId: "1",
        metadataUri: "ipfs://meta",
        mintTxHash: "0xabc",
        mintedAt: new Date(),
      },
    });

    assert.equal(canAdminMintCatalogPersonality(admin, minted), false);
  });

  it("blocks player personalities", () => {
    assert.equal(
      canAdminMintCatalogPersonality(
        admin,
        basePersonality({ role: "player", ownerId: "user_1" }),
      ),
      false,
    );
  });
});

describe("simulation eligibility filter", () => {
  it("excludes catalog personalities from tick batch", () => {
    const personalities = [
      basePersonality({ role: "player", ownerId: "user_1" }),
      basePersonality(),
      basePersonality({ role: "rank_npc" }),
    ];

    const eligible = personalities.filter(
      (personality) =>
        personality.role !== "rank_npc" && !isCatalogPersonality(personality),
    );

    assert.equal(eligible.length, 1);
    assert.equal(eligible[0]?.role, "player");
  });
});

describe("import activation", () => {
  it("sets role player when importing catalog personality", () => {
    const catalog = basePersonality();
    const importUpdate = {
      ownerId: "user_1",
      nftOwnerAddress: "0xAb5801a7D398351bEFbE11D02C0970b6579bdda0",
      importedViaNft: true,
      ...(isCatalogPersonality(catalog) ? { role: "player" as const } : {}),
    };

    assert.deepEqual(importUpdate.role, "player");
  });
});
