import { getAdminUser } from "@/lib/auth/server";
import { cleanSlatePersonalitySocialData } from "@/lib/personalities/clean-slate";

export async function POST(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await cleanSlatePersonalitySocialData();

    return Response.json(result);
  } catch (error) {
    console.error("Personality social clean slate failed:", error);
    return Response.json(
      { error: "Could not clean slate personality social data." },
      { status: 500 },
    );
  }
}
