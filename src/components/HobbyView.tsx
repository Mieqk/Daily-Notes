import { useState, type ReactNode } from "react";
import type { Lang } from "../i18n";
import { STRINGS } from "../i18n";
import { useStored } from "../store";
import { FoodIcon, DumbbellIcon, SparkIcon, GamepadIcon } from "../icons";
import { makeGames } from "../games-strings";
import CoachChat from "./CoachChat";
import NutritionView from "./NutritionView";
import WorkoutView from "./WorkoutView";
import GamesView from "./GamesView";

type Sub = "ai" | "food" | "workout" | "games";

const SUBS: { id: Sub; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "ai", icon: SparkIcon },
  { id: "food", icon: FoodIcon },
  { id: "workout", icon: DumbbellIcon },
  { id: "games", icon: GamepadIcon },
];

const noop = () => {};

/** «Хобби»: ИИ-компаньон «Искра» открывается первым, рядом «Питание», «Тренировки» и «Игры». */
export default function HobbyView({ lang }: { lang: Lang }) {
  const t = STRINGS[lang] ?? STRINGS.en;
  // сюда «Питание» и «Тренировки» выносят свой переключатель: обе плашки в одной сплошной подложке, зазор не зависит от масштаба
  const [barHost, setBarHost] = useState<HTMLElement | null>(null);
  const [saved, setSub] = useStored<Sub>("dn.hobbyTab", "ai");
  const sub: Sub = SUBS.some((s) => s.id === saved) ? saved : "ai";
  const label = (id: Sub) => (id === "ai" ? t.hobbyAi : id === "food" ? t.tabFood : id === "workout" ? t.tabWorkout : makeGames(lang)("tab"));

  return (
    <div className="flex flex-col gap-5 [&>*:not(:first-child)]:w-full">
      {/* две отдельные плашки с небольшим зазором; сплошная подложка только под ними (по ширине плашек), чтобы текст чата не просвечивал */}
      <div className="sticky -top-6 z-30 mx-auto w-full max-w-xl rounded-xl bg-[var(--bg)] sm:-top-8">
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" style={{ boxShadow: "var(--shadow-sm)" }}>
          {SUBS.map(({ id, icon: Icon }) => (
            <button key={id} role="tab" aria-label={label(id)} title={label(id)} aria-selected={sub === id} onClick={() => setSub(id)} className={`flex h-10 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold transition-all sm:text-[13px] ${sub === id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className={`truncate ${sub === id ? "" : "max-[419px]:hidden"}`}>{label(id)}</span>
            </button>
          ))}
        </div>
        <div ref={setBarHost} className="[&:not(:empty)]:mt-1.5 [&:not(:empty)]:rounded-xl [&:not(:empty)]:border [&:not(:empty)]:border-[var(--line)] [&:not(:empty)]:bg-[var(--panel)] [&:not(:empty)]:p-1" style={{ boxShadow: "var(--shadow-sm)" }} />
      </div>

      {sub === "ai" && <div className="mx-auto w-full max-w-xl"><CoachChat mode="hobby" lang={lang} context="" onApply={noop} /></div>}
      {sub === "food" && <NutritionView lang={lang} barHost={barHost} />}
      {sub === "games" && <GamesView lang={lang} />}
      {sub === "workout" && <WorkoutView lang={lang} barHost={barHost} />}
    </div>
  );
}
