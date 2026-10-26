import { describe, expect, it } from 'vitest';
import { buildBackup } from './backup';

const fakeStorage = (items: Record<string, string>) => {
  const keys = Object.keys(items);
  return { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => items[k] ?? null };
};

describe('резервная копия', () => {
  it('собирает ключи dn.* и разбирает JSON', () => {
    const b = buildBackup(
      fakeStorage({ 'dn.notes': '{"2026-10-26":"привет"}', 'dn.foods': '[{"id":1}]', 'other': '1', 'dn.raw': 'не json' }),
      new Date('2026-10-26T10:00:00Z'),
    );
    expect(b.exportedAt).toBe('2026-10-26T10:00:00.000Z');
    expect(b.data).toEqual({ 'dn.notes': { '2026-10-26': 'привет' }, 'dn.foods': [{ id: 1 }], 'dn.raw': 'не json' });
  });
  it('не включает PIN, биометрию и служебные отметки', () => {
    const b = buildBackup(
      fakeStorage({ 'dn.pin': '"1"', 'dn.bio': '"x"', 'dn.syncedUser': '"u"', 'dn.fitMerged.u.foods': 'true', 'dn.tab': '"daily"', 'dn.moods': '{}' }),
    );
    expect(Object.keys(b.data)).toEqual(['dn.moods']);
  });
});
