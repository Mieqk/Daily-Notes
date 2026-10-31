import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { plantState, STAGES, type Care } from "../lib/pairPlant";
import { makePlant } from "../pair-plant-strings";
import { todayISO } from "../store";
import FriendsSection from "./FriendsSection";

/** Общее растение пары: каждый поливает раз в день, стадия растёт от ухода обоих. */
export default function PairPlant({ linkId, userId, lang, name }: { linkId: string; userId: string; lang: Lang; name: string }) {
  const t = makePlant(lang);
  const [care, setCare] = useState<Care[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const today = todayISO();

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("pair_plant_care").select("user_id,day").eq("link_id", linkId).order("day", { ascending: false }).limit(600);
    setCare((data ?? []) as Care[]);
  }, [linkId]);
  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const water = async () => {
    if (!supabase || busy) return;
    setBusy(true); setErr(false);
    const { error } = await supabase.from("pair_plant_care").upsert({ link_id: linkId, user_id: userId, day: today }, { onConflict: "link_id,user_id,day", ignoreDuplicates: true });
    setBusy(false);
    if (error) { setErr(true); return; }
    load();
  };

  const s = plantState(care, userId, today);
  const stageKey = (["stage0", "stage1", "stage2", "stage3", "stage4"] as const)[s.stage];
  const status = s.mineToday && s.theirsToday ? t("both") : s.mineToday ? t("wait").replace("{name}", name) : s.theirsToday ? t("theyWatered").replace("{name}", name) : null;

  return (
    <FriendsSection icon="🌱" title={t("title")} hint={t("hint")}>
      <div className="flex items-center gap-3.5 rounded-xl bg-[var(--hover)] px-3.5 py-3">
        <span aria-hidden className={`text-[44px] leading-none ${s.wilting ? "opacity-50 grayscale" : ""}`}>{s.wilting ? "🥀" : STAGES[s.stage].icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">{t(stageKey)}</div>
          <div className="text-[12px] text-[var(--ink-soft)]">{t("points").replace("{n}", String(s.points))}{s.toNext !== null ? ` · ${t("toNext").replace("{n}", String(s.toNext))}` : ` · ${t("grown")}`}</div>
          {s.wilting && <div className="mt-0.5 text-[12px] font-semibold text-[var(--danger)]">{t("wilting")}</div>}
          {status && !s.wilting && <div className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{status}</div>}
        </div>
      </div>
      <button onClick={water} disabled={s.mineToday || busy} aria-pressed={s.mineToday}
        className="mt-3 h-11 w-full rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">
        {s.mineToday ? `✓ ${t("watered")}` : `💧 ${t("water")}`}
      </button>
      {err && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t("err")}</p>}
    </FriendsSection>
  );
}
