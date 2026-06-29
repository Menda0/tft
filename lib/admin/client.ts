import type { AdminDashboardData, DashboardRange } from "@/lib/admin/dashboard";

export type { AdminDashboardData, DashboardRange };

export async function fetchAdminDashboard(
  token: string,
  range: DashboardRange,
): Promise<
  | { ok: true; data: AdminDashboardData }
  | { ok: false; error: string }
> {
  const rangeParam = range === 7 ? "7d" : range === 30 ? "30d" : "90d";
  const response = await fetch(`/api/admin/dashboard?range=${rangeParam}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as AdminDashboardData & { error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return { ok: true, data };
}
