import {
  getActivityPageForOwner,
} from "@/lib/db/personality-activity";
import { avatarColorForHandle } from "@/lib/feed/format";
import {
  getPersonalitiesCollection,
  getPersonalityDisplayByIds,
} from "@/lib/personalities";
import { mergeNotDeleted } from "@/lib/db/active-filters";
import type {
  MySocialActivityItem,
  MySocialActivityPayload,
} from "@/lib/types/desktop";
import type { PersonalityActivity } from "@/lib/types/personality-activity";
import type { Personality } from "@/lib/types/personality";

function toParticipant(personality: Pick<Personality, "id" | "name" | "handle" | "avatarUrl">) {
  return {
    id: personality.id,
    name: personality.name,
    handle: personality.handle,
    avatarUrl: personality.avatarUrl ?? null,
    avatarColor: avatarColorForHandle(personality.handle),
  };
}

function buildActivityItems(
  activities: PersonalityActivity[],
  personalityById: Map<string, Pick<Personality, "id" | "name" | "handle" | "avatarUrl">>,
): MySocialActivityItem[] {
  return activities.map((activity) => {
    const personality = personalityById.get(activity.personalityId);
    const actor = activity.actorPersonalityId
      ? personalityById.get(activity.actorPersonalityId)
      : null;
    const target = activity.targetPersonalityId
      ? personalityById.get(activity.targetPersonalityId)
      : null;

    const name = personality?.name ?? "Unknown";
    const handle = personality?.handle ?? "unknown";

    return {
      id: activity.id,
      personalityId: activity.personalityId,
      personalityName: name,
      personalityHandle: handle,
      personalityAvatarUrl: personality?.avatarUrl ?? null,
      personalityAvatarColor: avatarColorForHandle(handle),
      type: activity.type,
      at: activity.at.toISOString(),
      actor: actor ? toParticipant(actor) : null,
      target: target ? toParticipant(target) : null,
      preview: activity.preview ?? null,
    };
  });
}

async function getOwnerPersonalityIds(ownerId: string): Promise<string[]> {
  const collection = await getPersonalitiesCollection();
  const rows = await collection
    .find(mergeNotDeleted({ ownerId }), { projection: { id: 1 } })
    .toArray();

  return rows.map((personality) => personality.id);
}

function collectRelatedPersonalityIds(
  activities: PersonalityActivity[],
): string[] {
  const relatedIds = new Set<string>();

  for (const activity of activities) {
    relatedIds.add(activity.personalityId);

    if (activity.actorPersonalityId) {
      relatedIds.add(activity.actorPersonalityId);
    }

    if (activity.targetPersonalityId) {
      relatedIds.add(activity.targetPersonalityId);
    }
  }

  return [...relatedIds];
}

export async function buildMySocialActivity(
  ownerId: string,
  offset: number,
  limit: number,
): Promise<MySocialActivityPayload> {
  const personalityIds = await getOwnerPersonalityIds(ownerId);

  if (personalityIds.length === 0) {
    return {
      items: [],
      hasMore: false,
      updatedAt: new Date().toISOString(),
    };
  }

  const activities = await getActivityPageForOwner(
    ownerId,
    personalityIds,
    limit + 1,
    offset,
  );
  const hasMore = activities.length > limit;
  const pageActivities = hasMore ? activities.slice(0, limit) : activities;

  const relatedPersonalities = await getPersonalityDisplayByIds(
    collectRelatedPersonalityIds(pageActivities),
  );
  const personalityById = new Map(
    relatedPersonalities.map((personality) => [personality.id, personality]),
  );

  return {
    items: buildActivityItems(pageActivities, personalityById),
    hasMore,
    updatedAt: new Date().toISOString(),
  };
}
