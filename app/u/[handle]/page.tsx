import { ProfileView } from "@/components/profile/profile-view";
import { Shell } from "@/components/layout/shell";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;

  return (
    <Shell>
      <ProfileView handle={handle} />
    </Shell>
  );
}
