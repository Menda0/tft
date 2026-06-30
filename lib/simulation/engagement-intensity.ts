import type { RelationshipCategory } from "@/lib/profile/relationship-category";
import {
  getRelationshipCategoryAgreeNudge,
  getRelationshipCategoryDisagreeNudge,
} from "@/lib/profile/relationship-category";
import type { Personality, Relationship } from "@/lib/types/personality";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getRelationshipTowardAuthor(
  personality: Personality,
  authorId: string,
): Relationship {
  return (
    personality.relationships[authorId] ?? {
      trust: 5,
      rivalry: 0,
      admiration: 0,
      familiarity: 0,
    }
  );
}

export function computeAgreeProbabilityModifiers(
  relationship: Relationship,
  traits: Personality["traits"],
  category?: RelationshipCategory,
): number {
  const admirationAgreeBoost = (relationship.admiration / 10) * 0.1;
  const trustAgreeBoost = (relationship.trust / 10) * 0.05;
  const agreeTraitPull =
    traits.humor * 0.015 + traits.woke * 0.01 + traits.radical * 0.005;
  const categoryNudge = category
    ? getRelationshipCategoryAgreeNudge(category)
    : 0;

  return admirationAgreeBoost + trustAgreeBoost + agreeTraitPull + categoryNudge;
}

export function computeDisagreeProbabilityModifiers(
  relationship: Relationship,
  traits: Personality["traits"],
  author: Personality | null,
  category?: RelationshipCategory,
): number {
  const rivalryDisagreeBoost = (relationship.rivalry / 10) * 0.12;
  const admirationDisagreeDrag = (relationship.admiration / 10) * 0.08;
  const disagreeTraitPull =
    traits.aggression * 0.018 +
    traits.troll * 0.015 +
    traits.negacionist * 0.012 +
    traits.radical * 0.008;
  const authorHeatPull = computeAuthorHeatPull(author);
  const categoryNudge = category
    ? getRelationshipCategoryDisagreeNudge(category)
    : 0;

  return (
    rivalryDisagreeBoost -
    admirationDisagreeDrag +
    disagreeTraitPull +
    authorHeatPull +
    categoryNudge
  );
}

export function computeAuthorHeatPull(author: Personality | null): number {
  if (!author || author.stats.controversy <= 80) {
    return 0;
  }

  const heatExcess = (author.stats.controversy - 80) / 400;
  return Math.min(0.03, heatExcess) * (1 + author.traits.radical / 20);
}

export function computeDisagreeCooldownMultiplier(
  recentDisagreeCount: number,
  rivalry: number,
): number {
  if (recentDisagreeCount >= 2 && rivalry < 8) {
    return 0.35;
  }

  return 1;
}

export function computeAgreeIntensity(
  actor: Personality,
  relationship: Relationship,
): number {
  const traits = actor.traits;
  const intensity =
    1 +
    traits.humor / 20 +
    traits.woke / 25 +
    relationship.admiration / 20;

  return clamp(intensity, 0.6, 1.6);
}

export function computeDisagreeIntensity(
  actor: Personality,
  author: Personality,
  relationship: Relationship,
): number {
  const traits = actor.traits;
  const intensity =
    1 +
    traits.aggression / 15 +
    traits.troll / 20 +
    traits.radical / 25 +
    relationship.rivalry / 15 -
    relationship.admiration / 25 +
    author.traits.radical / 30;

  return clamp(intensity, 0.5, 2.2);
}

export function computeAuthorHeatDefense(author: Personality): number {
  return clamp(1 - (author.traits.humor / 10) * 0.15, 0.85, 1);
}

export function computeEndorsementImportance(intensity: number): number {
  return clamp(Math.round(4 + intensity * 2.5), 4, 8);
}

export function computeExchangeImportance(intensity: number): number {
  return clamp(Math.round(5 + intensity * 2), 5, 9);
}

export function scaleRelationshipDelta(
  base: number,
  intensity: number,
): number {
  return Math.round(base * intensity * 10) / 10;
}
