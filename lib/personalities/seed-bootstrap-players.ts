import { hashPassword } from "@/lib/auth/password";
import {
  createUser,
  ensureUserIndexes,
  findBootstrapUsers,
  findUserByUsername,
} from "@/lib/db/users";
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
import {
  getBootstrapPersonalitiesNeedingAssets,
  queueBootstrapAssetGeneration,
  type BootstrapPlayerLog,
} from "@/lib/personalities/bootstrap-assets";

const DEFAULT_PLAYER_COUNT = 7;
const DEFAULT_PASSWORD = "bootstrap123";

const USERNAME_ADJECTIVES = [
  "swift",
  "bold",
  "quiet",
  "lucky",
  "wild",
  "calm",
  "neon",
  "cosmic",
  "pixel",
  "turbo",
  "hyper",
  "chill",
  "sunny",
  "misty",
  "rapid",
  "clever",
  "mighty",
  "jolly",
  "snappy",
  "zesty",
];

const USERNAME_NOUNS = [
  "fox",
  "wolf",
  "star",
  "wave",
  "hawk",
  "lynx",
  "mint",
  "spark",
  "comet",
  "pixel",
  "otter",
  "raven",
  "tiger",
  "vibe",
  "storm",
  "orbit",
  "nexus",
  "delta",
  "falcon",
  "ember",
];

export type { BootstrapPlayerLog } from "@/lib/personalities/bootstrap-assets";

export type BootstrapPlayerSeedResult = {
  usersCreated: number;
  usersReused: number;
  personalitiesCreated: number;
  assets: {
    biosQueued: number;
    avatarsQueued: number;
  };
  users: Array<{
    username: string;
    created: boolean;
    personalitiesAdded: number;
  }>;
};

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

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomUsernameCandidate(): string {
  const adjective = pick(USERNAME_ADJECTIVES);
  const noun = pick(USERNAME_NOUNS);
  const suffix = randomInt(100, 9999);

  return `${adjective}_${noun}_${suffix}`;
}

async function createUniqueRandomUsername(): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const username = generateRandomUsernameCandidate();
    const existing = await findUserByUsername(username);

    if (!existing) {
      return username;
    }
  }

  throw new Error("Could not generate a unique bootstrap username.");
}

async function createUniqueRandomPersonality(
  ownerId: string,
  log: BootstrapPlayerLog,
) {
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
    log(
      `  + personality @${personality.handle} (${personality.name}, ${personality.kind})`,
    );
    return personality;
  }

  throw new Error("Could not generate a unique personality handle.");
}

export const defaultBootstrapPlayerLog: BootstrapPlayerLog = (message) => {
  console.info(`[bootstrap] ${message}`);
};

export async function seedBootstrapPlayers(
  log: BootstrapPlayerLog = defaultBootstrapPlayerLog,
): Promise<BootstrapPlayerSeedResult> {
  await ensureUserIndexes();
  await ensurePersonalityIndexes();

  const playerCount = getPlayerCount();
  const passwordHash = await hashPassword(getBootstrapPassword());
  const existingBootstrapUsers = await findBootstrapUsers();
  const users: BootstrapPlayerSeedResult["users"] = [];
  let usersCreated = 0;
  let usersReused = 0;
  let personalitiesCreated = 0;

  log(
    `Starting bootstrap seed for ${playerCount} player(s) with up to ${MAX_PERSONALITIES_PER_USER} personalities each.`,
  );

  for (const user of existingBootstrapUsers) {
    usersReused += 1;
    users.push({
      username: user.username,
      created: false,
      personalitiesAdded: 0,
    });
  }

  while (users.length < playerCount) {
    const username = await createUniqueRandomUsername();
    const user = await createUser(username, passwordHash, { isBootstrap: true });
    usersCreated += 1;
    users.push({
      username: user.username,
      created: true,
      personalitiesAdded: 0,
    });
    log(`Created bootstrap user @${user.username}`);
  }

  if (usersReused > 0) {
    log(`Reusing ${usersReused} existing bootstrap user(s).`);
  }

  for (const entry of users) {
    const user = await findUserByUsername(entry.username);

    if (!user?._id) {
      log(`Skipping @${entry.username}: user record missing.`);
      continue;
    }

    const ownerId = user._id.toString();
    const existingCount = await countActivePersonalitiesByOwner(ownerId);
    const remaining = MAX_PERSONALITIES_PER_USER - existingCount;

    if (remaining <= 0) {
      log(
        `@${entry.username} already has ${existingCount}/${MAX_PERSONALITIES_PER_USER} personalities.`,
      );
      continue;
    }

    log(
      `@${entry.username}: adding ${remaining} personality slot(s) (${existingCount}/${MAX_PERSONALITIES_PER_USER} filled).`,
    );

    for (let slot = 0; slot < remaining; slot += 1) {
      await createUniqueRandomPersonality(ownerId, log);
      entry.personalitiesAdded += 1;
      personalitiesCreated += 1;
    }
  }

  log(
    `Done. usersCreated=${usersCreated}, usersReused=${usersReused}, personalitiesCreated=${personalitiesCreated}.`,
  );

  const bootstrapOwnerIds: string[] = [];

  for (const entry of users) {
    const user = await findUserByUsername(entry.username);

    if (user?._id) {
      bootstrapOwnerIds.push(user._id.toString());
    }
  }

  const personalitiesNeedingAssets =
    await getBootstrapPersonalitiesNeedingAssets(bootstrapOwnerIds);

  log(
    `Checking assets for ${personalitiesNeedingAssets.length} bootstrap personality(ies)...`,
  );

  const assets = await queueBootstrapAssetGeneration(personalitiesNeedingAssets, {
    log,
    awaitCompletion: false,
  });

  if (assets.biosQueued > 0 || assets.avatarsQueued > 0) {
    log(
      `Queued ${assets.biosQueued} bio job(s) and ${assets.avatarsQueued} avatar job(s) in the background.`,
    );
  } else {
    log("No pending bootstrap bios or avatars to generate.");
  }

  return {
    usersCreated,
    usersReused,
    personalitiesCreated,
    assets: {
      biosQueued: assets.biosQueued,
      avatarsQueued: assets.avatarsQueued,
    },
    users,
  };
}
