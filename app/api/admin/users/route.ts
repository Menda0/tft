import { listAdminUsers } from "@/lib/admin/users";
import { getAdminUser } from "@/lib/auth/server";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";

const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const offset = parsePositiveInt(searchParams.get("offset"), 0);
  const requestedLimit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  const page = await listAdminUsers({ offset, limit });

  return Response.json(page);
}
