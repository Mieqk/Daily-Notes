import { useState, type ReactNode } from "react";
import type { Lang } from "../i18n";
import { STRINGS } from "../i18n";
import { useStored } from "../store";
import { FoodIcon, DumbbellIcon, SparkIcon } from "../icons";
import CoachChat from "./CoachChat";
import NutritionView from "./NutritionView";
import WorkoutView from "./WorkoutView";

type Sub = "ai" | "food" | "workout";

const SUBS: { id: Sub; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "ai", icon: SparkIcon },
  { id: "food", icon: FoodIcon },
  { id: "workout", icon: DumbbellIcon },
];

const noop = () => {};

/** «Хобби»: ИИ-компаньон «Искра» открывается первым, рядом «Питание» и «Тренировки». */
export default function HobbyView({ lang }: { lang: Lang }) {
  const t = STRINGS[lang] ?? STRINGS.en;
  // сюда «Питание» и «Тренировки» выносят свой переключатель: обе плашки в одной сплошной подложке, зазор не зависит от масштаба
  const [barHost, setBarHost] = useState<HTMLElement | null>(null);
  const [saved, setSub] = useStored<Sub>("dn.hobbyTab", "ai");
  const sub: Sub = SUBS.some((s) => s.id === saved) ? saved : "ai";
  const label = (id: Sub) => (id === "ai" ? t.hobbyAi : id === "food" ? t.tabFood : t.tabWorkout);

  return (
    <div className="flex flex-col gap-5 [&>*:not(:first-child)]:w-full">
      {/* две отдельные плашки с небольшим зазором; сплошная подложка только под ними (по ширине плашек), чтобы текст чата не просвечивал */}
      <div className="sticky -top-6 z-30 mx-auto w-full max-w-xl rounded-xl bg-[var(--bg)] sm:-top-8">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" style={{ boxShadow: "var(--shadow-sm)" }}>
          {SUBS.map(({ id, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold transition-all ${sub === id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label(id)}</span>
            </button>
          ))}
        </div>
        <div ref={setBarHost} className="[&:not(:empty)]:mt-1.5 [&:not(:empty)]:rounded-xl [&:not(:empty)]:border [&:not(:empty)]:border-[var(--line)] [&:not(:empty)]:bg-[var(--panel)] [&:not(:empty)]:p-1" style={{ boxShadow: "var(--shadow-sm)" }} />
      </div>

      {sub === "ai" && <div className="mx-auto w-full max-w-xl"><CoachChat mode="hobby" lang={lang} context="" onApply={noop} /></div>}
      {sub === "food" && <NutritionView lang={lang} barHost={barHost} />}
      {sub === "workout" && <WorkoutView lang={lang} barHost={barHost} />}
    </div>
  );
}
