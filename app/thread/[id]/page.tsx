import { ThreadViewPage } from "@/components/thread/thread-view-page";
import { Shell } from "@/components/layout/shell";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;

  return (
    <Shell>
      <ThreadViewPage postId={id} />
    </Shell>
  );
}
