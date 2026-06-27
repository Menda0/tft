export const AVATAR_SIZE = 64;
export const DESIGN_SIZE = 24;

export type PixelGrid = Map<string, string>;

function designToCanvas(value: number): number {
  return Math.floor((value * AVATAR_SIZE) / DESIGN_SIZE);
}

export function setPixel(
  grid: PixelGrid,
  x: number,
  y: number,
  color: string,
): void {
  fillRect(grid, x, y, 1, 1, color);
}

export function fillRect(
  grid: PixelGrid,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  const x0 = designToCanvas(x);
  const y0 = designToCanvas(y);
  const x1 = designToCanvas(x + width);
  const y1 = designToCanvas(y + height);

  for (let row = y0; row < y1; row += 1) {
    for (let col = x0; col < x1; col += 1) {
      if (col < 0 || row < 0 || col >= AVATAR_SIZE || row >= AVATAR_SIZE) continue;
      grid.set(`${col},${row}`, color);
    }
  }
}

export function gridToSvg(grid: PixelGrid): string {
  const rects = Array.from(grid.entries())
    .map(([key, color]) => {
      const [x, y] = key.split(",").map(Number);
      return `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AVATAR_SIZE} ${AVATAR_SIZE}" shape-rendering="crispEdges">${rects}</svg>`;
}

export function encodeSvgDataUrl(grid: PixelGrid): string {
  const encoded = Buffer.from(gridToSvg(grid)).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

export const PIXEL_ART_STYLE =
  "64x64 pixel grid, retro 64-bit console sprite style, crisp square pixels, hard edges, limited palette";
