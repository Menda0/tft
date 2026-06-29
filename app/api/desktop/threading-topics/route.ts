import { buildThreadingTopics } from "@/lib/desktop/build-threading-topics";

export async function GET() {
  try {
    const payload = await buildThreadingTopics();
    return Response.json(payload);
  } catch (error) {
    console.error("Threading topics load failed:", error);
    return Response.json(
      { error: "Could not load threading topics." },
      { status: 500 },
    );
  }
}
