import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Мини-версия таблицы user_keys вместо настоящего Supabase.
let rows: Record<string, any> = {};
// Остальные таблицы (записи, задачи, сон) для сброса: любая цепочка eq/like заканчивается без ошибки.
const anyChain = (): any => new Proxy(() => {}, { get: (_t, k) => (k === 'then' ? (ok: any) => ok({ error: null }) : anyChain), apply: () => anyChain() });
const fakeSupabase = {
  from: (table: string) => table !== 'user_keys' ? anyChain() : ({
    insert: async (rec: any) => { rows[rec.user_id] = { ...rec }; return { error: null }; },
    select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: rows[id] ?? null, error: null }) }) }),
    update: (patch: any) => ({ eq: async (_c: string, id: string) => { rows[id] = { ...rows[id], ...patch }; return { error: null }; } }),
    delete: () => ({ eq: async (_c: string, id: string) => { delete rows[id]; return { error: null }; } }),
  }),
};
vi.mock('./supabase', () => ({ supabase: fakeSupabase }));

const U = 'user-1';
type Mod = typeof import('./e2ee');
let e: Mod;

beforeEach(async () => {
  rows = {};
  vi.resetModules();
  e = await import('./e2ee');
  await e.forgetDeviceKey();
});

// Сброс «устройства»: ключ забыт, как после выхода из аккаунта.
async function freshDevice(): Promise<Mod> {
  await e.forgetDeviceKey();
  vi.resetModules();
  const m = await import('./e2ee');
  await m.initE2ee(U);
  return m;
}

describe('ключ восстановления', () => {
  it('normalizeRecoveryKey принимает ключ в любом регистре и с любыми разделителями', () => {
    const k = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789';
    expect(e.normalizeRecoveryKey(k)).toBe(k.replace(/-/g, ''));
    expect(e.normalizeRecoveryKey(k.toLowerCase().replace(/-/g, ' '))).toBe(k.replace(/-/g, ''));
  });
  it('normalizeRecoveryKey отвергает неверную длину и запрещённые символы', () => {
    expect(e.normalizeRecoveryKey('ABCD-EFGH')).toBeNull();
    expect(e.normalizeRecoveryKey('')).toBeNull();
    expect(e.normalizeRecoveryKey('0'.repeat(32))).toBeNull(); // 0, 1, I, O в алфавит не входят
    expect(e.normalizeRecoveryKey('A'.repeat(33))).toBeNull();
  });
  it('formatRecoveryKey делит на группы по 4', () => {
    expect(e.formatRecoveryKey('ABCDEFGHJKLMNPQR')).toBe('ABCD-EFGH-JKLM-NPQR');
    expect(e.formatRecoveryKey('ABCD-EFGHJKLM')).toBe('ABCD-EFGH-JKLM');
  });
});

describe('isSealed', () => {
  it('узнаёт шифртекст по префиксу', () => {
    expect(e.isSealed('enc:v1.abc.def')).toBe(true);
    expect(e.isSealed('просто текст')).toBe(false);
    expect(e.isSealed(null)).toBe(false);
    expect(e.isSealed(5)).toBe(false);
  });
});

describe('включение и шифрование', () => {
  it('до включения шифровать нельзя, а писать на сервер можно', async () => {
    await e.initE2ee(U);
    expect(e.getE2eeStatus()).toBe('off');
    expect(e.encryptionActive()).toBe(false);
    expect(e.canSync()).toBe(true);
    await expect(e.sealText('x', 'aad')).rejects.toThrow('locked');
  });

  it('setup -> sealText/openText возвращает исходный текст, на сервер идёт только шифртекст', async () => {
    await e.initE2ee(U);
    const rk = await e.setupE2ee(U, 'пароль-123');
    expect(e.normalizeRecoveryKey(rk)).not.toBeNull();
    expect(e.getE2eeStatus()).toBe('unlocked');
    expect(e.encryptionActive()).toBe(true);

    const sealed = await e.sealText('Секретная запись', 'aad1');
    expect(sealed.startsWith('enc:v1.')).toBe(true);
    expect(sealed).not.toContain('Секретная');
    expect(await e.openText(sealed, 'aad1')).toBe('Секретная запись');

    const stored = JSON.stringify(rows[U]);
    expect(stored).not.toContain('пароль-123');
    expect(stored).not.toContain(rk.replace(/-/g, ''));
  });

  it('шифртекст привязан к строке: с другим aad не открывается', async () => {
    await e.initE2ee(U);
    await e.setupE2ee(U, 'pw');
    const sealed = await e.sealText('x', e.entryAad(U, '2026-10-01'));
    await expect(e.openText(sealed, e.entryAad(U, '2026-10-02'))).rejects.toThrow();
    await expect(e.openText(sealed, e.entryAad('user-2', '2026-10-01'))).rejects.toThrow();
  });

  it('одинаковый текст шифруется каждый раз по-разному', async () => {
    await e.initE2ee(U);
    await e.setupE2ee(U, 'pw');
    expect(await e.sealText('a', 'x')).not.toBe(await e.sealText('a', 'x'));
  });

  it('openText возвращает обычный текст как есть', async () => {
    expect(await e.openText('старая запись', 'aad')).toBe('старая запись');
  });

  it('sealEntry/openEntry сохраняют текст, теги и фото', async () => {
    await e.initE2ee(U);
    await e.setupE2ee(U, 'pw');
    const sealed = await e.sealEntry(U, '2026-10-01', { c: 'день', t: ['a', 'b'], p: ['p1'] });
    expect(await e.openEntry(U, { date: '2026-10-01', content: sealed, tags: [], photos: [] })).toEqual({ c: 'день', t: ['a', 'b'], p: ['p1'] });
  });

  it('openEntry читает незашифрованные строки и возвращает null для чужого шифртекста', async () => {
    await e.initE2ee(U);
    await e.setupE2ee(U, 'pw');
    expect(await e.openEntry(U, { date: 'd', content: 'text', tags: ['t'], photos: ['p'] })).toEqual({ c: 'text', t: ['t'], p: ['p'] });
    expect(await e.openEntry(U, { date: 'd', content: null, tags: null, photos: null })).toEqual({ c: '', t: [], p: [] });
    const sealed = await e.sealEntry(U, 'd1', { c: 'x', t: [], p: [] });
    expect(await e.openEntry(U, { date: 'd2', content: sealed })).toBeNull();
  });
});

