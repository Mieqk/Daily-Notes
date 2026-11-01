import { describe, expect, it } from 'vitest';
import { availOf, bothFreeDays, cleanNote, nextAvail, type AvailRow } from './lib/pairAvailability';
import { makeAvail } from './pair-availability-strings';

const rows: AvailRow[] = [
  { user_id: 'a', day: '2026-11-05', status: 'free', note: null },
  { user_id: 'b', day: '2026-11-05', status: 'evening', note: null },
  { user_id: 'a', day: '2026-11-06', status: 'busy', note: 'сдача проекта' },
  { user_id: 'b', day: '2026-11-06', status: 'free', note: null },
];

describe('pairAvailability', () => {
  it('нажатия идут по кругу и заканчиваются снятием', () => {
    expect(nextAvail(null)).toBe('busy');
    expect(nextAvail('busy')).toBe('evening');
    expect(nextAvail('evening')).toBe('free');
    expect(nextAvail('free')).toBeNull();
  });
  it('находит отметку человека на день', () => {
    expect(availOf(rows, 'a', '2026-11-06')?.note).toBe('сдача проекта');
    expect(availOf(rows, 'a', '2026-11-07')).toBeNull();
  });
  it('общие свободные дни: занятость одного исключает день', () => {
    expect(bothFreeDays(rows, 'a', 'b', ['2026-11-05', '2026-11-06', '2026-11-07'])).toEqual(['2026-11-05']);
  });
  it('комментарий чистится и обрезается', () => {
    expect(cleanNote('   ')).toBeNull();
    expect(cleanNote('  до   восьми ')).toBe('до восьми');
    expect(cleanNote('x'.repeat(100))).toHaveLength(40);
  });
  it('тексты есть на всех языках', () => {
    for (const l of ['ru', 'en', 'be', 'uk', 'de', 'fr', 'es'] as const) {
      expect(makeAvail(l)('title').length).toBeGreaterThan(0);
      expect(makeAvail(l)('hint')).toContain('{name}');
    }
  });
});
