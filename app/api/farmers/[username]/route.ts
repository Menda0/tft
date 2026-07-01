import { buildFarmerProfile } from "@/lib/farmers/build-farmer-profile";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { username } = await context.params;
    const farmer = await buildFarmerProfile(username.trim());

    if (!farmer) {
      return Response.json({ error: "Farmer not found." }, { status: 404 });
    }

    return Response.json({ farmer });
  } catch (error) {
    console.error("Farmer profile load failed:", error);
    return Response.json({ error: "Could not load farmer profile." }, {
      status: 500,
    });
  }
}
