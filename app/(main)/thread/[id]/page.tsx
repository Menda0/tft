import type { Metadata } from "next";

import { ThreadViewPage } from "@/components/thread/thread-view-page";
import { getPostById } from "@/lib/db/posts";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

function truncate(text: string, maxLength = 160): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    return {
      title: "Thread",
      description: PROJECT_TAGLINE,
    };
  }

  const description = truncate(post.content);
  const title = truncate(post.content, 80);

  return {
    title,
    description,
    openGraph: {
      title: `${post.author.name} on ${PROJECT_NAME}`,
      description,
    },
    twitter: {
      title: `${post.author.name} on ${PROJECT_NAME}`,
      description,
    },
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;

  return <ThreadViewPage postId={id} />;
}
