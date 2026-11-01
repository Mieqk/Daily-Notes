import { describe, expect, it } from 'vitest';
import { nextAvailability, sharedFreeDays, statusByDay } from './lib/pairAvailability';
import { makeTogether } from './pair-together-strings';
import type { Lang } from './i18n';

const rows = [
  { user_id: 'me', day: 'd1', status: 'free' as const },
  { user_id: 'me', day: 'd2', status: 'busy' as const },
  { user_id: 'me', day: 'd3', status: 'free' as const },
  { user_id: 'her', day: 'd1', status: 'free' as const },
  { user_id: 'her', day: 'd2', status: 'free' as const },
  { user_id: 'her', day: 'd4', status: 'free' as const },
];

describe('pairAvailability', () => {
  it('касание переключает: пусто -> свободно -> занято -> пусто', () => {
    expect(nextAvailability(null)).toBe('free');
    expect(nextAvailability('free')).toBe('busy');
    expect(nextAvailability('busy')).toBeNull();
  });
  it('статусы по дням: пусто там, где не отмечено, чужие строки не мешают', () => {
    expect(statusByDay(rows, 'me', ['d1', 'd2', 'd4'])).toEqual(['free', 'busy', null]);
    expect(statusByDay(rows, 'her', ['d3', 'd4'])).toEqual([null, 'free']);
  });
  it('общие свободные дни: только там, где свободны оба, в порядке списка', () => {
    expect(sharedFreeDays(rows, 'me', 'her', ['d1', 'd2', 'd3', 'd4'])).toEqual(['d1']);
    expect(sharedFreeDays([], 'me', 'her', ['d1'])).toEqual([]);
  });
  it('тексты есть на всех 7 языках', () => {
    const keys = ['aTitle', 'aHint', 'aFree', 'aBusy', 'aUnset', 'aTap', 'aBoth', 'aNone', 'aWait', 'aThis', 'aNext'] as const;
    for (const lang of ['ru', 'en', 'be', 'uk', 'de', 'fr', 'es'] as Lang[]) {
      const t = makeTogether(lang);
      for (const k of keys) expect(t(k).length, `${lang}.${k}`).toBeGreaterThan(0);
    }
    expect(makeTogether('de')('aFree')).not.toBe(makeTogether('ru')('aFree'));
  });
});
