const AVATAR_COLORS: Record<string, string> = {
  "bg-amber-500": "bg-[#ffa300]",
  "bg-sky-500": "bg-[#29adff]",
  "bg-violet-500": "bg-[#83769a]",
  "bg-red-600": "bg-[#ff004d]",
  "bg-emerald-500": "bg-[#00e436]",
};

export function getPixelAvatarColor(color: string): string {
  return AVATAR_COLORS[color] ?? "bg-[#83769a]";
}
