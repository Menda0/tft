import {
  DESIGN_SIZE,
  encodeSvgDataUrl,
  fillRect,
  setPixel,
  type PixelGrid,
} from "@/lib/avatars/pixel-canvas";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { PageKind } from "@/lib/avatars/page-kind";
import type { Traits } from "@/lib/types/personality";

const SIZE = DESIGN_SIZE;

type SubjectPalette = {
  background: string;
  primary: string;
  secondary: string;
  shadow: string;
  accent: string;
  highlight: string;
};

type SubjectContext = {
  seed: string;
  grid: PixelGrid;
  palette: SubjectPalette;
  archetype: Archetype;
  traits: Traits;
  name: string;
};

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededInt(seed: string, offset: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + (hashString(`${seed}:${offset}`) % span);
}

const PICO8 = [
  "#1d2b53",
  "#7e2553",
  "#008751",
  "#ab5236",
  "#5f574f",
  "#c2c3c7",
  "#fff1e8",
  "#ff004d",
  "#ffa300",
  "#ffec27",
  "#00e436",
  "#29adff",
  "#83769a",
  "#ff77a8",
  "#ffccaa",
] as const;

function pickColor(seed: string, offset: number): string {
  return PICO8[hashString(`${seed}:${offset}`) % PICO8.length] ?? "#83769a";
}

function buildSubjectPalette(seed: string, traits: Traits): SubjectPalette {
  const average = Math.round(
    (traits.humor +
      traits.charisma +
      traits.curiosity +
      traits.chaos +
      traits.empathy) /
      5,
  );

  return {
    background: "#1d2b53",
    primary: pickColor(seed, average + 1),
    secondary: pickColor(seed, average + 2),
    shadow: pickColor(seed, average + 3),
    accent: pickColor(seed, average + 4),
    highlight: pickColor(seed, average + 5),
  };
}

function drawBackground(ctx: SubjectContext): void {
  fillRect(ctx.grid, 0, 0, SIZE, SIZE, ctx.palette.background);
}

function drawNewsMicrophone(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 10, 6, 4, 6, palette.secondary);
  fillRect(grid, 9, 7, 6, 4, palette.highlight);
  fillRect(grid, 11, 12, 2, 5, palette.shadow);
  fillRect(grid, 8, 17, 8, 2, palette.primary);
  fillRect(grid, 7, 18, 10, 1, palette.accent);
}

function drawNewsPaper(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 7, 5, 10, 14, palette.highlight);
  fillRect(grid, 8, 6, 8, 12, palette.secondary);
  fillRect(grid, 9, 7, 6, 2, palette.shadow);
  fillRect(grid, 9, 10, 6, 1, palette.shadow);
  fillRect(grid, 9, 12, 4, 1, palette.shadow);
  fillRect(grid, 9, 14, 5, 1, palette.shadow);
  fillRect(grid, 15, 5, 2, 14, palette.primary);
}

function drawNewsTower(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 11, 4, 2, 12, palette.shadow);
  fillRect(grid, 8, 16, 8, 2, palette.primary);
  fillRect(grid, 10, 2, 4, 2, palette.accent);
  setPixel(grid, 9, 6, palette.highlight);
  setPixel(grid, 14, 8, palette.highlight);
  setPixel(grid, 9, 10, palette.highlight);
}

function drawFanStar(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 11, 4, 2, 10, palette.accent);
  fillRect(grid, 7, 8, 10, 2, palette.accent);
  fillRect(grid, 8, 6, 2, 2, palette.accent);
  fillRect(grid, 14, 6, 2, 2, palette.accent);
  fillRect(grid, 9, 12, 2, 2, palette.accent);
  fillRect(grid, 13, 12, 2, 2, palette.accent);
  fillRect(grid, 8, 15, 8, 3, palette.primary);
  fillRect(grid, 10, 16, 4, 1, palette.secondary);
}

