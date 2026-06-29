import type { RankNpcAdminItem } from "@/lib/rank-npcs/admin";

export async function listRankNpcsAdminRequest(
  token: string,
): Promise<
  | { ok: true; data: RankNpcAdminItem[] }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/rank-npcs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as {
    items?: RankNpcAdminItem[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return { ok: true, data: data.items ?? [] };
}
