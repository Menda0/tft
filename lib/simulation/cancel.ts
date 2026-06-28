export class TickCancelledError extends Error {
  constructor(message = "Tick cancelled.") {
    super(message);
    this.name = "TickCancelledError";
  }
}

export function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new TickCancelledError();
  }
}

export function isTickCancelled(error: unknown): boolean {
  return error instanceof TickCancelledError;
}
