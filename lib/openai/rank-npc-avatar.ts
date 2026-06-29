import {
  PAGE_KIND_LABELS,
  profileKindUsesIdentity,
  type PageKind,
} from "@/lib/avatars/page-kind";
import { PIXEL_ART_STYLE } from "@/lib/avatars/pixel-canvas";
import { PROJECT_NAME } from "@/lib/brand";
import { generateImageFromPrompt } from "@/lib/openai/avatar";
import { getRankNpcRealName } from "@/lib/personalities/rank-npc";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { Personality } from "@/lib/types/personality";

const BASE_RULES = [
  "Create exactly one pixel art social media profile picture.",
  PIXEL_ART_STYLE,
  "No anti-aliasing, no photorealism, no 3D, no vector gradients, no anime shading.",
  "Solid flat dark navy background (#1d2b53).",
  "No text, no letters, no numbers, no watermark, no logo text, no frame.",
  "Do not add extra characters, props, scenery, or details beyond what is requested.",
];

function buildPersonAvatarPrompt(input: {
  knockOffName: string;
  realName: string;
  kind: PageKind;
  archetype: Archetype | null;
}): string {
  const kindLabel = PAGE_KIND_LABELS[input.kind].toLowerCase();

  return [
    ...BASE_RULES,
    `Subject: a close-up pixel art portrait of a knock-off parody ${kindLabel} on ${PROJECT_NAME}.`,
    `The character is "${input.knockOffName}", a satirical parody version of ${input.realName}.`,
    `Make the face clearly reminiscent of ${input.realName}: recognizable hairstyle, facial structure, expression, and signature look — but rendered as chunky retro pixel art.`,
    "Slight caricature is welcome. This is parody, not a photorealistic photograph.",
    "Fill the frame with the face/head. No full body, no props, no scenery.",
    input.archetype ? `Vibe: ${input.archetype} energy.` : "",
    `Do not write "${input.realName}" or any words in the image.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildBrandAvatarPrompt(input: {
  knockOffName: string;
  realName: string;
  kind: PageKind;
  archetype: Archetype | null;
}): string {
  const kindLabel = PAGE_KIND_LABELS[input.kind].toLowerCase();

  return [
    ...BASE_RULES,
    `Subject: a pixel art ${kindLabel} profile icon for a knock-off parody account on ${PROJECT_NAME}.`,
    `The page is "${input.knockOffName}", a satirical parody of ${input.realName}.`,
    `Design a single bold icon or mascot mark that evokes ${input.realName}'s brand identity in retro pixel art — colors, shapes, and mood — without copying trademarked logos exactly.`,
    "Center the icon, fill the frame, no human portrait unless the brand is strongly person-led.",
    input.archetype ? `Tone: ${input.archetype}.` : "",
    `Do not write "${input.realName}" or any words in the image.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildRankNpcAvatarPrompt(
  personality: Pick<Personality, "name" | "kind" | "archetype" | "xSync">,
): string {
  const realName = getRankNpcRealName(personality as Personality);
  const input = {
    knockOffName: personality.name,
    realName,
    kind: personality.kind,
    archetype: personality.archetype,
  };

  if (profileKindUsesIdentity(personality.kind)) {
    return buildPersonAvatarPrompt(input);
  }

  return buildBrandAvatarPrompt(input);
}

export async function generateRankNpcPixelAvatar(
  personality: Personality,
): Promise<string> {
  const prompt = buildRankNpcAvatarPrompt(personality);
  return generateImageFromPrompt(prompt, undefined, {
    operation: "rank_npc_avatar",
    personalityId: personality.id,
  });
}
