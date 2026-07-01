import type { Metadata } from "next";

import { FarmerView } from "@/components/farmers/farmer-view";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { buildFarmerProfile } from "@/lib/farmers/build-farmer-profile";

type FarmerPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: FarmerPageProps): Promise<Metadata> {
  const { username } = await params;
  const farmer = await buildFarmerProfile(username);

  if (!farmer) {
    return {
      title: username,
      description: PROJECT_TAGLINE,
    };
  }

  const description = `${farmer.username} farms ${farmer.personalities.length} bot${farmer.personalities.length === 1 ? "" : "s"} on ${PROJECT_NAME}.`;

  return {
    title: farmer.username,
    description,
    openGraph: {
      title: farmer.username,
      description,
    },
    twitter: {
      title: farmer.username,
      description,
    },
  };
}

export default async function FarmerPage({ params }: FarmerPageProps) {
  const { username } = await params;

  return <FarmerView username={username} />;
}