function drawFanFoamFinger(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 10, 4, 4, 12, palette.primary);
  fillRect(grid, 9, 5, 1, 8, palette.shadow);
  fillRect(grid, 11, 3, 2, 2, palette.highlight);
  fillRect(grid, 8, 16, 8, 3, palette.secondary);
  setPixel(grid, 11, 7, palette.accent);
  setPixel(grid, 12, 9, palette.accent);
}

function drawMemeFrog(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 7, 9, 10, 8, palette.primary);
  fillRect(grid, 6, 10, 2, 4, palette.primary);
  fillRect(grid, 16, 10, 2, 4, palette.primary);
  fillRect(grid, 9, 11, 2, 2, palette.shadow);
  fillRect(grid, 13, 11, 2, 2, palette.shadow);
  fillRect(grid, 10, 15, 4, 1, palette.shadow);
  fillRect(grid, 8, 8, 3, 2, palette.secondary);
  fillRect(grid, 13, 8, 3, 2, palette.secondary);
}

function drawMemeMegaphone(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 6, 10, 4, 4, palette.secondary);
  fillRect(grid, 10, 9, 4, 6, palette.primary);
  fillRect(grid, 14, 8, 4, 8, palette.accent);
  fillRect(grid, 18, 9, 2, 6, palette.highlight);
  fillRect(grid, 7, 14, 2, 3, palette.shadow);
}

function drawMemeClownBadge(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 8, 8, 8, 8, palette.highlight);
  fillRect(grid, 9, 9, 6, 6, palette.secondary);
  fillRect(grid, 11, 12, 2, 2, palette.accent);
  setPixel(grid, 10, 10, palette.shadow);
  setPixel(grid, 13, 10, palette.shadow);
  fillRect(grid, 10, 14, 4, 1, palette.shadow);
  fillRect(grid, 11, 5, 2, 2, palette.accent);
}

function drawBrandBadge(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 8, 5, 8, 14, palette.primary);
  fillRect(grid, 9, 6, 6, 12, palette.secondary);
  fillRect(grid, 10, 8, 4, 4, palette.accent);
  fillRect(grid, 11, 9, 2, 2, palette.highlight);
  fillRect(grid, 7, 7, 1, 10, palette.shadow);
  fillRect(grid, 16, 7, 1, 10, palette.shadow);
}

function drawBrandStorefront(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 6, 12, 12, 7, palette.secondary);
  fillRect(grid, 7, 13, 10, 5, palette.highlight);
  fillRect(grid, 6, 10, 12, 2, palette.primary);
  fillRect(grid, 8, 10, 2, 2, palette.accent);
  fillRect(grid, 11, 10, 2, 2, palette.accent);
  fillRect(grid, 14, 10, 2, 2, palette.accent);
  fillRect(grid, 11, 15, 2, 3, palette.shadow);
}

function drawBrandEmblem(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 11, 4, 2, 16, palette.accent);
  fillRect(grid, 7, 8, 10, 2, palette.accent);
  fillRect(grid, 8, 6, 8, 12, palette.primary);
  fillRect(grid, 9, 7, 6, 10, palette.secondary);
  setPixel(grid, 11, 11, palette.highlight);
}

function drawMascotRobot(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 8, 5, 8, 8, palette.secondary);
  fillRect(grid, 9, 6, 6, 6, palette.highlight);
  setPixel(grid, 10, 8, palette.accent);
  setPixel(grid, 13, 8, palette.accent);
  fillRect(grid, 10, 10, 4, 1, palette.shadow);
  fillRect(grid, 9, 13, 6, 6, palette.primary);
  fillRect(grid, 7, 14, 2, 3, palette.shadow);
  fillRect(grid, 15, 14, 2, 3, palette.shadow);
  fillRect(grid, 10, 19, 4, 2, palette.shadow);
  setPixel(grid, 12, 4, palette.accent);
}

