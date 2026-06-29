import { ThreadViewPage } from "@/components/thread/thread-view-page";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;

  return <ThreadViewPage postId={id} />;
}
