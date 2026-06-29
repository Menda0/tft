import type { Archetype } from "@/lib/personalities/archetypes";
import {
  DESIGN_SIZE,
  encodeSvgDataUrl,
  fillRect,
  setPixel,
  type PixelGrid,
} from "@/lib/avatars/pixel-canvas";
import {
  isDoorGender,
  isFeminineGender,
  isMasculineGender,
  type Gender,
} from "@/lib/personalities/gender";
import type { Traits } from "@/lib/types/personality";

const SIZE = DESIGN_SIZE;
const FACE_X = 5;
const FACE_Y = 7;
const FACE_W = 14;
const FACE_H = 14;

const PICO8 = [
  "#1d2b53",
  "#7e2553",
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

type AvatarPalette = {
  background: string;
  skin: string;
  skinShadow: string;
  hair: string;
  eye: string;
  eyeWhite: string;
  mouth: string;
  brow: string;
};

type AvatarContext = {
  seed: string;
  grid: PixelGrid;
  palette: AvatarPalette;
  gender: Gender;
};

type DrawFn = (ctx: AvatarContext) => void;

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

function pickColor(seed: string, offset: number): string {
  return PICO8[hashString(`${seed}:${offset}`) % PICO8.length] ?? "#83769a";
}

function buildPalette(seed: string, traits: Traits): AvatarPalette {
  const average = Math.round(
    (traits.humor +
      traits.aggression +
      traits.troll +
      traits.woke +
      traits.negacionist +
      traits.radical) /
      5,
  );

  return {
    background: "#1d2b53",
    skin: pickColor(seed, 1),
    skinShadow: pickColor(seed, 2),
    hair: pickColor(seed, 3),
    eye: "#1d2b53",
    eyeWhite: "#fff1e8",
    mouth: pickColor(seed, average + 4),
    brow: pickColor(seed, average + 5),
  };
}

function drawBackground(ctx: AvatarContext): void {
  fillRect(ctx.grid, 0, 0, SIZE, SIZE, ctx.palette.background);
}

function drawFace(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X, FACE_Y, FACE_W, FACE_H, palette.skin);
  fillRect(grid, FACE_X + 2, FACE_Y + FACE_H - 1, FACE_W - 4, 1, palette.skinShadow);
  fillRect(grid, FACE_X + 1, FACE_Y + 3, 1, FACE_H - 5, palette.skinShadow);
  fillRect(grid, FACE_X + FACE_W - 2, FACE_Y + 3, 1, FACE_H - 5, palette.skinShadow);
}

function drawHairShort(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X, FACE_Y - 3, FACE_W, 3, palette.hair);
  fillRect(grid, FACE_X - 1, FACE_Y - 1, FACE_W + 2, 2, palette.hair);
}

function drawHairSidePart(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X - 1, FACE_Y - 3, FACE_W + 1, 3, palette.hair);
  fillRect(grid, FACE_X, FACE_Y, 5, 4, palette.hair);
}

function drawHairBangs(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 1, FACE_Y - 2, FACE_W - 2, 2, palette.hair);
  fillRect(grid, FACE_X + 2, FACE_Y, 3, 2, palette.hair);
  fillRect(grid, FACE_X + 6, FACE_Y, 2, 2, palette.hair);
  fillRect(grid, FACE_X + 9, FACE_Y, 3, 2, palette.hair);
}

function drawHairLong(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X, FACE_Y - 4, FACE_W, 4, palette.hair);
  fillRect(grid, FACE_X - 2, FACE_Y, 2, FACE_H, palette.hair);
  fillRect(grid, FACE_X + FACE_W, FACE_Y, 2, FACE_H, palette.hair);
}

function drawHairBob(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X - 1, FACE_Y - 3, FACE_W + 2, 3, palette.hair);
  fillRect(grid, FACE_X - 2, FACE_Y + 1, 2, 6, palette.hair);
  fillRect(grid, FACE_X + FACE_W, FACE_Y + 1, 2, 6, palette.hair);
}

function drawHairCurly(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  for (const [x, y] of [
    [FACE_X, FACE_Y - 3],
    [FACE_X + 4, FACE_Y - 4],
    [FACE_X + 8, FACE_Y - 3],
    [FACE_X + 12, FACE_Y - 3],
    [FACE_X - 1, FACE_Y + 1],
    [FACE_X + 13, FACE_Y + 1],
  ]) {
    fillRect(grid, x, y, 2, 2, palette.hair);
  }
  fillRect(grid, FACE_X + 2, FACE_Y - 1, FACE_W - 4, 1, palette.hair);
}

