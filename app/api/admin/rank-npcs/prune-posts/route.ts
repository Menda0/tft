import { getAdminUser } from "@/lib/auth/server";
import { pruneAllRankNpcPosts } from "@/lib/rank-npcs/prune-posts";

export async function POST(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await pruneAllRankNpcPosts();
    return Response.json(result);
  } catch (error) {
    console.error("Prune rank NPC posts failed:", error);
    return Response.json(
      { error: "Could not prune rank NPC posts." },
      { status: 500 },
    );
  }
}
