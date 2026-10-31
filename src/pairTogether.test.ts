import { describe, expect, it } from 'vitest';
import { countdown, goalProgress, localInputToISO, moodAverage, moodByDay, pairKey, suggestedTouch } from './lib/pairTogether';

describe('pairTogether', () => {
  it('обратный отсчёт: дни, часы, минуты и прошедшее событие', () => {
    const now = Date.UTC(2026, 0, 1, 12, 0);
    expect(countdown(now + 2 * 86_400_000 + 3 * 3_600_000 + 5 * 60_000, now)).toEqual({ past: false, days: 2, hours: 3, minutes: 5 });
    expect(countdown(now - 3_600_000, now)).toEqual({ past: true, days: 0, hours: 1, minutes: 0 });
  });
  it('поле даты: пустое и битое значение дают null', () => {
    expect(localInputToISO('')).toBeNull();
    expect(localInputToISO('nope')).toBeNull();
    expect(localInputToISO('2026-05-01T18:30')).toMatch(/^2026-05-0\dT/);
  });
  it('прогресс цели считает отметки обоих и не выходит за 100%', () => {
    const marks = [
      { goal_id: 'g', user_id: 'me', day: '2026-01-01' }, { goal_id: 'g', user_id: 'me', day: '2026-01-02' },
      { goal_id: 'g', user_id: 'him', day: '2026-01-02' }, { goal_id: 'other', user_id: 'me', day: '2026-01-02' },
    ];
    const p = goalProgress(marks, 'g', 4, 'me', '2026-01-02');
    expect(p).toMatchObject({ total: 3, mine: 2, theirs: 1, done: false, markedToday: true });
    expect(p.ratio).toBeCloseTo(0.75);
    expect(goalProgress(marks, 'g', 2, 'him', '2026-01-01')).toMatchObject({ done: true, ratio: 1, markedToday: false });
  });
  it('настроение: только чем поделились, среднее по заполненным дням', () => {
    const rows = [{ user_id: 'a', day: 'd1', mood: 4 }, { user_id: 'a', day: 'd3', mood: 1 }, { user_id: 'b', day: 'd2', mood: 2 }];
    const vals = moodByDay(rows, 'a', ['d1', 'd2', 'd3']);
    expect(vals).toEqual([4, null, 1]);
    expect(moodAverage(vals)).toBe(2.5);
    expect(moodAverage([null, null])).toBeNull();
  });
  it('какое касание предложить по времени суток', () => {
    expect(suggestedTouch(8)).toBe('goodmorning');
    expect(suggestedTouch(23)).toBe('goodnight');
    expect(suggestedTouch(2)).toBe('goodnight');
    expect(suggestedTouch(15)).toBe('thinking');
  });
  it('ключ пары не зависит от порядка', () => {
    expect(pairKey('b', 'a')).toEqual({ user_a: 'a', user_b: 'b' });
    expect(pairKey('a', 'b')).toEqual({ user_a: 'a', user_b: 'b' });
  });
});
