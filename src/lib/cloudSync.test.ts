import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: null }));
import { applyDocs, emptyState, findChannel, hashStr, readLocalDocs, reconcileMissing, reconcileRemote, scanChanges, splitDocs, type Store } from './cloudSync';
import { mergeRemoteChanges } from './sync';

function memStore(init: Record<string, string> = {}): Store & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    get length() { return Object.keys(data).length; },
    key: (i: number) => Object.keys(data)[i] ?? null,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  } as Store & { data: Record<string, string> };
}

const ch = (k: string) => findChannel(k)!;

describe('splitDocs / applyDocs', () => {
  it('список объектов раскладывается по id и собирается обратно', () => {
    const raw = JSON.stringify([{ id: 'a', n: 1 }, { id: 'b', n: 2 }]);
    const docs = splitDocs(ch('dn.bgCustom'), 'dn.bgCustom', raw);
    expect(Object.keys(docs)).toEqual(['dn.bgCustom#a', 'dn.bgCustom#b']);
    const next = applyDocs(ch('dn.bgCustom'), 'dn.bgCustom', raw, { 'dn.bgCustom#a': null, 'dn.bgCustom#c': '{"id":"c","n":3}', 'dn.bgCustom#b': '{"id":"b","n":9}' });
    expect(JSON.parse(next!)).toEqual([{ id: 'b', n: 9 }, { id: 'c', n: 3 }]);
  });

  it('список строк (любимые друзья) работает по самой строке', () => {
    const docs = splitDocs(ch('dn.favFriends'), 'dn.favFriends', '["u1","u2"]');
    expect(Object.keys(docs)).toEqual(['dn.favFriends#u1', 'dn.favFriends#u2']);
    expect(JSON.parse(applyDocs(ch('dn.favFriends'), 'dn.favFriends', '["u1"]', { 'dn.favFriends#u2': '"u2"', 'dn.favFriends#u1': null })!)).toEqual(['u2']);
  });

  it('словарь раскладывается по ключам, запись добавляется и удаляется', () => {
    const docs = splitDocs(ch('dn.answers'), 'dn.answers', '{"2026-01-01":"да","2026-01-02":"нет"}');
    expect(Object.keys(docs)).toHaveLength(2);
    const next = applyDocs(ch('dn.answers'), 'dn.answers', '{"2026-01-01":"да"}', { 'dn.answers#2026-01-02': '"нет"', 'dn.answers#2026-01-01': null });
    expect(JSON.parse(next!)).toEqual({ '2026-01-02': 'нет' });
  });

  it('одиночное значение хранится как есть, в том числе не JSON', () => {
    expect(splitDocs(ch('dn.pairKind.u1'), 'dn.pairKind.u1', 'love')).toEqual({ 'dn.pairKind.u1': 'love' });
    expect(applyDocs(ch('dn.pairKind.u1'), 'dn.pairKind.u1', 'love', { 'dn.pairKind.u1': null })).toBeNull();
  });

  it('битый JSON не ломает', () => {
    expect(splitDocs(ch('dn.answers'), 'dn.answers', '{oops')).toEqual({});
    expect(JSON.parse(applyDocs(ch('dn.bgCustom'), 'dn.bgCustom', '{oops', { 'dn.bgCustom#a': '{"id":"a"}' })!)).toEqual([{ id: 'a' }]);
  });
});

describe('очередь изменений (scanChanges)', () => {
  it('новое на устройстве попадает в очередь, нетронутое значение по умолчанию нет', () => {
    const st = emptyState();
    const store = memStore({ 'dn.reminder': '{"time":"20:00","enabled":false}', 'dn.answers': '{"d":"x"}', 'dn.notes': '{}' });
    const local = readLocalDocs(store, st);
    expect(Object.keys(local)).toEqual(['dn.answers#d']);
    expect(scanChanges(st, local, 1000)).toBe(1);
    expect(st.docs['dn.answers#d'].p).toBe(1000);
  });

  it('правка после отправки снова ставится в очередь, возврат к отправленному снимает', () => {
    const st = emptyState();
    const c1 = '"a"';
    st.docs['dn.answers#d'] = { h: hashStr(c1), o: hashStr(c1), ts: 500 };
    const mk = (v: string) => ({ 'dn.answers#d': { c: v, h: hashStr(v) } });
    expect(scanChanges(st, mk('"b"'), 900)).toBe(1);
    expect(st.docs['dn.answers#d'].p).toBe(900);
    expect(scanChanges(st, mk(c1), 950)).toBe(0);
    expect(st.docs['dn.answers#d'].p).toBeUndefined();
  });

  it('удаление отправленного ставится в очередь как надгробие, а созданное и сразу удалённое исчезает', () => {
    const st = emptyState();
    st.docs['dn.answers#sent'] = { h: 'x', o: 'x', ts: 10 };
    st.docs['dn.answers#new'] = { h: null, o: 'y', ts: 0, p: 20 };
    expect(scanChanges(st, {}, 100)).toBe(1);
    expect(st.docs['dn.answers#sent'].p).toBe(100);
    expect(st.docs['dn.answers#new']).toBeUndefined();
  });

  it('новая версия строго позже известной, даже если часы отстают', () => {
    const st = emptyState();
    st.docs['k'] = { h: 'a', o: 'a', ts: 5000 };
    scanChanges(st, { k: { c: 'z', h: 'zz' } }, 100);
    expect(st.docs['k'].p).toBe(5001);
  });
});

