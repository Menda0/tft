import type { Relationship } from "@/lib/types/personality";

export type RelationshipCategory =
  | "nemesis"
  | "frenemy"
  | "rival"
  | "hater"
  | "admirer"
  | "ally"
  | "friend"
  | "skeptic"
  | "acquaintance"
  | "stranger";

export const RELATIONSHIP_CATEGORY_LABELS: Record<RelationshipCategory, string> =
  {
    nemesis: "Nemesis",
    frenemy: "Frenemy",
    rival: "Rival",
    hater: "Hater",
    admirer: "Admirer",
    ally: "Ally",
    friend: "Friend",
    skeptic: "Skeptic",
    acquaintance: "Acquaintance",
    stranger: "Stranger",
  };

export function classifyRelationship(
  relationship: Relationship,
): RelationshipCategory {
  const { trust, rivalry, admiration, familiarity } = relationship;

  if (rivalry >= 8 && trust <= 4) {
    return "nemesis";
  }

  if (rivalry >= 5 && admiration >= 5) {
    return "frenemy";
  }

  if (rivalry >= 7) {
    return "rival";
  }

  if (rivalry >= 6 && admiration <= 3 && trust <= 5) {
    return "hater";
  }

  if (admiration >= 7 && rivalry <= 4) {
    return "admirer";
  }

  if (trust >= 7 && admiration >= 6 && rivalry <= 3) {
    return "ally";
  }

  if (trust >= 6 && admiration >= 5 && rivalry <= 5) {
    return "friend";
  }

  if (trust <= 4 && rivalry >= 4 && rivalry <= 6) {
    return "skeptic";
  }

  if (familiarity >= 2) {
    return "acquaintance";
  }

  return "stranger";
}

export function getRelationshipCategoryLabel(
  category: RelationshipCategory,
): string {
  return RELATIONSHIP_CATEGORY_LABELS[category];
}

export function getRelationshipCategoryAgreeNudge(
  category: RelationshipCategory,
): number {
  switch (category) {
    case "ally":
    case "friend":
    case "admirer":
      return 0.05;
    case "frenemy":
      return 0.02;
    case "skeptic":
      return -0.02;
    case "nemesis":
    case "rival":
    case "hater":
      return -0.05;
    default:
      return 0;
  }
}

export function getRelationshipCategoryDisagreeNudge(
  category: RelationshipCategory,
): number {
  switch (category) {
    case "nemesis":
    case "rival":
    case "hater":
      return 0.05;
    case "frenemy":
      return 0.02;
    case "skeptic":
      return 0.03;
    case "ally":
    case "friend":
    case "admirer":
      return -0.05;
    default:
      return 0;
  }
}

// Profile list order: haters, friends, admirers, then remaining categories.
const CATEGORY_SORT_WEIGHT: Record<RelationshipCategory, number> = {
  hater: 100,
  friend: 90,
  admirer: 80,
  nemesis: 75,
  rival: 74,
  frenemy: 73,
  skeptic: 72,
  ally: 65,
  acquaintance: 40,
  stranger: 10,
};

export function compareRelationshipsByCategory(
  leftCategory: RelationshipCategory,
  rightCategory: RelationshipCategory,
  leftName = "",
  rightName = "",
): number {
  const weightDiff =
    relationshipCategorySortWeight(rightCategory) -
    relationshipCategorySortWeight(leftCategory);

  if (weightDiff !== 0) {
    return weightDiff;
  }

  return leftName.localeCompare(rightName);
}

export function relationshipCategorySortWeight(
  category: RelationshipCategory,
): number {
  return CATEGORY_SORT_WEIGHT[category];
}
