import { findPersonalityByHandleIncludingDeleted } from "@/lib/personalities";
import { normalizeHandle, validateHandle } from "@/lib/personalities/validation";

export type HandleAvailabilityResult = {
  available: boolean;
  handle: string;
  error: string | null;
};

export async function checkHandleAvailability(
  handle: string,
): Promise<HandleAvailabilityResult> {
  const normalized = normalizeHandle(handle);
  const formatError = validateHandle(normalized);

  if (formatError) {
    return { available: false, handle: normalized, error: formatError };
  }

  const existing = await findPersonalityByHandleIncludingDeleted(normalized);

  if (existing) {
    return {
      available: false,
      handle: normalized,
      error: "Handle is already taken.",
    };
  }

  return { available: true, handle: normalized, error: null };
}
