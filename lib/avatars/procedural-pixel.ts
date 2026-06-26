import type { Archetype } from "@/lib/personalities/archetypes";
import {
  isFeminineGender,
  isMasculineGender,
  type Gender,
} from "@/lib/personalities/gender";
import type { Traits } from "@/lib/types/personality";

const PICO8 = [
  "#000000",
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

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickColor(seed: string, offset: number): string {
  const index = hashString(`${seed}:${offset}`) % PICO8.length;
  return PICO8[index] ?? "#83769a";
}

function traitColor(traits: Traits, offset: number): string {
  const average = Math.round(
    (traits.humor +
      traits.charisma +
      traits.curiosity +
      traits.chaos +
      traits.empathy +
      (10 - traits.aggression)) /
      6,
  );

  return PICO8[(average + offset) % PICO8.length] ?? "#29adff";
}

function genderHairRows(gender: Gender): number[] {
  if (isFeminineGender(gender)) {
    return [2, 3, 4, 5, 6, 7, 8, 9];
  }

  if (isMasculineGender(gender)) {
    return [2, 3, 4, 5, 6];
  }

  return [2, 3, 4, 5, 6, 7];
}

function archetypeAccent(archetype: Archetype): string {
  const accents: Record<Archetype, string> = {
    comedian: "#ffec27",
    journalist: "#fff1e8",
    reply_guy: "#29adff",
    conspiracy: "#83769a",
    artist: "#ff77a8",
    tech_bro: "#00e436",
    philosopher: "#c2c3c7",
    troll: "#ff004d",
    fan_account: "#ffa300",
    boomer: "#ab5236",
    poet: "#ff77a8",
    coach: "#00e436",
    detective: "#5f574f",
  };

  return accents[archetype] ?? "#29adff";
}

function setPixel(
  grid: Map<string, string>,
  x: number,
  y: number,
  color: string,
): void {
  grid.set(`${x},${y}`, color);
}

function fillRect(
  grid: Map<string, string>,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      setPixel(grid, col, row, color);
    }
  }
}

export function generateProceduralPixelAvatar(input: {
  name: string;
  handle: string;
  gender: Gender;
  archetype: Archetype;
  traits: Traits;
}): string {
  const seed = `${input.handle}:${input.name}`;
  const grid = new Map<string, string>();
  const background = "#1d2b53";
  const skin = pickColor(seed, 1);
  const hair = pickColor(seed, 2);
  const shirt = traitColor(input.traits, 3);
  const accent = archetypeAccent(input.archetype);
  const eye = "#1d2b53";

  fillRect(grid, 0, 0, 16, 16, background);

  for (const row of genderHairRows(input.gender)) {
    fillRect(grid, 4, row, 8, 1, hair);
  }

  fillRect(grid, 5, 6, 6, 5, skin);
  fillRect(grid, 4, 7, 1, 2, hair);
  fillRect(grid, 11, 7, 1, 2, hair);
  setPixel(grid, 6, 8, eye);
  setPixel(grid, 9, 8, eye);
  fillRect(grid, 6, 10, 4, 1, pickColor(seed, 4));

  fillRect(grid, 4, 12, 8, 3, shirt);
  fillRect(grid, 3, 13, 1, 2, shirt);
  fillRect(grid, 12, 13, 1, 2, shirt);
  fillRect(grid, 7, 13, 2, 1, accent);

  const rects = Array.from(grid.entries())
    .map(([key, color]) => {
      const [x, y] = key.split(",").map(Number);
      return `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`;
  const encoded = Buffer.from(svg).toString("base64");

  return `data:image/svg+xml;base64,${encoded}`;
}
