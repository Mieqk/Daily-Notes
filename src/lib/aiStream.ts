export interface CoachFinal {
  reply?: string;
  items?: unknown[];
  sources?: { title: string; url: string }[];
  error?: string;
  detail?: string;
}

export type StreamEvent = { kind: 'delta'; text: string } | { kind: 'final'; data: CoachFinal } | null;

/** Одна строка потокового ответа ИИ (NDJSON): кусок текста {"d"}, итог {"done"|"error"|"reply"} или мусор (null). */
export function parseStreamLine(raw: string): StreamEvent {
  const line = raw.trim();
  if (!line) return null;
  let ev: CoachFinal & { d?: unknown; done?: boolean };
  try { ev = JSON.parse(line); } catch { return null; }
  if (!ev || typeof ev !== 'object') return null;
  if (typeof ev.d === 'string') return { kind: 'delta', text: ev.d };
  if (ev.done || ev.error || typeof ev.reply === 'string') return { kind: 'final', data: ev };
  return null;
}
