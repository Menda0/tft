import { getAdminUser } from "@/lib/auth/server";
import {
  buildAdminDashboard,
  parseDashboardRange,
} from "@/lib/admin/dashboard";
import { ensureAiUsageIndexes } from "@/lib/db/ai-usage";

export async function GET(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureAiUsageIndexes();

  const { searchParams } = new URL(request.url);
  const days = parseDashboardRange(searchParams.get("range"));
  const data = await buildAdminDashboard(days);

  return Response.json(data);
}
