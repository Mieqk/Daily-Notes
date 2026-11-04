import { useFlag } from "../store";
import type { Lang } from "../i18n";
import { makeRecap } from "../recap-strings";

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--panel-2)] shadow transition-all duration-200 ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** Переключатели показа итогов недели/месяца и значков (то же, что кнопка «Скрыть» на вкладке «Статистика»). */
export default function StatsVisibility({ lang }: { lang: Lang }) {
  const s = makeRecap(lang);
  const [recapHidden, flipRecap] = useFlag("dn.recapHidden");
  const [badgesHidden, flipBadges] = useFlag("dn.badgesHidden");
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3 className="text-[15px] font-bold">📊 {s("setTitle")}</h3>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--hover)] px-3 py-2.5">
          <span className="min-w-0 text-[13px] font-semibold">{s("setRecap")}</span>
          <Switch on={!recapHidden} label={s("setRecap")} onClick={flipRecap} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--hover)] px-3 py-2.5">
          <span className="min-w-0 text-[13px] font-semibold">{s("setBadges")}</span>
          <Switch on={!badgesHidden} label={s("setBadges")} onClick={flipBadges} />
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-faint)]">{s("setBadgesNote")}</p>
    </div>
  );
}
