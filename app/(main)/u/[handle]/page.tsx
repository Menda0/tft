import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/profile-view";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { buildShareImages } from "@/lib/metadata/site";
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
  const shareImages = buildShareImages({
    imageUrl: personality.avatarUrl,
    alt: `${personality.name} (@${personality.handle}) pixel art avatar`,
  });

  return {
    title: `@${personality.handle}`,
    description,
    openGraph: {
      title: `${personality.name} (@${personality.handle})`,
      description,
      images: shareImages.openGraph,
    },
    twitter: {
      title: `${personality.name} (@${personality.handle})`,
      description,
      images: shareImages.twitter,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;

  return <ProfileView handle={handle} />;
}
