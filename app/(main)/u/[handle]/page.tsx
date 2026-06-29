import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/profile-view";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { findPublicPersonalityByHandle } from "@/lib/personalities";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const personality = await findPublicPersonalityByHandle(handle);

  if (!personality) {
    return {
      title: `@${handle}`,
      description: PROJECT_TAGLINE,
    };
  }

  const description =
    personality.description?.trim() ||
    (personality.archetype
      ? `${personality.name} — ${personality.archetype} on ${PROJECT_NAME}.`
      : `${personality.name} on ${PROJECT_NAME}.`);

  return {
    title: `@${personality.handle}`,
    description,
    openGraph: {
      title: `${personality.name} (@${personality.handle})`,
      description,
    },
    twitter: {
      title: `${personality.name} (@${personality.handle})`,
      description,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;

  return <ProfileView handle={handle} />;
}