describe('reconcileRemote (конфликты)', () => {
  const local = (id: string, c: string) => ({ [id]: { c, h: hashStr(c) } });

  it('новое устройство: облако главнее, без своей правки подтягиваем более новое', () => {
    const st = emptyState();
    const w = reconcileRemote(st, local('a', '"mine"'), [{ id: 'a', c: '"cloud"', ts: 10 }, { id: 'b', c: '"new"', ts: 11 }]);
    expect(w).toEqual({ a: '"cloud"', b: '"new"' });
    expect(st.docs.a.p).toBeUndefined();
  });

  it('на новом устройстве значение, замеченное сканом перед чтением, всё равно уступает облаку', () => {
    const st = emptyState();
    const l = local('a', '"mine"');
    scanChanges(st, l, Date.now());
    expect(reconcileRemote(st, l, [{ id: 'a', c: '"cloud"', ts: 10 }])).toEqual({ a: '"cloud"' });
    expect(st.docs.a.p).toBeUndefined();
  });

  it('одинаковое содержимое ничего не пишет', () => {
    const st = emptyState();
    expect(reconcileRemote(st, local('a', '"same"'), [{ id: 'a', c: '"same"', ts: 10 }])).toEqual({});
    expect(st.docs.a.ts).toBe(10);
  });

  it('своя неотправленная правка новее облака побеждает, старее проигрывает', () => {
    const st = emptyState();
    st.docs.a = { h: 'old', o: 'mine', ts: 5, p: 100 };
    st.docs.b = { h: 'old', o: 'mine', ts: 5, p: 100 };
    const l = { ...local('a', '"mine"'), ...local('b', '"mine"') };
    const w = reconcileRemote(st, l, [{ id: 'a', c: '"cloud"', ts: 50 }, { id: 'b', c: '"cloud"', ts: 200 }]);
    expect(w).toEqual({ b: '"cloud"' });
    expect(st.docs.a.p).toBe(100);
    expect(st.docs.b.p).toBeUndefined();
  });

  it('удаление из облака применяется, если у нас нет своей правки', () => {
    const st = emptyState();
    st.docs.a = { h: hashStr('"x"'), o: hashStr('"x"'), ts: 5 };
    expect(reconcileRemote(st, local('a', '"x"'), [{ id: 'a', c: null, ts: 9 }])).toEqual({ a: null });
  });

  it('уже виденную версию повторно не применяет', () => {
    const st = emptyState();
    st.docs.a = { h: hashStr('"x"'), o: hashStr('"y"'), ts: 9, p: 20 };
    expect(reconcileRemote(st, local('a', '"y"'), [{ id: 'a', c: '"x"', ts: 9 }])).toEqual({});
  });

  it('документ, пропавший из облака целиком (аккаунт очищен), удаляется и здесь, если мы его не правили', () => {
    const st = emptyState();
    st.docs.a = { h: 'x', o: 'x', ts: 5 };
    st.docs.b = { h: 'x', o: 'y', ts: 5, p: 50 };
    const l = { ...local('a', '"1"'), ...local('b', '"2"') };
    expect(reconcileMissing(st, l, new Set())).toEqual({ a: null });
    expect(st.docs.b).toBeDefined();
  });
});

describe('mergeRemoteChanges (подтягивание чужих правок в открытое приложение)', () => {
  const never = () => false;
  it('берёт то, что изменилось в облаке и чего мы не трогали', () => {
    expect(mergeRemoteChanges({ a: 'old' }, { a: 'old' }, { a: 'new', b: 'x' }, never)).toEqual({ a: 'new', b: 'x' });
  });
  it('своя неотправленная правка не затирается', () => {
    expect(mergeRemoteChanges({ a: 'old' }, { a: 'mine' }, { a: 'new' }, (k) => k === 'a')).toEqual({ a: 'mine' });
  });
  it('облако не менялось: локальные правки остаются', () => {
    expect(mergeRemoteChanges({ a: 'old' }, { a: 'mine' }, { a: 'old' }, never)).toEqual({ a: 'mine' });
  });
  it('удаление в облаке применяется', () => {
    expect(mergeRemoteChanges({ a: 'x', b: 'y' }, { a: 'x', b: 'y' }, { b: 'y' }, never)).toEqual({ b: 'y' });
  });
});
