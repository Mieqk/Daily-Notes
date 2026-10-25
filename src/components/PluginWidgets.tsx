import type { Lang } from "../i18n";
import { shiftISO } from "../store";
import { isEmptyValue } from "../addons";
import type { Plugin, PluginValue } from "../addons";
import { usePluginData, usePlugins } from "../hooks/useAddons";
import { makeAddonStrings } from "../addon-strings";

const card = "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4";
const smallBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[16px] font-bold transition-all active:scale-90";

/** Числовое значение дня для полоски «7 дней». */
function amount(p: Plugin, v: PluginValue | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (Array.isArray(v)) return v.filter(Boolean).length;
  return typeof v === "string" && v.trim() ? 1 : 0;
}

function maxOf(p: Plugin): number {
  if (p.kind === "scale") return 10;
  if (p.kind === "checklist") return Math.max(p.items.length, 1);
  if (p.kind === "counter" || p.kind === "number") return Math.max(p.goal, 1);
  return 1;
}

/** Виджеты плагинов на странице дня. Пока плагинов нет, ничего не показывает. */
export default function PluginWidgets({ date, lang }: { date: string; lang: Lang }) {
  const t = makeAddonStrings(lang);
  const [plugins] = usePlugins();
  const [data, setData] = usePluginData();
  if (plugins.length === 0) return null;

  const day = data[date] ?? {};
  const set = (id: string, v: PluginValue) =>
    setData((m) => {
      const next = { ...(m[date] ?? {}), [id]: v };
      if (isEmptyValue(v)) delete next[id];
      return { ...m, [date]: next };
    });

  return (
    <div className={card} style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3 className="mb-3 text-[14.5px] font-bold">{t("pwTitle")}</h3>
      <div className="flex flex-col divide-y divide-[var(--line)]">
        {plugins.map((p) => {
          const v = day[p.id];
          const n = typeof v === "number" ? v : 0;
          const week = Array.from({ length: 7 }, (_, i) => amount(p, data[shiftISO(date, i - 6)]?.[p.id]));
          const top = Math.max(maxOf(p), ...week);
          const showWeek = p.kind !== "question";
          return (
            <div key={p.id} className="py-3 first:pt-0 last:pb-0">
              <div className="mb-2 flex items-center gap-2">
                <span aria-hidden className="text-[17px]">{p.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{p.name}</span>
                {showWeek && (
                  <span className="flex h-5 items-end gap-[3px]" title={t("pwWeek")}>
                    {week.map((x, i) => (
                      <span
                        key={i}
                        className={`w-[5px] rounded-sm ${i === 6 ? "bg-[var(--accent)]" : "bg-[var(--accent-soft)]"}`}
                        style={{ height: `${Math.max(12, (x / top) * 100)}%`, opacity: x ? 1 : 0.45 }}
                      />
                    ))}
                  </span>
                )}
              </div>

              {p.kind === "counter" && (
                <div className="flex items-center gap-2">
                  <button className={`${smallBtn} border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent)]`} onClick={() => set(p.id, Math.max(0, +(n - p.step).toFixed(2)))} aria-label="−">−</button>
                  <div className="min-w-0 flex-1 text-center">
                    <span className="font-display text-[20px] font-bold tabular-nums">{n}</span>
                    <span className="ml-1 text-[12px] text-[var(--ink-faint)]">{p.unit}</span>
                    {p.goal > 0 && (
                      <div className="mx-auto mt-1 h-1.5 max-w-[160px] overflow-hidden rounded-full bg-[var(--hover)]">
                        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${Math.min(100, (n / p.goal) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <button className={`${smallBtn} border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]`} onClick={() => set(p.id, +(n + p.step).toFixed(2))} aria-label="+">+</button>
                </div>
              )}

              {p.kind === "number" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={n || ""}
                    onChange={(e) => set(p.id, Math.max(0, Number(e.target.value) || 0))}
                    className="h-10 w-28 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-sm font-semibold tabular-nums outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[12.5px] text-[var(--ink-soft)]">{p.unit}</span>
                  {p.goal > 0 && (
                    <span className={`ml-auto text-[11.5px] font-semibold ${n >= p.goal ? "text-[var(--accent-deep)]" : "text-[var(--ink-faint)]"}`}>
                      {n >= p.goal ? "✓ " : ""}{t("pwGoal").replace("{n}", String(p.goal))}
                    </span>
                  )}
                </div>
              )}

              {p.kind === "scale" && (
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((x) => (
                    <button
                      key={x}
                      onClick={() => set(p.id, n === x ? 0 : x)}
                      className={`h-8 rounded-md text-[12px] font-bold tabular-nums transition-all active:scale-90 ${x <= n ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--hover)] text-[var(--ink-soft)] hover:bg-[var(--accent-soft)]"}`}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              )}

              {p.kind === "check" && (
                <div className="flex items-center gap-2">
                  {p.question && <span className="min-w-0 flex-1 text-[12.5px] text-[var(--ink-soft)]">{p.question}</span>}
                  {[true, false].map((yes) => {
                    const active = v === yes;
                    return (
                      <button
                        key={String(yes)}
                        onClick={() => setData((m) => {
                          // «Нет» тоже ответ, поэтому храним false; повторное нажатие снимает отметку
                          const d = { ...(m[date] ?? {}) };
                          if (d[p.id] === yes) delete d[p.id];
                          else d[p.id] = yes;
                          return { ...m, [date]: d };
                        })}
                        className={`h-9 rounded-lg border px-4 text-[12.5px] font-bold transition-all active:scale-95 ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]" : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-soft)]"}`}
                      >
                        {yes ? t("pwYes") : t("pwNo")}
                      </button>
                    );
                  })}
                </div>
              )}

              {p.kind === "checklist" && (
                <ul className="flex flex-col gap-1">
                  {p.items.map((item, i) => {
                    const marks = Array.isArray(v) ? v : [];
                    const on = Boolean(marks[i]);
                    return (
                      <li key={i}>
                        <button
                          onClick={() => { const next = p.items.map((_, j) => Boolean(marks[j])); next[i] = !on; set(p.id, next); }}
                          className="flex w-full items-center gap-2.5 py-1 text-left text-[13px]"
                        >
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] ${on ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]" : "border-[var(--line)]"}`}>{on ? "✓" : ""}</span>
                          <span className={on ? "text-[var(--ink-faint)] line-through" : ""}>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {p.kind === "question" && (
                <>
                  {p.question && <p className="mb-1.5 text-[12.5px] text-[var(--ink-soft)]">{p.question}</p>}
                  <input
                    value={typeof v === "string" ? v : ""}
                    maxLength={300}
                    onChange={(e) => set(p.id, e.target.value)}
                    placeholder={t("pwAnswer")}
                    className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] outline-none focus:border-[var(--accent)]"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
