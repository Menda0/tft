const AVATAR_COLOR_KEYS = [
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-red-600",
  "bg-emerald-500",
] as const;

export function avatarColorForHandle(handle: string): string {
  let hash = 0;

  for (const char of handle) {
    hash = (hash + char.charCodeAt(0)) % 9973;
  }

  return AVATAR_COLOR_KEYS[hash % AVATAR_COLOR_KEYS.length];
}

export function formatRelativeTime(date: Date, now = Date.now()): string {
  const diffMs = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
