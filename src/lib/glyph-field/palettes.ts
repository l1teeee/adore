export type Rgb = readonly [number, number, number];
export type PaletteColors = { background: Rgb; stripeA: Rgb; stripeB: Rgb; dot: Rgb };

export const ANTIQUE_PALETTES: readonly PaletteColors[] = [
  { background: [185, 185, 185], stripeA: [143, 143, 143], stripeB: [43, 43, 43], dot: [17, 17, 17] },
  { background: [201, 183, 156], stripeA: [156, 138, 110], stripeB: [59, 47, 34], dot: [74, 44, 23] },
  { background: [196, 174, 170], stripeA: [151, 127, 123], stripeB: [58, 40, 38], dot: [90, 42, 42] },
  { background: [169, 180, 187], stripeA: [125, 138, 147], stripeB: [36, 49, 58], dot: [34, 54, 74] },
  { background: [181, 184, 158], stripeA: [138, 141, 114], stripeB: [47, 51, 36], dot: [46, 59, 36] },
];

export const PALETTE_TIMING = { holdMs: 3000, transitionMs: 5000 } as const;

export function paletteAt(elapsedMs: number, palettes: readonly PaletteColors[]): PaletteColors {
  if (palettes.length === 0) {
    throw new Error("Palettes must not be empty");
  }
  const step = PALETTE_TIMING.holdMs + PALETTE_TIMING.transitionMs;
  const index = Math.floor(elapsedMs / step) % palettes.length;
  const local = elapsedMs % step;
  const current = palettes[index];
  if (local < PALETTE_TIMING.holdMs) {
    return current;
  }
  const next = palettes[(index + 1) % palettes.length];
  const progress = (local - PALETTE_TIMING.holdMs) / PALETTE_TIMING.transitionMs;
  const eased = progress * progress * (3 - 2 * progress);
  const blend = (a: Rgb, b: Rgb): Rgb => [
    Math.round(a[0] + (b[0] - a[0]) * eased),
    Math.round(a[1] + (b[1] - a[1]) * eased),
    Math.round(a[2] + (b[2] - a[2]) * eased),
  ];
  return {
    background: blend(current.background, next.background),
    stripeA: blend(current.stripeA, next.stripeA),
    stripeB: blend(current.stripeB, next.stripeB),
    dot: blend(current.dot, next.dot),
  };
}

export function toCssColor(color: Rgb): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
