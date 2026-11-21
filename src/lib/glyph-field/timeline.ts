export type RevealPhase = "chaos" | "forming" | "hold" | "dissolve";
export const REVEAL_TIMING = { firstChaosMs: 600, chaosMs: 2600, formingMs: 900, holdMs: 2800, dissolveMs: 900 } as const;

export function revealStateAt(elapsedMs: number): { cycle: number; phase: RevealPhase; progress: number } {
  const { firstChaosMs, chaosMs, formingMs, holdMs, dissolveMs } = REVEAL_TIMING;
  const firstLength = firstChaosMs + formingMs + holdMs + dissolveMs;
  const cycleLength = chaosMs + formingMs + holdMs + dissolveMs;
  let cycle = 0;
  let time = Math.max(0, elapsedMs);
  if (time >= firstLength) {
    time -= firstLength;
    cycle = 1 + Math.floor(time / cycleLength);
    time %= cycleLength;
  }
  const phases: [RevealPhase, number][] = [["chaos", cycle === 0 ? firstChaosMs : chaosMs], ["forming", formingMs], ["hold", holdMs], ["dissolve", dissolveMs]];
  for (const [phase, duration] of phases) {
    if (time < duration) return { cycle, phase, progress: time / duration };
    time -= duration;
  }
  return { cycle, phase: "dissolve", progress: 1 };
}
