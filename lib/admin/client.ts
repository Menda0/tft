import type { AdminDashboardData, DashboardRange } from "@/lib/admin/dashboard";
import type { TickResultsPage } from "@/lib/types/tick-result";

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

export async function fetchTickResults(
  token: string,
  options: { offset?: number; limit?: number } = {},
): Promise<
  | { ok: true; data: TickResultsPage }
  | { ok: false; error: string }
> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 10;
  const response = await fetch(
    `/api/admin/tick-results?offset=${offset}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = (await response.json()) as TickResultsPage & { error?: string };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return { ok: true, data };
}
