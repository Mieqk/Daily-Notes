import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: null }));
import { mergeLocalIntoRemote, type LocalData } from './sync';

const empty = (): LocalData => ({ notes: {}, tasks: {}, moods: {}, tags: {}, photos: {}, sleep: {} });
const task = (id: string) => ({ id, title: id, done: false }) as any;

describe('mergeLocalIntoRemote (первый вход с локальными данными)', () => {
  it('локальная запись, которой нет на сервере, переносится и помечается на выгрузку', () => {
    const local = { ...empty(), notes: { '2026-10-01': 'привет' }, moods: { '2026-10-01': 4 }, tags: { '2026-10-01': ['a'] } };
    const { merged, entries } = mergeLocalIntoRemote(empty(), local);
    expect(merged.notes['2026-10-01']).toBe('привет');
    expect(merged.moods['2026-10-01']).toBe(4);
    expect(merged.tags['2026-10-01']).toEqual(['a']);
    expect([...entries]).toEqual(['2026-10-01']);
  });

  it('серверная запись главнее локальной', () => {
    const remote = { ...empty(), notes: { d: 'с сервера' }, moods: { d: 5 } };
    const local = { ...empty(), notes: { d: 'локальная' }, moods: { d: 1 } };
    const { merged, entries } = mergeLocalIntoRemote(remote, local);
    expect(merged.notes.d).toBe('с сервера');
    expect(merged.moods.d).toBe(5);
    expect(entries.size).toBe(0);
  });

  it('пустая серверная запись заменяется локальной', () => {
    const remote = { ...empty(), notes: { d: '  ' } };
    const local = { ...empty(), notes: { d: 'текст' } };
    expect(mergeLocalIntoRemote(remote, local).merged.notes.d).toBe('текст');
  });

  it('пустые локальные записи не переносятся', () => {
    const local = { ...empty(), notes: { d: '   ' } };
    const { merged, entries } = mergeLocalIntoRemote(empty(), local);
    expect('d' in merged.notes).toBe(false);
    expect(entries.size).toBe(0);
  });

  it('задачи и сон переносятся только там, где на сервере пусто', () => {
    const remote = { ...empty(), tasks: { a: [task('r')] }, sleep: { s1: { note: 'r' } as any } };
    const local = { ...empty(), tasks: { a: [task('l')], b: [task('l2')] }, sleep: { s1: { note: 'l' } as any, s2: { note: 'l2' } as any } };
    const { merged, taskDates, sleepDates } = mergeLocalIntoRemote(remote, local);
    expect(merged.tasks.a).toEqual([task('r')]);
    expect(merged.tasks.b).toEqual([task('l2')]);
    expect([...taskDates]).toEqual(['b']);
    expect(merged.sleep.s1).toEqual({ note: 'r' });
    expect([...sleepDates]).toEqual(['s2']);
  });

  it('не меняет переданные объекты', () => {
    const remote = empty();
    mergeLocalIntoRemote(remote, { ...empty(), notes: { d: 'x' } });
    expect(remote.notes).toEqual({});
  });
});
