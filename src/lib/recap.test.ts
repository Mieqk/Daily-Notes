import { describe, expect, it } from 'vitest';
import { computeBadges, computeRecap, habitStreaks, streakOf, type RecapData } from './recap';

const empty = (): RecapData => ({ notes: {}, tasks: {}, moods: {}, sleep: {} });
const sl = (hours: number) => ({ hours, quality: 3, bedtime: '', waketime: '', awakenings: 0, note: '' });

describe('streakOf', () => {
  it('считает текущую и лучшую серию', () => {
    const r = streakOf(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'], '2026-10-11');
    expect(r).toEqual({ current: 2, best: 3 });
  });
  it('серия не обрывается, пока сегодня ещё пусто', () => {
    expect(streakOf(['2026-10-09', '2026-10-10'], '2026-10-11').current).toBe(2);
  });
  it('пропуск вчера обнуляет текущую серию', () => {
    expect(streakOf(['2026-10-08', '2026-10-09'], '2026-10-11')).toEqual({ current: 0, best: 2 });
  });
  it('пусто', () => {
    expect(streakOf([], '2026-10-11')).toEqual({ current: 0, best: 0 });
  });
  it('переход через конец месяца', () => {
    expect(streakOf(['2026-09-30', '2026-10-01'], '2026-10-01').current).toBe(2);
  });
});

describe('computeRecap', () => {
  const d = empty();
  d.notes['2026-10-10'] = 'один два три';
  d.notes['2026-10-11'] = '   ';
  d.tasks['2026-10-10'] = [{ id: '1', text: 'a', done: true }, { id: '2', text: 'b', done: false }];
  d.moods['2026-10-09'] = 4;
  d.moods['2026-10-10'] = 2;
  d.sleep['2026-10-10'] = sl(8);
  d.sleep['2026-10-09'] = sl(6);
  it('суммирует за неделю', () => {
    const r = computeRecap(d, 7, '2026-10-11');
    expect(r.from).toBe('2026-10-05');
    expect(r.entries).toBe(1);
    expect(r.words).toBe(3);
    expect([r.tasksDone, r.tasksTotal]).toEqual([1, 2]);
    expect(r.avgMood).toBe(3);
    expect(r.avgSleep).toBe(7);
    expect(r.sleepNights).toBe(2);
    expect(r.active).toHaveLength(7);
    expect(r.active.filter(Boolean)).toHaveLength(2);
  });
  it('старые дни за пределами периода не считаются', () => {
    expect(computeRecap(d, 1, '2026-10-11').entries).toBe(0);
  });
  it('без данных средние пустые', () => {
    const r = computeRecap(empty(), 7, '2026-10-11');
    expect(r.avgMood).toBeNull();
    expect(r.avgSleep).toBeNull();
  });
});

describe('habitStreaks и значки', () => {
  it('серии по четырём привычкам', () => {
    const d = empty();
    for (const iso of ['2026-10-09', '2026-10-10', '2026-10-11']) {
      d.notes[iso] = 'текст';
      d.moods[iso] = 3;
    }
    d.tasks['2026-10-11'] = [{ id: '1', text: 'a', done: true }];
    d.tasks['2026-10-10'] = [{ id: '2', text: 'b', done: false }];
    const s = habitStreaks(d, '2026-10-11');
    expect(s.write.current).toBe(3);
    expect(s.mood.best).toBe(3);
    expect(s.tasks).toEqual({ current: 1, best: 1 });
    expect(s.sleep).toEqual({ current: 0, best: 0 });
  });
  it('значок выдаётся по лучшей серии и остаётся после перерыва', () => {
    const d = empty();
    for (let i = 1; i <= 7; i++) d.notes[`2026-09-${String(i).padStart(2, '0')}`] = 'x';
    const b = Object.fromEntries(computeBadges(d, '2026-10-11').map((x) => [x.id, x]));
    expect(b.write3.done).toBe(true);
    expect(b.write7.done).toBe(true);
    expect(b.write30.done).toBe(false);
    expect(b.write30.have).toBe(7);
    expect(b.entries10.have).toBe(7);
  });
});
