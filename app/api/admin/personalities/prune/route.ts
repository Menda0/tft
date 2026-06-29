import { getAdminUser } from "@/lib/auth/server";
import { pruneAllPlayerPersonalities } from "@/lib/personalities/prune-players";

export async function POST(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await pruneAllPlayerPersonalities();

    return Response.json(result);
  } catch (error) {
    console.error("Player personality prune failed:", error);
    return Response.json(
      { error: "Could not prune player personalities." },
      { status: 500 },
    );
  }
}
