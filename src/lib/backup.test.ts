import { describe, expect, it } from 'vitest';
import { applyRestore, buildBackup, mergeValue, parseBackup, summarize } from './backup';

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

const memStorage = (items: Record<string, string>) => {
  const m = new Map(Object.entries(items));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
};
const file = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'daily-notes', version: 1, exportedAt: '2026-10-28T00:00:00.000Z', data, ...extra });

describe('разбор копии', () => {
  it('принимает копию, сделанную кнопкой экспорта', () => {
    const src = buildBackup(fakeStorage({ 'dn.notes': '{"2026-10-01":"a"}' }));
    const r = parseBackup(JSON.stringify(src));
    expect(r.ok && r.backup.data).toEqual({ 'dn.notes': { '2026-10-01': 'a' } });
  });
  it('отклоняет не-JSON, чужой файл и более новую версию', () => {
    expect(parseBackup('не json')).toEqual({ ok: false, error: 'format' });
    expect(parseBackup('{"app":"x","version":1,"data":{}}')).toEqual({ ok: false, error: 'format' });
    expect(parseBackup(file({ 'dn.notes': {} }, { version: 2 }))).toEqual({ ok: false, error: 'version' });
    expect(parseBackup(file({ other: 1 }))).toEqual({ ok: false, error: 'empty' });
  });
  it('выбрасывает PIN, биометрию и чужие ключи', () => {
    const r = parseBackup(file({ 'dn.pin': 'x', 'dn.bio': 'y', 'dn.syncedUser': 'u', 'evil': 1, 'dn.moods': { a: 1 } }));
    expect(r.ok && Object.keys(r.backup.data)).toEqual(['dn.moods']);
  });
});

describe('слияние', () => {
  it('записи: своё остаётся, добавляется только новое, пустое заполняется', () => {
    const merged = mergeValue({ a: 'моё', b: '  ' }, { a: 'чужое', b: 'из копии', c: 'новое' });
    expect(merged).toEqual({ a: 'моё', b: 'из копии', c: 'новое' });
  });
  it('списки с id объединяются по id, без дублей', () => {
    const merged = mergeValue({ d1: [{ id: '1', text: 'x', done: true }] }, { d1: [{ id: '1', text: 'y', done: false }, { id: '2', text: 'z', done: false }], d2: [{ id: '3' }] });
    expect(merged).toEqual({ d1: [{ id: '1', text: 'x', done: true }, { id: '2', text: 'z', done: false }], d2: [{ id: '3' }] });
  });
  it('настройки на устройстве не перезаписываются в режиме слияния', () => {
    expect(mergeValue('dark', 'light')).toBe('dark');
    expect(mergeValue(undefined, 'light')).toBe('light');
  });
});

describe('восстановление', () => {
  const backup = (data: Record<string, unknown>) => { const r = parseBackup(file(data)); if (!r.ok) throw new Error('bad'); return r.backup; };

  it('сводка считает всё и новое', () => {
    const st = memStorage({ 'dn.notes': '{"2026-10-01":"a"}' });
    const s = summarize(st, backup({ 'dn.notes': { '2026-10-01': 'x', '2026-10-02': 'y' }, 'dn.foods': [{ id: 1 }] }), 'merge');
    expect(s.inFile).toMatchObject({ notes: 2, foods: 1, tasks: 0 });
    expect(s.added).toMatchObject({ notes: 1, foods: 1 });
  });
  it('слияние сохраняет существующее, замена перекрывает', () => {
    const b = backup({ 'dn.notes': { '2026-10-01': 'из копии', '2026-10-02': 'новая' } });
    const st = memStorage({ 'dn.notes': '{"2026-10-01":"моя","2026-10-05":"ещё"}' });
    expect(applyRestore(st, b, 'merge')).toBe(true);
    expect(JSON.parse(st.getItem('dn.notes')!)).toEqual({ '2026-10-01': 'моя', '2026-10-05': 'ещё', '2026-10-02': 'новая' });
    expect(applyRestore(st, b, 'replace')).toBe(true);
    expect(JSON.parse(st.getItem('dn.notes')!)).toEqual({ '2026-10-01': 'из копии', '2026-10-02': 'новая' });
  });
  it('не трогает PIN и биометрию, сбрасывает метку входа', () => {
    const st = memStorage({ 'dn.pin': '"hash"', 'dn.bio': '"id"', 'dn.syncedUser': '"u"' });
    applyRestore(st, backup({ 'dn.moods': { a: 3 } }), 'replace');
    expect(st.getItem('dn.pin')).toBe('"hash"');
    expect(st.getItem('dn.bio')).toBe('"id"');
    expect(st.getItem('dn.syncedUser')).toBeNull();
  });
  it('питание и тренировки помечаются для синхронизации', () => {
    const st = memStorage({ 'dn.fitMerged.u1.foods': 'true' });
    applyRestore(st, backup({ 'dn.foods': [{ id: 1 }], 'dn.workoutLog': [] }), 'merge');
    expect(st.getItem('dn.fitDirty.foods')).toBe('1');
    expect(st.getItem('dn.fitDirty.workoutLog')).toBe('1');
    expect(st.getItem('dn.fitMerged.u1.foods')).toBeNull();
  });
  it('при ошибке записи возвращает прежнее', () => {
    const st = memStorage({ 'dn.notes': '{"a":"1"}' });
    const real = st.setItem;
    let n = 0;
    st.setItem = (k, v) => { if (++n === 2) throw new Error('quota'); real(k, v); };
    expect(applyRestore(st, backup({ 'dn.notes': { b: '2' }, 'dn.moods': { a: 1 } }), 'merge')).toBe(false);
    expect(st.getItem('dn.notes')).toBe('{"a":"1"}');
    expect(st.getItem('dn.moods')).toBeNull();
  });
});
