import { describe, expect, it } from 'vitest';
import { plantState } from './lib/pairPlant';

describe('plantState', () => {
  it('пустое растение: росток, не вянет', () => {
    const s = plantState([], 'me', '2026-11-05');
    expect(s).toMatchObject({ points: 0, stage: 0, toNext: 4, wilting: false, mineToday: false });
  });
  it('очко за полив и бонус, если полили оба', () => {
    const s = plantState([
      { user_id: 'me', day: '2026-11-04' }, { user_id: 'her', day: '2026-11-04' },
      { user_id: 'me', day: '2026-11-05' },
    ], 'me', '2026-11-05');
    expect(s.points).toBe(4);
    expect(s.stage).toBe(1);
    expect(s.mineToday).toBe(true);
    expect(s.theirsToday).toBe(false);
  });
  it('вянет без полива 3 дня', () => {
    const c = [{ user_id: 'me', day: '2026-11-01' }];
    expect(plantState(c, 'me', '2026-11-03').wilting).toBe(false);
    expect(plantState(c, 'me', '2026-11-04').wilting).toBe(true);
  });
  it('последняя стадия без «до следующей»', () => {
    const c = Array.from({ length: 30 }, (_, i) => [{ user_id: 'me', day: `2026-10-${String(i + 1).padStart(2, '0')}` }, { user_id: 'her', day: `2026-10-${String(i + 1).padStart(2, '0')}` }]).flat();
    const s = plantState(c, 'me', '2026-10-30');
    expect(s.stage).toBe(4);
    expect(s.toNext).toBeNull();
  });
});
