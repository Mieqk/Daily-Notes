import { describe, expect, it } from 'vitest';
import { detectCandidate, mergeCandidate, withTimes } from './sleepAuto';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

describe('detectCandidate', () => {
  it('ночная пауза превращается в сон с днём пробуждения', () => {
    expect(detectCandidate(at(28, 23, 40), at(29, 7, 15))).toEqual({ date: '2026-10-29', bedtime: '23:40', waketime: '07:15' });
  });
  it('короткая или дневная пауза не считается сном', () => {
    expect(detectCandidate(at(28, 23, 0), at(29, 0, 30))).toBeNull();
    expect(detectCandidate(at(29, 9, 0), at(29, 14, 30))).toBeNull();
  });
  it('слишком длинная пауза не считается сном', () => {
    expect(detectCandidate(at(26, 22, 0), at(29, 8, 0))).toBeNull();
  });
});

describe('mergeCandidate', () => {
  it('оставляет более длинную паузу за тот же день', () => {
    const long = { date: '2026-10-29', bedtime: '23:00', waketime: '07:00' };
    const short = { date: '2026-10-29', bedtime: '03:30', waketime: '07:00' };
    expect(mergeCandidate(long, short)).toEqual(long);
    expect(mergeCandidate(short, long)).toEqual(long);
  });
  it('новый день заменяет старого кандидата', () => {
    const old = { date: '2026-10-28', bedtime: '23:00', waketime: '07:00' };
    const next = { date: '2026-10-29', bedtime: '01:00', waketime: '07:00' };
    expect(mergeCandidate(old, next)).toEqual(next);
    expect(mergeCandidate(old, null)).toEqual(old);
  });
});

describe('withTimes', () => {
  it('считает часы и качество, сохраняя заметку', () => {
    const r = withTimes({ hours: 0, quality: 0, bedtime: '', waketime: '', awakenings: 0, note: 'сон' }, '23:30', '07:30');
    expect(r).toMatchObject({ hours: 8, quality: 5, note: 'сон' });
  });
});
