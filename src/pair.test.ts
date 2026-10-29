import { describe, expect, it } from 'vitest';
import { circularMean, fmtMin, nightSpan, sleepState, syncedNights, typicalSleep, weekSummary } from './lib/pairSleep';

const n = (day: string, bedtime: string, waketime: string, hours = 8) => ({ day, hours, quality: 3, bedtime, waketime });

describe('pairSleep', () => {
  it('среднее время по кругу переходит через полночь', () => {
    expect(fmtMin(circularMean([23 * 60 + 30, 30])!)).toBe('00:00');
  });
  it('типичный сон требует трёх ночей', () => {
    expect(typicalSleep([n('a', '23:00', '07:00'), n('b', '23:00', '07:00')])).toBeNull();
    const t = typicalSleep([n('a', '23:00', '07:00'), n('b', '23:00', '07:00'), n('c', '23:00', '07:00')])!;
    expect(fmtMin(t.bed)).toBe('23:00');
    expect(fmtMin(t.wake)).toBe('07:00');
  });
  it('статус сна: ночью спит, в сети не спит, записанный подъём важнее', () => {
    const typical = { bed: 23 * 60, wake: 7 * 60 };
    expect(sleepState({ nowMin: 3 * 60, typical, online: false, wokeToday: null })).toBe('asleep');
    expect(sleepState({ nowMin: 3 * 60, typical, online: true, wokeToday: null })).toBe('awake');
    expect(sleepState({ nowMin: 12 * 60, typical, online: false, wokeToday: null })).toBe('unknown');
    expect(sleepState({ nowMin: 8 * 60, typical, online: false, wokeToday: '07:10' })).toBe('up');
    expect(sleepState({ nowMin: 3 * 60, typical: null, online: false, wokeToday: null })).toBe('unknown');
  });
  it('шкала ночи 18:00–14:00', () => {
    const s = nightSpan('23:00', '07:00')!;
    expect(s.left).toBeCloseTo(0.25);
    expect(s.width).toBeCloseTo(0.4);
    expect(nightSpan(null, '07:00')).toBeNull();
  });
  it('итоги недели и совместный отбой', () => {
    const mine = [n('d1', '23:00', '07:00', 8), n('d2', '00:10', '08:00', 7.5)];
    const theirs = [n('d1', '23:20', '07:00', 7), n('d2', '02:00', '09:00', 7)];
    expect(weekSummary(mine, ['d1', 'd2']).avgHours).toBe(7.8);
    expect(syncedNights(mine, theirs, ['d1', 'd2'])).toEqual({ synced: 1, both: 2 });
  });
});
