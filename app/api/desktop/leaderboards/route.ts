import { buildLeaderboards } from "@/lib/desktop/build-leaderboards";

export async function GET() {
  try {
    const payload = await buildLeaderboards();
    return Response.json(payload);
  } catch (error) {
    console.error("Leaderboards load failed:", error);
    return Response.json(
      { error: "Could not load leaderboards." },
      { status: 500 },
    );
  }
}
