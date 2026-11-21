import { createRandom } from "@/lib/glyph-field/random";
import type { Glyph } from "@/lib/glyph-field/glyphs";

const STRIPE_OPACITY = 0.35;

export type GlyphFieldPalette = { background: string; stripeA: string; stripeB: string; dot: string };
export type GlyphFieldLayout = { cssWidth: number; cssHeight: number; offsetX: number; offsetY: number; gridWidth: number; gridHeight: number; dpr: number; columns: number; rows: number; cellWidth: number; cellHeight: number; rowGap: number; dotPitch: number; dotRadius: number };

export function computeLayout(cssWidth: number, cssHeight: number, padding: { top: number; right: number; bottom: number; left: number }, targetCellWidth: number, targetCellHeight: number, minColumns: number, devicePixelRatio: number): GlyphFieldLayout {
  const offsetX = padding.left;
  const offsetY = padding.top;
  const gridWidth = cssWidth - padding.left - padding.right;
  const gridHeight = cssHeight - padding.top - padding.bottom;
  const dpr = Math.min(devicePixelRatio, 2);
  const columns = Math.max(minColumns, Math.floor(gridWidth / targetCellWidth));
  const cellWidth = gridWidth / columns;
  const scaledCellHeight = targetCellHeight * (cellWidth / targetCellWidth);
  const rows = Math.max(1, Math.floor(gridHeight / scaledCellHeight));
  const cellHeight = gridHeight / rows;
  const rowGap = Math.max(2, Math.round(cellHeight * 0.06));
  const dotPitch = Math.min(cellWidth * 0.6 / 5, (cellHeight - rowGap) * 0.78 / 7);
  const dotRadius = dotPitch * 0.36;
  return { cssWidth, cssHeight, offsetX, offsetY, gridWidth, gridHeight, dpr, columns, rows, cellWidth, cellHeight, rowGap, dotPitch, dotRadius };
}

export function renderStripeMasks(layout: GlyphFieldLayout, seed: number): { stripeA: HTMLCanvasElement; stripeB: HTMLCanvasElement } {
  const stripeA = document.createElement("canvas");
  const stripeB = document.createElement("canvas");
  stripeA.width = stripeB.width = Math.round(layout.cssWidth * layout.dpr);
  stripeA.height = stripeB.height = Math.round(layout.cssHeight * layout.dpr);
  const contextA = stripeA.getContext("2d")!;
  const contextB = stripeB.getContext("2d")!;
  contextA.fillStyle = "#ffffff";
  contextB.fillStyle = "#ffffff";
  const random = createRandom(seed);
  const lines: { x: number; isA: boolean }[] = [];
  for (let x = 0; x < layout.gridWidth; x += 3) {
    const value = random();
    if (value < 0.85) {
      lines.push({ x, isA: value < 0.55 });
    }
  }
  for (let row = 0; row < layout.rows; row++) {
    const y = Math.round((layout.offsetY + row * layout.cellHeight) * layout.dpr);
    const bottom = Math.round((layout.offsetY + row * layout.cellHeight + layout.cellHeight - layout.rowGap) * layout.dpr);
    for (const line of lines) {
      const context = line.isA ? contextA : contextB;
      context.fillRect(Math.round((layout.offsetX + line.x) * layout.dpr), y, Math.max(1, Math.round(layout.dpr)), bottom - y);
    }
    for (let column = 0; column < layout.columns; column++) {
      contextB.fillRect(Math.round((layout.offsetX + column * layout.cellWidth) * layout.dpr), y, Math.max(1, Math.round(layout.dpr)), bottom - y);
    }
  }
  return { stripeA, stripeB };
}

export function tintMask(mask: HTMLCanvasElement, target: HTMLCanvasElement, color: string): void {
  const context = target.getContext("2d")!;
  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, target.width, target.height);
  context.globalCompositeOperation = "source-over";
}

export function createDotSprite(layout: GlyphFieldLayout, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const radius = layout.dotRadius * layout.dpr;
  canvas.width = Math.max(1, Math.ceil(radius * 2));
  canvas.height = canvas.width;
  const context = canvas.getContext("2d")!;
  context.fillStyle = color;
  context.beginPath();
  context.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
  context.fill();
  return canvas;
}

export function renderFrame(context: CanvasRenderingContext2D, layout: GlyphFieldLayout, background: string, stripeA: HTMLCanvasElement, stripeB: HTMLCanvasElement, dotSprite: HTMLCanvasElement, pool: readonly Glyph[], cellGlyphs: Uint16Array, visibleCells: Uint8Array): void {
  context.fillStyle = background;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.globalAlpha = STRIPE_OPACITY;
  context.drawImage(stripeA, 0, 0);
  context.drawImage(stripeB, 0, 0);
  context.globalAlpha = 1;
  for (let row = 0; row < layout.rows; row++) {
    for (let column = 0; column < layout.columns; column++) {
      const cell = row * layout.columns + column;
      if (visibleCells[cell] !== 1) {
        continue;
      }
      const glyph = pool[cellGlyphs[cell]];
      const left = layout.offsetX + column * layout.cellWidth + (layout.cellWidth - 5 * layout.dotPitch) / 2;
      const top = layout.offsetY + row * layout.cellHeight + (layout.cellHeight - layout.rowGap - 7 * layout.dotPitch) / 2;
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 5; x++) {
          if (glyph[y] & (16 >> x)) {
            const centerX = (left + (x + 0.5) * layout.dotPitch) * layout.dpr;
            const centerY = (top + (y + 0.5) * layout.dotPitch) * layout.dpr;
            context.drawImage(dotSprite, centerX - dotSprite.width / 2, centerY - dotSprite.height / 2);
          }
        }
      }
    }
  }
}