function drawHairPonytail(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 1, FACE_Y - 3, FACE_W - 2, 3, palette.hair);
  fillRect(grid, FACE_X + FACE_W + 1, FACE_Y - 1, 2, 8, palette.hair);
}

function drawHairSpiky(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  for (const [x, y] of [
    [FACE_X + 1, FACE_Y - 4],
    [FACE_X + 5, FACE_Y - 5],
    [FACE_X + 9, FACE_Y - 4],
    [FACE_X + 12, FACE_Y - 3],
  ]) {
    fillRect(grid, x, y, 2, 3, palette.hair);
  }
  fillRect(grid, FACE_X, FACE_Y - 2, FACE_W, 2, palette.hair);
}

function drawHairBuzz(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 1, FACE_Y - 2, FACE_W - 2, 2, palette.hair);
}

function drawHairAfro(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X - 2, FACE_Y - 4, FACE_W + 4, 5, palette.hair);
  fillRect(grid, FACE_X - 1, FACE_Y + 1, 2, 3, palette.hair);
  fillRect(grid, FACE_X + FACE_W - 1, FACE_Y + 1, 2, 3, palette.hair);
}

function drawHairUndercut(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X, FACE_Y - 3, FACE_W, 3, palette.hair);
  fillRect(grid, FACE_X + 1, FACE_Y - 1, FACE_W - 2, 1, palette.hair);
  fillRect(grid, FACE_X - 1, FACE_Y + 2, 2, 4, palette.skinShadow);
  fillRect(grid, FACE_X + FACE_W - 1, FACE_Y + 2, 2, 4, palette.skinShadow);
}

function drawHairBald(ctx: AvatarContext): void {
  fillRect(
    ctx.grid,
    FACE_X + 3,
    FACE_Y - 1,
    FACE_W - 6,
    1,
    ctx.palette.skinShadow,
  );
}

function drawHairWavy(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X, FACE_Y - 3, FACE_W, 3, palette.hair);
  fillRect(grid, FACE_X - 2, FACE_Y, 2, 8, palette.hair);
  fillRect(grid, FACE_X + FACE_W, FACE_Y + 2, 2, 7, palette.hair);
  setPixel(grid, FACE_X - 1, FACE_Y + 9, palette.hair);
  setPixel(grid, FACE_X + FACE_W + 1, FACE_Y + 10, palette.hair);
}

function drawHair(ctx: AvatarContext): void {
  const feminine: DrawFn[] = [
    drawHairLong,
    drawHairBob,
    drawHairBangs,
    drawHairCurly,
    drawHairPonytail,
    drawHairWavy,
    drawHairSidePart,
  ];
  const masculine: DrawFn[] = [
    drawHairShort,
    drawHairSidePart,
    drawHairSpiky,
    drawHairBuzz,
    drawHairUndercut,
    drawHairBald,
  ];
  const neutral: DrawFn[] = [
    ...feminine,
    ...masculine,
    drawHairAfro,
    drawHairCurly,
  ];

  const styles = isFeminineGender(ctx.gender)
    ? feminine
    : isMasculineGender(ctx.gender)
      ? masculine
      : neutral;

  const index = seededInt(ctx.seed, 20, 0, styles.length - 1);
  styles[index]?.(ctx);
}

function drawBrowsNeutral(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 3, FACE_Y + 4, 3, 1, ctx.palette.brow);
  fillRect(ctx.grid, FACE_X + 8, FACE_Y + 4, 3, 1, ctx.palette.brow);
}

function drawBrowsRaised(ctx: AvatarContext): void {
  setPixel(ctx.grid, FACE_X + 3, FACE_Y + 3, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 5, FACE_Y + 3, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 3, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 10, FACE_Y + 3, ctx.palette.brow);
}

function drawBrowsAngry(ctx: AvatarContext): void {
  setPixel(ctx.grid, FACE_X + 3, FACE_Y + 5, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 5, FACE_Y + 4, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 4, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 10, FACE_Y + 5, ctx.palette.brow);
}

function drawBrowsSad(ctx: AvatarContext): void {
  setPixel(ctx.grid, FACE_X + 3, FACE_Y + 4, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 5, FACE_Y + 5, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 5, ctx.palette.brow);
  setPixel(ctx.grid, FACE_X + 10, FACE_Y + 4, ctx.palette.brow);
}

