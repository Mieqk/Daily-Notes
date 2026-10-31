import { describe, expect, it } from 'vitest';
import { sessionsToDays } from './healthSleep';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

describe('sessionsToDays', () => {
  it('ночная сессия записывается на день пробуждения с часами и качеством', () => {
    const r = sessionsToDays([{ start: at(28, 23, 30), end: at(29, 7, 0), awakenings: 1 }]);
    expect(r['2026-10-29']).toMatchObject({ bedtime: '23:30', waketime: '07:00', hours: 7.5, awakenings: 1, quality: 5 });
  });
  it('короткая дремота пропускается, из двух сессий берётся длинная', () => {
    const r = sessionsToDays([
      { start: at(29, 14, 0), end: at(29, 14, 40), awakenings: 0 },
      { start: at(28, 23, 0), end: at(29, 3, 0), awakenings: 0 },
      { start: at(29, 3, 30), end: at(29, 7, 30), awakenings: 0 },
    ]);
    expect(Object.keys(r)).toEqual(['2026-10-29']);
    expect(r['2026-10-29'].bedtime).toBe('23:00');
  });
});
