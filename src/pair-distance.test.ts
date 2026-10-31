import { describe, expect, it } from 'vitest';
import { coarsePoint, formatKm, geoStale, roundCoord } from './lib/pairDistance';

describe('pairDistance', () => {
  it('координаты округляются до 0,1 градуса', () => {
    expect(roundCoord(53.90453)).toBe(53.9);
    expect(coarsePoint(53.9045, 27.5615)).toEqual({ lat: 53.9, lon: 27.6 });
  });
  it('битые координаты отбрасываются', () => {
    expect(coarsePoint(NaN, 10)).toBeNull();
    expect(coarsePoint(95, 10)).toBeNull();
    expect(coarsePoint(10, 200)).toBeNull();
  });
  it('отметка старше получаса считается устаревшей', () => {
    const now = Date.parse('2026-11-05T12:00:00Z');
    expect(geoStale(null, now)).toBe(true);
    expect(geoStale('2026-11-05T11:45:00Z', now)).toBe(false);
    expect(geoStale('2026-11-05T11:00:00Z', now)).toBe(true);
  });
  it('километры форматируются, ноль даёт пустую строку', () => {
    expect(formatKm(120, 'en')).toMatch(/120/);
    expect(formatKm(0, 'en')).toBe('');
  });
});