function drawEyesRound(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 2, FACE_Y + 6, 3, 3, palette.eyeWhite);
  fillRect(grid, FACE_X + 9, FACE_Y + 6, 3, 3, palette.eyeWhite);
  setPixel(grid, FACE_X + 3, FACE_Y + 7, palette.eye);
  setPixel(grid, FACE_X + 10, FACE_Y + 7, palette.eye);
}

function drawEyesAlmond(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 2, FACE_Y + 7, 4, 2, palette.eyeWhite);
  fillRect(grid, FACE_X + 8, FACE_Y + 7, 4, 2, palette.eyeWhite);
  setPixel(grid, FACE_X + 3, FACE_Y + 7, palette.eye);
  setPixel(grid, FACE_X + 10, FACE_Y + 7, palette.eye);
}

function drawEyesWide(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 2, FACE_Y + 5, 4, 4, palette.eyeWhite);
  fillRect(grid, FACE_X + 8, FACE_Y + 5, 4, 4, palette.eyeWhite);
  setPixel(grid, FACE_X + 4, FACE_Y + 7, palette.eye);
  setPixel(grid, FACE_X + 10, FACE_Y + 7, palette.eye);
}

function drawEyesSleepy(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 2, FACE_Y + 8, 4, 1, ctx.palette.eye);
  fillRect(ctx.grid, FACE_X + 8, FACE_Y + 8, 4, 1, ctx.palette.eye);
}

function drawEyesHappy(ctx: AvatarContext): void {
  setPixel(ctx.grid, FACE_X + 2, FACE_Y + 8, ctx.palette.eye);
  setPixel(ctx.grid, FACE_X + 4, FACE_Y + 8, ctx.palette.eye);
  setPixel(ctx.grid, FACE_X + 3, FACE_Y + 7, ctx.palette.eye);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 8, ctx.palette.eye);
  setPixel(ctx.grid, FACE_X + 10, FACE_Y + 8, ctx.palette.eye);
  setPixel(ctx.grid, FACE_X + 9, FACE_Y + 7, ctx.palette.eye);
}

function drawEyesWink(ctx: AvatarContext): void {
  drawEyesRound(ctx);
  fillRect(ctx.grid, FACE_X + 8, FACE_Y + 8, 4, 1, ctx.palette.eye);
}

function drawEyesSide(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, FACE_X + 3, FACE_Y + 6, 3, 3, palette.eyeWhite);
  fillRect(grid, FACE_X + 9, FACE_Y + 6, 3, 3, palette.eyeWhite);
  setPixel(grid, FACE_X + 4, FACE_Y + 7, palette.eye);
  setPixel(grid, FACE_X + 9, FACE_Y + 7, palette.eye);
}

function drawEyesDots(ctx: AvatarContext): void {
  setPixel(ctx.grid, FACE_X + 3, FACE_Y + 7, ctx.palette.eye);
  setPixel(ctx.grid, FACE_X + 10, FACE_Y + 7, ctx.palette.eye);
}

function drawEyes(ctx: AvatarContext): void {
  const eyeStyles: DrawFn[] = [
    drawEyesRound,
    drawEyesAlmond,
    drawEyesWide,
    drawEyesSleepy,
    drawEyesHappy,
    drawEyesWink,
    drawEyesSide,
    drawEyesDots,
  ];
  const browStyles: DrawFn[] = [
    drawBrowsNeutral,
    drawBrowsRaised,
    drawBrowsAngry,
    drawBrowsSad,
  ];

  const eyeIndex = seededInt(ctx.seed, 31, 0, eyeStyles.length - 1);
  const browIndex = seededInt(ctx.seed, 33, 0, browStyles.length - 1);

  browStyles[browIndex]?.(ctx);
  eyeStyles[eyeIndex]?.(ctx);
}

function drawMouthSmile(ctx: AvatarContext): void {
  const y = FACE_Y + 11;
  setPixel(ctx.grid, FACE_X + 4, y, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 5, y + 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 6, y + 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 7, y + 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 8, y + 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 9, y, ctx.palette.mouth);
}

function drawMouthGrin(ctx: AvatarContext): void {
  const y = FACE_Y + 11;
  fillRect(ctx.grid, FACE_X + 4, y, 6, 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 3, y, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 10, y, ctx.palette.mouth);
}

function drawMouthSmirk(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 4, FACE_Y + 11, 4, 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 12, ctx.palette.mouth);
}

