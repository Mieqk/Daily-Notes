import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_KIND, isPairKind, kindMeta, readKind, writeKind } from './lib/pairKind';

describe('pairKind', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
    } as Storage;
  });
  it('по умолчанию нейтральная связь, а не романтическая', () => {
    expect(DEFAULT_KIND).toBe('friend');
    expect(readKind('u1')).toBe('friend');
  });
  it('выбор запоминается отдельно для каждого человека', () => {
    writeKind('u1', 'love');
    writeKind('u2', 'family');
    expect(readKind('u1')).toBe('love');
    expect(readKind('u2')).toBe('family');
    expect(readKind('u3')).toBe('friend');
  });
  it('мусор в хранилище игнорируется', () => {
    localStorage.setItem('dn.pairKind.u9', 'enemy');
    expect(readKind('u9')).toBe('friend');
    expect(isPairKind('love')).toBe(true);
    expect(isPairKind('enemy')).toBe(false);
    expect(kindMeta('bestie').icon).toBe('🌟');
  });
});
