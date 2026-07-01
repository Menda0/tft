import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPersonalityNftMetadata } from "@/lib/nft/build-metadata";
import {
  canDeletePersonality,
  canManagePersonality,
  canMintPersonality,
} from "@/lib/nft/ownership";
import type { Personality } from "@/lib/types/personality";

function basePersonality(overrides: Partial<Personality> = {}): Personality {
  return {
    id: "pers_test",
    name: "Test Bot",
    handle: "testbot",
    kind: "person",
    gender: "nonbinary",
    pronouns: "they_them",
    avatarUrl: "https://gateway.pinata.cloud/ipfs/QmTest",
    avatarStatus: "ready",
    description: "A test bot.",
    descriptionStatus: "ready",
    ownerId: "user_1",
    createdAt: new Date(),
    archetype: "shitposter",
    traits: {
      humor: 5,
      aggression: 3,
      troll: 4,
      woke: 2,
      negacionist: 1,
      radical: 2,
    },
    politicalSwing: -3,
    interests: ["memes"],
    beliefs: {},
    stats: {
      followers: 0,
      socialScore: 0,
      controversy: 0,
      creativity: 0,
    },
    memory: [],
    relationships: {},
    ...overrides,
  };
}

describe("buildPersonalityNftMetadata", () => {
  it("builds OpenSea-compatible metadata with ipfs image", () => {
    const metadata = buildPersonalityNftMetadata(basePersonality());

    assert.equal(metadata.name, "Test Bot @testbot");
    assert.equal(metadata.image, "ipfs://QmTest");
    assert.equal(metadata.properties.personality_id, "pers_test");
    assert.ok(metadata.attributes.some((trait) => trait.trait_type === "Humor"));
    assert.deepEqual(
      metadata.attributes.find((trait) => trait.trait_type === "Pronouns"),
      { trait_type: "Pronouns", value: "they/them" },
    );
    assert.deepEqual(
      metadata.attributes.find((trait) => trait.trait_type === "Political Swing"),
      { trait_type: "Political Swing", value: "CENTER-LEFT" },
    );
    assert.deepEqual(
      metadata.attributes.find(
        (trait) => trait.trait_type === "Political Category",
      ),
      {
        trait_type: "Political Category",
        value: "Social democracy / Progressive liberalism",
      },
    );
  });
});

describe("ownership helpers", () => {
  const user = { id: "user_1", username: "alice", role: "user" as const };

  it("allows creator to manage unminted personality", () => {
    assert.equal(
      canManagePersonality(user, basePersonality(), []),
      true,
    );
  });

  it("requires nft wallet for minted personality", () => {
    const minted = basePersonality({
      nft: {
        chainId: 8453,
        contractAddress: "0x0000000000000000000000000000000000000001",
        tokenId: "1",
        metadataUri: "ipfs://meta",
        mintTxHash: "0xabc",
        mintedAt: new Date(),
      },
      nftOwnerAddress: "0xAb5801a7D398351bEFbE11D02C0970b6579bdda0",
    });

    assert.equal(canManagePersonality(user, minted, []), false);
    assert.equal(
      canManagePersonality(user, minted, [
        {
          address: "0xAb5801a7D398351bEFbE11D02C0970b6579bdda0",
          chainId: 8453,
          linkedAt: new Date(),
        },
      ]),
      true,
    );
  });

  it("allows imported owner to manage minted personality without linked wallet", () => {
    const imported = basePersonality({
      ownerId: "user_1",
      importedViaNft: true,
      nft: {
        chainId: 8453,
        contractAddress: "0x0000000000000000000000000000000000000001",
        tokenId: "1",
        metadataUri: "ipfs://meta",
        mintTxHash: "0xabc",
        mintedAt: new Date(),
      },
      nftOwnerAddress: "0xAb5801a7D398351bEFbE11D02C0970b6579bdda0",
    });

    assert.equal(canManagePersonality(user, imported, []), true);
  });

  it("blocks mint when already minted", () => {
    const minted = basePersonality({
      nft: {
        chainId: 8453,
        contractAddress: "0x1",
        tokenId: "1",
        metadataUri: "ipfs://x",
        mintTxHash: "0x1",
        mintedAt: new Date(),
      },
    });

    assert.equal(canMintPersonality(user, minted), false);
    assert.equal(canDeletePersonality(minted), false);
  });
});
