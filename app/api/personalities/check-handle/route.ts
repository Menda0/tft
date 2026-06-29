import { checkHandleAvailability } from "@/lib/personalities/handle-availability";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle") ?? "";
    const result = await checkHandleAvailability(handle);

    return Response.json(result);
  } catch (error) {
    console.error("Handle availability check failed:", error);
    return Response.json(
      { available: false, handle: "", error: "Could not check handle." },
      { status: 500 },
    );
  }
}