function drawMouthFrown(ctx: AvatarContext): void {
  setPixel(ctx.grid, FACE_X + 4, FACE_Y + 12, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 5, FACE_Y + 11, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 6, FACE_Y + 11, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 7, FACE_Y + 11, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 12, ctx.palette.mouth);
}

function drawMouthOpen(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 5, FACE_Y + 11, 4, 2, ctx.palette.mouth);
}

function drawMouthSurprised(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 6, FACE_Y + 11, 2, 2, ctx.palette.mouth);
}

function drawMouthNeutral(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 5, FACE_Y + 11, 4, 1, ctx.palette.mouth);
}

function drawMouthPout(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 6, FACE_Y + 12, 2, 1, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 5, FACE_Y + 11, ctx.palette.mouth);
  setPixel(ctx.grid, FACE_X + 8, FACE_Y + 11, ctx.palette.mouth);
}

function drawMouthFlat(ctx: AvatarContext): void {
  fillRect(ctx.grid, FACE_X + 4, FACE_Y + 12, 6, 1, ctx.palette.mouth);
}

function drawMouth(ctx: AvatarContext): void {
  const styles: DrawFn[] = [
    drawMouthSmile,
    drawMouthGrin,
    drawMouthSmirk,
    drawMouthFrown,
    drawMouthOpen,
    drawMouthSurprised,
    drawMouthNeutral,
    drawMouthPout,
    drawMouthFlat,
  ];

  const index = seededInt(ctx.seed, 32, 0, styles.length - 1);
  styles[index]?.(ctx);
}

function drawDoorClassic(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 6, 3, 12, 19, palette.hair);
  fillRect(grid, 7, 4, 10, 17, palette.skin);
  fillRect(grid, 7, 4, 1, 17, palette.skinShadow);
  fillRect(grid, 9, 6, 6, 4, palette.eyeWhite);
  fillRect(grid, 10, 7, 4, 2, palette.background);
  fillRect(grid, 14, 14, 1, 2, palette.mouth);
  setPixel(grid, 14, 13, palette.brow);
  fillRect(grid, 6, 21, 12, 2, palette.skinShadow);
}

function drawDoorArched(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 7, 6, 10, 15, palette.skin);
  fillRect(grid, 6, 5, 12, 16, palette.hair);
  fillRect(grid, 8, 4, 8, 2, palette.hair);
  fillRect(grid, 9, 3, 6, 1, palette.hair);
  fillRect(grid, 7, 6, 1, 15, palette.skinShadow);
  fillRect(grid, 14, 15, 1, 2, palette.mouth);
  fillRect(grid, 6, 20, 12, 2, palette.skinShadow);
}

function drawDoorWindow(ctx: AvatarContext): void {
  const { grid, palette } = ctx;
  fillRect(grid, 6, 4, 12, 18, palette.hair);
  fillRect(grid, 7, 5, 10, 16, palette.skin);
  fillRect(grid, 8, 6, 8, 5, palette.eyeWhite);
  fillRect(grid, 9, 7, 6, 3, palette.background);
  fillRect(grid, 8, 13, 8, 1, palette.skinShadow);
  fillRect(grid, 8, 15, 8, 1, palette.skinShadow);
  fillRect(grid, 15, 14, 1, 2, palette.mouth);
  fillRect(grid, 6, 21, 12, 2, palette.skinShadow);
}

function drawDoor(ctx: AvatarContext): void {
  const styles: DrawFn[] = [drawDoorClassic, drawDoorArched, drawDoorWindow];
  const index = seededInt(ctx.seed, 40, 0, styles.length - 1);
  styles[index]?.(ctx);
}

export function generateProceduralPixelAvatar(input: {
  name: string;
  handle: string;
  gender: Gender;
  archetype: Archetype;
  traits: Traits;
}): string {
  const seed = `${input.handle}:${input.name}`;
  const grid: PixelGrid = new Map();
  const palette = buildPalette(seed, input.traits);
  const ctx: AvatarContext = {
    seed,
    grid,
    palette,
    gender: input.gender,
  };

  drawBackground(ctx);

  if (isDoorGender(input.gender)) {
    drawDoor(ctx);
    return encodeSvgDataUrl(grid);
  }

  drawHair(ctx);
  drawFace(ctx);
  drawEyes(ctx);
  drawMouth(ctx);

  return encodeSvgDataUrl(grid);
}
