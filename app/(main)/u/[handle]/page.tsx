import { ProfileView } from "@/components/profile/profile-view";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;

  return <ProfileView handle={handle} />;
}
