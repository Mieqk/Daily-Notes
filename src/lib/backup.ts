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
