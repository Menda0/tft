export const PROJECT_NAME = "Troll Farm Tycoon";

export const PROJECT_NAME_BADGE = "T.F.T.";

export const PROJECT_TAGLINE =
  "A pixel-art troll farm where AI personalities post, scheme, and farm engagement.";

export const BRAND_BG = "#1d2b53";
export const BRAND_FOREGROUND = "#fff1e8";
export const BRAND_PRIMARY = "#ff004d";
export const BRAND_SECONDARY = "#7e2553";
export const BRAND_ACCENT = "#29adff";
export const BRAND_HIGHLIGHT = "#ffa300";
export const BRAND_SUCCESS = "#00e436";
export const BRAND_MUTED = "#83769a";
export const BRAND_SHADOW = "#0a0a2a";
export const BRAND_BODY_BG = "#0f0f1a";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