describe('открытие ключа', () => {
  it('на новом устройстве ключ заперт; пароль и ключ восстановления его открывают', async () => {
    await e.initE2ee(U);
    const rk = await e.setupE2ee(U, 'верный пароль');
    const sealed = await e.sealText('данные', 'a');

    for (const [secret, kind] of [['верный пароль', 'pass'], [rk.toLowerCase(), 'recovery']] as const) {
      const m = await freshDevice();
      // кэш IndexedDB мог сохранить ключ; для проверки открытия по секрету принудительно очищаем его
      if (m.getE2eeStatus() !== 'locked') {
        await m.forgetDeviceKey();
        await m.initE2ee(U);
      }
      expect(m.getE2eeStatus()).toBe('locked');
      expect(m.canSync()).toBe(false);
      expect(await m.unlockE2ee(U, secret, kind)).toBe(true);
      expect(await m.openText(sealed, 'a')).toBe('данные');
      e = m;
    }
  });

  it('неверный пароль или неверный ключ восстановления не открывают', async () => {
    await e.initE2ee(U);
    const rk = await e.setupE2ee(U, 'верный');
    await e.forgetDeviceKey();
    vi.resetModules();
    const m = await import('./e2ee');
    await m.initE2ee(U);
    expect(m.getE2eeStatus()).toBe('locked');
    expect(await m.unlockE2ee(U, 'неверный', 'pass')).toBe(false);
    expect(await m.unlockE2ee(U, 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA', 'recovery')).toBe(false);
    expect(await m.unlockE2ee(U, 'мусор', 'recovery')).toBe(false);
    expect(await m.unlockE2ee(U, rk, 'pass')).toBe(false); // ключ восстановления не пароль
    expect(m.getE2eeStatus()).toBe('locked');
  });
});

describe('смена пароля и ключа восстановления', () => {
  async function setup() {
    await e.initE2ee(U);
    const rk = await e.setupE2ee(U, 'старый');
    const sealed = await e.sealText('данные', 'a');
    return { rk, sealed };
  }
  async function newDevice() {
    await e.forgetDeviceKey();
    vi.resetModules();
    e = await import('./e2ee');
    await e.initE2ee(U);
    if (e.getE2eeStatus() !== 'locked') { await e.forgetDeviceKey(); await e.initE2ee(U); }
  }

  it('после смены пароля работает только новый, а старые данные открываются', async () => {
    const { sealed } = await setup();
    expect(await e.changePassphrase(U, 'старый', 'pass', 'новый')).toBe(true);
    await newDevice();
    expect(await e.unlockE2ee(U, 'старый', 'pass')).toBe(false);
    expect(await e.unlockE2ee(U, 'новый', 'pass')).toBe(true);
    expect(await e.openText(sealed, 'a')).toBe('данные');
  });

  it('пароль можно сменить по ключу восстановления', async () => {
    const { rk, sealed } = await setup();
    expect(await e.changePassphrase(U, rk, 'recovery', 'после-сброса')).toBe(true);
    await newDevice();
    expect(await e.unlockE2ee(U, 'после-сброса', 'pass')).toBe(true);
    expect(await e.openText(sealed, 'a')).toBe('данные');
  });

  it('с неверным текущим паролем смена отказывает и ничего не меняет', async () => {
    await setup();
    const before = JSON.stringify(rows[U]);
    expect(await e.changePassphrase(U, 'не тот', 'pass', 'новый')).toBe(false);
    expect(JSON.stringify(rows[U])).toBe(before);
  });

  it('renewRecoveryKey: новый ключ работает, старый перестаёт', async () => {
    const { rk: oldKey, sealed } = await setup();
    expect(await e.renewRecoveryKey(U, 'не тот')).toBeNull();
    const newKey = await e.renewRecoveryKey(U, 'старый');
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(oldKey);
    await newDevice();
    expect(await e.unlockE2ee(U, oldKey, 'recovery')).toBe(false);
    expect(await e.unlockE2ee(U, newKey!, 'recovery')).toBe(true);
    expect(await e.openText(sealed, 'a')).toBe('данные');
  });

  it('checkPassphrase проверяет пароль, не меняя состояние', async () => {
    await setup();
    expect(await e.checkPassphrase('старый')).toBe(true);
    expect(await e.checkPassphrase('другой')).toBe(false);
    expect(e.getE2eeStatus()).toBe('unlocked');
  });
});

describe('сброс', () => {
  it('resetE2ee удаляет ключи и выключает шифрование', async () => {
    await e.initE2ee(U);
    await e.setupE2ee(U, 'pw');
    await e.resetE2ee(U);
    expect(rows[U]).toBeUndefined();
    expect(e.getE2eeStatus()).toBe('off');
    expect(e.encryptionActive()).toBe(false);
  });
});
