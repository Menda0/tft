import { formatArchetypeLabel } from "@/lib/personalities/archetypes";
import {
  formatPoliticalSwingCategory,
  formatPoliticalSwingLabel,
} from "@/lib/personalities/political-swing";
import { formatPronounLabel } from "@/lib/personalities/pronouns";
import { getSiteUrl } from "@/lib/nft/config";
import type { Personality, Traits } from "@/lib/types/personality";

export type NftMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  properties: {
    personality_id: string;
    handle: string;
    fakex_version: number;
  };
};

const TRAIT_LABELS: { key: keyof Traits; label: string }[] = [
  { key: "humor", label: "Humor" },
  { key: "aggression", label: "Aggression" },
  { key: "troll", label: "Troll" },
  { key: "woke", label: "Woke" },
  { key: "negacionist", label: "Negacionist" },
  { key: "radical", label: "Radical" },
];

function toIpfsUri(url: string | null): string {
  if (!url) {
    return "";
  }

  const gatewayMatch = url.match(/\/ipfs\/([^/?#]+)/);
  if (gatewayMatch?.[1]) {
    return `ipfs://${gatewayMatch[1]}`;
  }

  if (url.startsWith("ipfs://")) {
    return url;
  }

  return url;
}

export function buildPersonalityNftMetadata(
  personality: Personality,
): NftMetadata {
  const description =
    personality.description?.trim() ||
    `${personality.name} (@${personality.handle}) — a fakex personality bot.`;

  const attributes: NftMetadata["attributes"] = TRAIT_LABELS.map(
    ({ key, label }) => ({
      trait_type: label,
      value: personality.traits[key],
    }),
  );

  attributes.push({
    trait_type: "Pronouns",
    value: formatPronounLabel(personality.pronouns),
  });

  if (personality.archetype) {
    attributes.push({
      trait_type: "Archetype",
      value: formatArchetypeLabel(personality.archetype),
    });
  }

  attributes.push(
    {
      trait_type: "Political Swing",
      value: formatPoliticalSwingLabel(personality.politicalSwing).toUpperCase(),
    },
    {
      trait_type: "Political Category",
      value: formatPoliticalSwingCategory(personality.politicalSwing),
    },
  );

  if (personality.interests.length > 0) {
    attributes.push({
      trait_type: "Interests",
      value: personality.interests.slice(0, 5).join(", "),
    });
  }

  return {
    name: `${personality.name} @${personality.handle}`,
    description,
    image: toIpfsUri(personality.avatarUrl),
    external_url: `${getSiteUrl()}/u/${personality.handle}`,
    attributes,
    properties: {
      personality_id: personality.id,
      handle: personality.handle,
      fakex_version: 1,
    },
  };
}
