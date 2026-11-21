import { createRandom } from "./random";

export const GLYPH_COLUMNS = 5;
export const GLYPH_ROWS = 7;
export type Glyph = readonly number[];
export const BLANK_GLYPH: Glyph = [0, 0, 0, 0, 0, 0, 0];
export const FULL_GLYPH: Glyph = [31, 31, 31, 31, 31, 31, 31];

const strokes: readonly Glyph[] = [
  [31, 0, 0, 0, 0, 0, 0], [0, 0, 0, 31, 0, 0, 0], [0, 0, 0, 0, 0, 0, 31],
  [16, 16, 16, 16, 16, 16, 16], [4, 4, 4, 4, 4, 4, 4], [1, 1, 1, 1, 1, 1, 1],
  [16, 16, 16, 16, 0, 0, 0], [0, 0, 0, 16, 16, 16, 16],
  [1, 1, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 1],
  [16, 8, 8, 4, 2, 2, 1], [1, 2, 2, 4, 8, 8, 16],
  [28, 28, 28, 0, 0, 0, 0], [0, 0, 0, 0, 7, 7, 7],
  [28, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 7],
];

export function createGlyphPool(size: number, seed: number): readonly Glyph[] {
  const random = createRandom(seed);
  const pool: Glyph[] = [];
  for (let i = 0; i < size; i++) {
    if (random() < 0.06) {
      pool.push(BLANK_GLYPH);
      continue;
    }
    const glyph = [...BLANK_GLYPH];
    const available = strokes.map((_, index) => index);
    const count = 2 + Math.floor(random() * 3);
    for (let j = 0; j < count; j++) {
      const index = Math.floor(random() * available.length);
      const stroke = strokes[available.splice(index, 1)[0]];
      for (let row = 0; row < GLYPH_ROWS; row++) glyph[row] |= stroke[row];
    }
    if (random() < 0.15) {
      const dots: [number, number][] = [];
      for (let row = 0; row < GLYPH_ROWS; row++) {
        for (let column = 0; column < GLYPH_COLUMNS; column++) {
          if (glyph[row] & (16 >> column)) dots.push([row, column]);
        }
      }
      const remove = 1 + Math.floor(random() * 3);
      for (let j = 0; j < remove && dots.length; j++) {
        const [row, column] = dots.splice(Math.floor(random() * dots.length), 1)[0];
        glyph[row] &= ~(16 >> column);
      }
    }
    pool.push(glyph);
  }
  return pool;
}
