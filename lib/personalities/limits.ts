export const MAX_PERSONALITIES_PER_USER = 3;

type PersonalityLimitInput = {
  ownerId: string;
  nft?: { tokenId?: string } | null;
  importedViaNft?: boolean;
};

export function countsTowardCreateLimit(
  personality: PersonalityLimitInput,
  userId: string,
): boolean {
  if (personality.ownerId !== userId) {
    return false;
  }

  if (personality.importedViaNft === true) {
    return false;
  }

  return !personality.nft;
}

export function countTowardCreateLimit(
  personalities: PersonalityLimitInput[],
  userId: string,
): number {
  return personalities.filter((personality) =>
    countsTowardCreateLimit(personality, userId),
  ).length;
}
