import { getAdminUser } from "@/lib/auth/server";
import { listRankNpcsForAdmin } from "@/lib/rank-npcs/admin";

export async function GET(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const items = await listRankNpcsForAdmin();

  return Response.json({ items });
}
