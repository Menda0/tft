import {
  countActivePersonalitiesByOwner,
  ensurePersonalityIndexes,
  findPersonalityByHandleIncludingDeleted,
  getPersonalitiesCollection,
  insertPersonality,
  normalizePersonality,
} from "@/lib/personalities";
import { mergeNotDeleted } from "@/lib/db/active-filters";
import { MAX_PERSONALITIES_PER_USER } from "@/lib/personalities/limits";
import { attachSocialRanksToPersonalities } from "@/lib/profile/social-rank";
import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import {
  createPersonalityId,
  defaultStats,
  validateCreatePersonalityInput,
} from "@/lib/personalities/validation";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to create a personality.", 401);
    }

    const parsed = validateCreatePersonalityInput(await request.json());

    if (!parsed.ok) {
      return authError(parsed.error, 400);
    }

    await ensurePersonalityIndexes();

    const { name, handle, kind, gender, pronouns, archetype, traits, politicalSwing, interests, beliefs } =
      parsed.value;

    const existingHandle = await findPersonalityByHandleIncludingDeleted(handle);

    if (existingHandle) {
      return authError("Handle is already taken.", 409);
    }

    const ownedCount = await countActivePersonalitiesByOwner(authUser.id);

    if (ownedCount >= MAX_PERSONALITIES_PER_USER) {
      return authError(
        `You can only create up to ${MAX_PERSONALITIES_PER_USER} personalities.`,
        403,
      );
    }

    const personality = {
      id: createPersonalityId(),
      name,
      handle,
      kind,
      gender,
      pronouns,
      avatarUrl: null,
      avatarStatus: "pending" as const,
      description: null,
      descriptionStatus: "pending" as const,
      ownerId: authUser.id,
      createdAt: new Date(),
      archetype,
      traits,
      politicalSwing,
      interests,
      beliefs: beliefs ?? {},
      stats: defaultStats(),
      memory: [],
      relationships: {},
    };

    await insertPersonality(normalizePersonality(personality));

    return Response.json({ personality: normalizePersonality(personality) }, { status: 201 });
  } catch (error) {
    console.error("Create personality failed:", error);

    return authError("Could not create personality.", 500);
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    const collection = await getPersonalitiesCollection();
    const filter = authUser
      ? mergeNotDeleted({ ownerId: authUser.id })
      : mergeNotDeleted({});
    const personalities = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return Response.json({
      personalities: await attachSocialRanksToPersonalities(
        personalities.map(normalizePersonality),
      ),
    });
  } catch (error) {
    console.error("List personalities failed:", error);
    return authError("Could not load personalities.", 500);
  }
}