function drawMascotGoblin(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 8, 8, 8, 7, palette.primary);
  fillRect(grid, 7, 9, 1, 3, palette.primary);
  fillRect(grid, 16, 9, 1, 3, palette.primary);
  setPixel(grid, 10, 10, palette.shadow);
  setPixel(grid, 13, 10, palette.shadow);
  fillRect(grid, 10, 13, 4, 1, palette.shadow);
  fillRect(grid, 9, 6, 2, 2, palette.secondary);
  fillRect(grid, 13, 6, 2, 2, palette.secondary);
  fillRect(grid, 8, 15, 8, 4, palette.secondary);
}

function drawMascotSlime(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 9, 10, 6, 6, palette.primary);
  fillRect(grid, 8, 12, 8, 4, palette.primary);
  fillRect(grid, 7, 14, 10, 3, palette.primary);
  fillRect(grid, 8, 17, 8, 2, palette.shadow);
  setPixel(grid, 10, 12, palette.highlight);
  setPixel(grid, 13, 13, palette.highlight);
  setPixel(grid, 11, 14, palette.shadow);
}

function drawMascotOwl(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 8, 7, 8, 10, palette.secondary);
  fillRect(grid, 7, 9, 10, 6, palette.secondary);
  fillRect(grid, 9, 10, 3, 3, palette.highlight);
  fillRect(grid, 12, 10, 3, 3, palette.highlight);
  setPixel(grid, 10, 11, palette.shadow);
  setPixel(grid, 13, 11, palette.shadow);
  fillRect(grid, 11, 14, 2, 2, palette.accent);
  fillRect(grid, 10, 5, 4, 2, palette.primary);
}

function drawMascotCat(ctx: SubjectContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 8, 9, 8, 7, palette.primary);
  fillRect(grid, 8, 7, 2, 3, palette.primary);
  fillRect(grid, 14, 7, 2, 3, palette.primary);
  setPixel(grid, 10, 11, palette.shadow);
  setPixel(grid, 13, 11, palette.shadow);
  fillRect(grid, 11, 13, 2, 1, palette.shadow);
  fillRect(grid, 10, 14, 1, 2, palette.shadow);
  fillRect(grid, 13, 14, 1, 2, palette.shadow);
  fillRect(grid, 9, 16, 6, 2, palette.secondary);
}

function drawByKind(ctx: SubjectContext, kind: PageKind): void {
  const variant = seededInt(ctx.seed, 90, 0, 2);

  switch (kind) {
    case "news":
      if (variant === 0) drawNewsMicrophone(ctx);
      else if (variant === 1) drawNewsPaper(ctx);
      else drawNewsTower(ctx);
      return;
    case "fan_page":
      if (variant === 0) drawFanStar(ctx);
      else drawFanFoamFinger(ctx);
      return;
    case "meme_page":
      if (variant === 0) drawMemeFrog(ctx);
      else if (variant === 1) drawMemeMegaphone(ctx);
      else drawMemeClownBadge(ctx);
      return;
    case "brand":
      if (variant === 0) drawBrandBadge(ctx);
      else if (variant === 1) drawBrandStorefront(ctx);
      else drawBrandEmblem(ctx);
      return;
    case "mascot":
    default: {
      const mascot = seededInt(ctx.seed, 91, 0, 4);
      if (mascot === 0) drawMascotRobot(ctx);
      else if (mascot === 1) drawMascotGoblin(ctx);
      else if (mascot === 2) drawMascotSlime(ctx);
      else if (mascot === 3) drawMascotOwl(ctx);
      else drawMascotCat(ctx);
    }
  }
}

export function generateProceduralSubjectAvatar(input: {
  name: string;
  handle: string;
  archetype: Archetype;
  traits: Traits;
  kind: PageKind;
}): string {
  const seed = `${input.handle}:${input.name}:${input.kind}:${input.archetype}`;
  const grid: PixelGrid = new Map();
  const palette = buildSubjectPalette(seed, input.traits);
  const ctx: SubjectContext = {
    seed,
    grid,
    palette,
    archetype: input.archetype,
    traits: input.traits,
    name: input.name,
  };

  drawBackground(ctx);
  drawByKind(ctx, input.kind);

  return encodeSvgDataUrl(grid);
}
