export type BreathPhase = "in" | "hold" | "out" | "rest";
export interface BreathPattern { id: string; steps: { phase: BreathPhase; sec: number }[] }

export const BREATH_PATTERNS: BreathPattern[] = [
  { id: "box", steps: [{ phase: "in", sec: 4 }, { phase: "hold", sec: 4 }, { phase: "out", sec: 4 }, { phase: "rest", sec: 4 }] },
  { id: "478", steps: [{ phase: "in", sec: 4 }, { phase: "hold", sec: 7 }, { phase: "out", sec: 8 }] },
  { id: "calm", steps: [{ phase: "in", sec: 4 }, { phase: "out", sec: 6 }] },
];

export const cycleLength = (p: BreathPattern): number => p.steps.reduce((s, x) => s + x.sec, 0);

/** Фаза и номер круга через t секунд после старта. */
export function phaseAt(p: BreathPattern, t: number): { phase: BreathPhase; left: number; cycle: number } {
  const len = cycleLength(p);
  const cycle = Math.floor(t / len);
  let r = t - cycle * len;
  for (const s of p.steps) {
    if (r < s.sec) return { phase: s.phase, left: Math.ceil(s.sec - r), cycle };
    r -= s.sec;
  }
  return { phase: p.steps[0].phase, left: p.steps[0].sec, cycle };
}
