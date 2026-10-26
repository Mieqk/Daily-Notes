import { describe, expect, it } from 'vitest';
import { mergeById, mergeLog, preferRemote } from './fitnessSync';

interface Item { id: string; name: string }
const it1 = (id: string, name = id): Item => ({ id, name });

describe('mergeById', () => {
  it('сначала свои, затем чужие, которых нет', () => {
    const out = mergeById<Item>()([it1('a'), it1('b')], [it1('c'), it1('a', 'чужой')]);
    expect(out).toEqual([it1('a'), it1('b'), it1('c')]);
  });
  it('при совпадении id побеждает локальная версия', () => {
    expect(mergeById<Item>()([it1('a', 'моя')], [it1('a', 'облако')])).toEqual([it1('a', 'моя')]);
  });
  it('не меняет исходные массивы', () => {
    const local = [it1('a')];
    const remote = [it1('b')];
    mergeById<Item>()(local, remote);
    expect(local).toHaveLength(1);
    expect(remote).toHaveLength(1);
  });
  it('sameKey убирает дубли с разными id', () => {
    const merge = mergeById<Item>((x) => x.name.toLowerCase());
    expect(merge([it1('1', 'Яблоко')], [it1('2', 'Яблоко'), it1('3', 'Груша')])).toEqual([it1('1', 'Яблоко'), it1('3', 'Груша')]);
  });
  it('пустые списки', () => {
    expect(mergeById<Item>()([], [])).toEqual([]);
    expect(mergeById<Item>()([], [it1('a')])).toEqual([it1('a')]);
    expect(mergeById<Item>()([it1('a')], [])).toEqual([it1('a')]);
  });
});

describe('mergeLog', () => {
  it('объединяет внутри каждой даты и добавляет новые даты', () => {
    const local = { '2026-10-01': [it1('a')] };
    const remote = { '2026-10-01': [it1('a'), it1('b')], '2026-10-02': [it1('c')] };
    expect(mergeLog<Item>()(local, remote)).toEqual({
      '2026-10-01': [it1('a'), it1('b')],
      '2026-10-02': [it1('c')],
    });
  });
  it('даты только у себя остаются', () => {
    expect(mergeLog<Item>()({ d: [it1('a')] }, {})).toEqual({ d: [it1('a')] });
  });
  it('не меняет исходные объекты', () => {
    const local = { d: [it1('a')] };
    mergeLog<Item>()(local, { d: [it1('b')] });
    expect(local.d).toHaveLength(1);
  });
  it('повторное слияние ничего не меняет (без дублей)', () => {
    const merge = mergeLog<Item>();
    const once = merge({ d: [it1('a')] }, { d: [it1('b')] });
    expect(merge(once, { d: [it1('b')] })).toEqual(once);
  });
});

describe('preferRemote', () => {
  it('берёт значение из аккаунта', () => {
    expect(preferRemote(1, 2)).toBe(2);
  });
});
