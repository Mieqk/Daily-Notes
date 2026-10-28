// Память Искры: короткие факты и цели, которые пользователь сам разрешил запоминать.
// Хранятся только на устройстве (localStorage) и уходят в ИИ вместе с запросом лишь при включённой памяти.
export interface MemoryFact { id: string; text: string }
export interface SparkMemory { on: boolean; facts: MemoryFact[] }

export const MAX_FACTS = 20;
export const MAX_FACT_LEN = 160;

export const EMPTY_MEMORY: SparkMemory = { on: false, facts: [] };

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_FACT_LEN);

export function sanitizeMemory(raw: unknown): SparkMemory {
  const r = (raw && typeof raw === "object" ? raw : {}) as { on?: unknown; facts?: unknown };
  const seen = new Set<string>();
  const facts: MemoryFact[] = [];
  for (const f of Array.isArray(r.facts) ? r.facts : []) {
    const text = clean((f as { text?: unknown })?.text);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    facts.push({ id: String((f as { id?: unknown })?.id || key).slice(0, 40), text });
    if (facts.length >= MAX_FACTS) break;
  }
  return { on: r.on === true, facts };
}

/** Добавляет факт; возвращает ту же память, если текст пустой, повторяется или место кончилось. */
export function addFact(m: SparkMemory, text: string, id: string): SparkMemory {
  const t = clean(text);
  if (!t || m.facts.length >= MAX_FACTS || m.facts.some((f) => f.text.toLowerCase() === t.toLowerCase())) return m;
  return { ...m, facts: [...m.facts, { id, text: t }] };
}

export const removeFact = (m: SparkMemory, id: string): SparkMemory => ({ ...m, facts: m.facts.filter((f) => f.id !== id) });

/** Что уходит в запрос к ИИ: пусто, пока память выключена. */
export const memoryForRequest = (m: SparkMemory): string[] => (m.on ? m.facts.map((f) => f.text) : []);
