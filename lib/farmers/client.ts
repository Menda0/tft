import type { FarmerProfile } from "@/lib/types/farmer";

export async function fetchFarmerProfile(
  username: string,
): Promise<
  { ok: true; farmer: FarmerProfile } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/farmers/${encodeURIComponent(username)}`,
  );
  const data = (await response.json()) as {
    farmer?: FarmerProfile;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load farmer profile." };
  }

  if (!data.farmer) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, farmer: data.farmer };
}
