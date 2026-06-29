import {
  ensurePersonalityIndexes,
  findPersonalityByHandle,
  getPersonalitiesCollection,
  insertPersonality,
  normalizePersonality,
} from "@/lib/personalities";
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

    const existingHandle = await findPersonalityByHandle(handle);

    if (existingHandle) {
      return authError("Handle is already taken.", 409);
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
    const filter = authUser ? { ownerId: authUser.id } : {};
    const personalities = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return Response.json({
      personalities: personalities.map(normalizePersonality),
    });
  } catch (error) {
    console.error("List personalities failed:", error);
    return authError("Could not load personalities.", 500);
  }
}
