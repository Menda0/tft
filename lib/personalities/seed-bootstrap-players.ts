import { hashPassword } from "@/lib/auth/password";
import { createUser, ensureUserIndexes, findUserByUsername } from "@/lib/db/users";
import {
  countActivePersonalitiesByOwner,
  ensurePersonalityIndexes,
  findPersonalityByHandle,
  insertPersonality,
  normalizePersonality,
} from "@/lib/personalities";
import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import { defaultPronounsForGender } from "@/lib/personalities/gender";
import { MAX_PERSONALITIES_PER_USER } from "@/lib/personalities/limits";
import { generateRandomPersonality } from "@/lib/personalities/random";
import {
  createPersonalityId,
  defaultStats,
  parseInterests,
} from "@/lib/personalities/validation";

const DEFAULT_PLAYER_COUNT = 7;
const DEFAULT_PASSWORD = "bootstrap123";

function getPlayerCount(): number {
  const raw = process.env.BOOTSTRAP_PLAYER_COUNT?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_PLAYER_COUNT;
}

function getBootstrapPassword(): string {
  return process.env.BOOTSTRAP_PLAYER_PASSWORD?.trim() || DEFAULT_PASSWORD;
}

async function createUniqueRandomPersonality(ownerId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const draft = generateRandomPersonality();
    const existing = await findPersonalityByHandle(draft.handle);

    if (existing) {
      continue;
    }

    const gender = draft.gender ?? "nonbinary";
    const pronouns =
      draft.pronouns ??
      (profileKindUsesIdentity(draft.kind)
        ? defaultPronounsForGender(gender)
        : defaultPronounsForGender("nonbinary"));

    const personality = normalizePersonality({
      id: createPersonalityId(),
      name: draft.name,
      handle: draft.handle,
      kind: draft.kind,
      gender,
      pronouns,
      avatarUrl: null,
      avatarStatus: "pending",
      description: null,
      descriptionStatus: "pending",
      ownerId,
      createdAt: new Date(),
      archetype: draft.archetype,
      traits: draft.traits,
      politicalSwing: draft.politicalSwing,
      interests: parseInterests(draft.interests),
      beliefs: {},
      stats: defaultStats(),
      memory: [],
      relationships: {},
      role: "player",
    });

    await insertPersonality(personality);
    return personality;
  }

  throw new Error("Could not generate a unique personality handle.");
}

export async function seedBootstrapPlayers(): Promise<{
  usersCreated: number;
  personalitiesCreated: number;
}> {
  await ensureUserIndexes();
  await ensurePersonalityIndexes();

  const playerCount = getPlayerCount();
  const passwordHash = await hashPassword(getBootstrapPassword());
  let usersCreated = 0;
  let personalitiesCreated = 0;

  for (let index = 1; index <= playerCount; index += 1) {
    const username = `bootstrap_${index}`;
    let user = await findUserByUsername(username);

    if (!user) {
      user = await createUser(username, passwordHash);
      usersCreated += 1;
    }

    const ownerId = user._id!.toString();
    const existingCount = await countActivePersonalitiesByOwner(ownerId);
    const remaining = MAX_PERSONALITIES_PER_USER - existingCount;

    for (let slot = 0; slot < remaining; slot += 1) {
      await createUniqueRandomPersonality(ownerId);
      personalitiesCreated += 1;
    }
  }

  return { usersCreated, personalitiesCreated };
}
