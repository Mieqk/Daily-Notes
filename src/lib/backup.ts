/** Ключи, которые не нужны в резервной копии: защита входа и служебные отметки синхронизации. */
const SKIP = /^dn\.(pin|bio|syncedUser|reminderFired|tab|fitMerged\..*)$/;

export interface Backup {
  app: 'daily-notes';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Собирает все данные приложения из localStorage (ключи dn.*) в один объект. */
export function buildBackup(storage: Pick<Storage, 'length' | 'key' | 'getItem'>, now: Date = new Date()): Backup {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith('dn.') || SKIP.test(key)) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return { app: 'daily-notes', version: 1, exportedAt: now.toISOString(), data };
}

export type RestoreMode = 'merge' | 'replace';

export interface RestoreSummary {
  notes: number;
  tasks: number;
  photos: number;
  moods: number;
  sleep: number;
  foods: number;
  workouts: number;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: 'format' | 'version' | 'empty' };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Проверяет файл копии: формат, версию, и оставляет только свои ключи (PIN и служебные отметки не принимаем). */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'format' };
  }
  if (!isObj(raw) || raw.app !== 'daily-notes' || !isObj(raw.data)) return { ok: false, error: 'format' };
  if (typeof raw.version !== 'number' || raw.version > 1) return { ok: false, error: 'version' };
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw.data)) {
    if (k.startsWith('dn.') && !SKIP.test(k)) data[k] = v;
  }
  if (Object.keys(data).length === 0) return { ok: false, error: 'empty' };
  return { ok: true, backup: { app: 'daily-notes', version: 1, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '', data } };
}

/** Сколько «штук» лежит в значении: непустые тексты, элементы списков, сумма списков по датам. */
export function countItems(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (!isObj(value)) return 0;
  return Object.values(value).reduce<number>((sum, v) => {
    if (Array.isArray(v)) return sum + v.length;
    if (typeof v === 'string') return sum + (v.trim() ? 1 : 0);
    return sum + 1;
  }, 0);
}

const itemKey = (x: unknown) => (isObj(x) && x.id !== undefined ? `id:${String(x.id)}` : JSON.stringify(x));

/** Объединение без потерь: то, что уже есть, остаётся; добавляется только новое (списки сравниваются по id, остальное по ключу). */
export function mergeValue(existing: unknown, incoming: unknown): unknown {
  if (existing === undefined || existing === null) return incoming;
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const seen = new Set(existing.map(itemKey));
    const extra = incoming.filter((x) => {
      const key = itemKey(x);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return extra.length ? [...existing, ...extra] : existing;
  }
  if (isObj(existing) && isObj(incoming)) {
    const out: Record<string, unknown> = { ...existing };
    for (const [k, v] of Object.entries(incoming)) {
      const cur = out[k];
      // пустая запись на этом устройстве уступает записи из копии
      if (typeof cur === 'string' && !cur.trim() && typeof v === 'string') out[k] = v;
      else out[k] = k in out ? mergeValue(cur, v) : v;
    }
    return out;
  }
  return existing;
}

const read = (storage: Pick<Storage, 'getItem'>, key: string): unknown => {
  const raw = storage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/** Что окажется в хранилище после восстановления (ничего не записывает). */
export function planRestore(storage: Pick<Storage, 'getItem'>, backup: Backup, mode: RestoreMode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, incoming] of Object.entries(backup.data)) {
    out[key] = mode === 'replace' ? incoming : mergeValue(read(storage, key), incoming);
  }
  return out;
}

const COUNTED: Record<keyof RestoreSummary, string> = {
  notes: 'dn.notes', tasks: 'dn.tasks', photos: 'dn.photos', moods: 'dn.moods', sleep: 'dn.sleep', foods: 'dn.foods', workouts: 'dn.workoutLog',
};

/** Сводка для подтверждения: сколько всего в файле и сколько из этого добавится (`added`). */
export function summarize(storage: Pick<Storage, 'getItem'>, backup: Backup, mode: RestoreMode): { inFile: RestoreSummary; added: RestoreSummary } {
  const plan = planRestore(storage, backup, mode);
  const inFile = {} as RestoreSummary;
  const added = {} as RestoreSummary;
  for (const [name, key] of Object.entries(COUNTED) as [keyof RestoreSummary, string][]) {
    inFile[name] = countItems(backup.data[key]);
    added[name] = key in plan ? Math.max(0, countItems(plan[key]) - countItems(read(storage, key))) : 0;
  }
  return { inFile, added };
}

const FIT_KEY = /^dn\.(foods|foodLog|foodGoal|workoutLog|workoutTpl|restLen|dayTemplates|plugins|pluginData)$/;

/**
 * Записывает копию в хранилище. Если место кончилось, возвращает прежние значения и сообщает об ошибке.
 * Питание и тренировки помечаем изменёнными и сбрасываем отметку слияния, чтобы синхронизация добавила их в аккаунт;
 * dn.syncedUser сбрасываем, чтобы при входе записи и задачи из копии добавились в аккаунт, а не были затёрты им.
 */
export function applyRestore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>, backup: Backup, mode: RestoreMode): boolean {
  const plan = planRestore(storage, backup, mode);
  const previous = new Map<string, string | null>();
  const touched: string[] = [];
  const put = (key: string, value: string | null) => {
    if (!previous.has(key)) previous.set(key, storage.getItem(key));
    touched.push(key);
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  };
  try {
    for (const [key, value] of Object.entries(plan)) {
      put(key, JSON.stringify(value));
      const fit = FIT_KEY.exec(key);
      if (!fit) continue;
      put(`dn.fitDirty.${fit[1]}`, '1');
      const stale: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith('dn.fitMerged.') && k.endsWith(`.${fit[1]}`)) stale.push(k);
      }
      stale.forEach((k) => put(k, null));
    }
    put('dn.syncedUser', null);
    return true;
  } catch {
    for (const key of touched.reverse()) {
      const old = previous.get(key);
      try {
        if (old === null || old === undefined) storage.removeItem(key);
        else storage.setItem(key, old);
      } catch { /* ничего не поделать */ }
    }
    return false;
  }
}
