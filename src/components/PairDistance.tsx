import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { supabase } from "../lib/supabase";
import { coarsePoint, formatKm, geoStale } from "../lib/pairDistance";
import { makeDistance } from "../pair-distance-strings";
import FriendsSection from "./FriendsSection";

/** Расстояние пары: по согласию обоих; на сервер уходят координаты с точностью ~11 км, партнёру отдаются только километры. */
export default function PairDistance({ linkId, userId, lang, name }: { linkId: string; userId: string; lang: Lang; name: string }) {
  const t = makeDistance(lang);
  const [updatedAt, setUpdatedAt] = useState<string | null | undefined>(undefined); // undefined: ещё грузим
  const [km, setKm] = useState<number | null>(null);
  const [otherOn, setOtherOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<"denied" | "unsupported" | "err" | null>(null);
  const autoTried = useRef(false);

  const loadDistance = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc("pair_distance_km", { p_link: linkId });
    const row = (Array.isArray(data) ? data[0] : null) as { km: number | null; other_on: boolean } | null;
    setKm(row?.km ?? null);
    setOtherOn(Boolean(row?.other_on));
  }, [linkId]);

  const loadOwn = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("pair_geo").select("updated_at").eq("link_id", linkId).eq("user_id", userId).maybeSingle();
    setUpdatedAt((data as { updated_at: string } | null)?.updated_at ?? null);
  }, [linkId, userId]);

  const locate = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    if (!("geolocation" in navigator)) { setMsg("unsupported"); return false; }
    setBusy(true); setMsg(null);
    const pos = await new Promise<GeolocationPosition | "denied" | "fail">((resolve) => {
      navigator.geolocation.getCurrentPosition(resolve, (e) => resolve(e.code === 1 ? "denied" : "fail"), { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 });
    });
    if (pos === "denied" || pos === "fail") { setBusy(false); setMsg(pos === "denied" ? "denied" : "err"); return false; }
    const p = coarsePoint(pos.coords.latitude, pos.coords.longitude);
    if (!p) { setBusy(false); setMsg("err"); return false; }
    const now = new Date().toISOString();
    const { error } = await supabase.from("pair_geo").upsert({ link_id: linkId, user_id: userId, lat: p.lat, lon: p.lon, updated_at: now }, { onConflict: "link_id,user_id" });
    setBusy(false);
    if (error) { setMsg("err"); return false; }
    setUpdatedAt(now);
    await loadDistance();
    return true;
  }, [linkId, userId, loadDistance]);

  useEffect(() => { loadOwn(); loadDistance(); }, [loadOwn, loadDistance]);

  // уже делитесь и отметка устарела: тихо обновляем при открытии (ошибки не показываем)
  useEffect(() => {
    if (autoTried.current || updatedAt === undefined || updatedAt === null || !geoStale(updatedAt, Date.now())) return;
    autoTried.current = true;
    locate().then(() => setMsg(null));
  }, [updatedAt, locate]);

  const disable = async () => {
    if (!supabase || busy) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("pair_geo").delete().eq("link_id", linkId).eq("user_id", userId);
    setBusy(false);
    if (error) { setMsg("err"); return; }
    setUpdatedAt(null); setKm(null);
    loadDistance();
  };

  const sharing = Boolean(updatedAt);
  const loading = updatedAt === undefined;
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";

  return (
    <FriendsSection icon="📍" title={t("title")} hint={t("hint")}>
      <div className="rounded-xl bg-[var(--hover)] px-3.5 py-3 text-[13.5px]">
        {loading ? <span className="text-[var(--ink-faint)]">…</span>
          : !sharing ? <span className="text-[var(--ink-soft)]">{t("off")}</span>
          : busy && km === null ? <span className="text-[var(--ink-soft)]">{t("askingPlace")}</span>
          : km !== null ? <span className="font-bold">📍 {km === 0 ? t("together") : t("between").replace("{km}", formatKm(km, localeOf(lang)))}</span>
          : <span className="text-[var(--ink-soft)]">{otherOn ? t("askingPlace") : t("waiting").replace("{name}", name)}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!loading && !sharing && (
          <button onClick={locate} disabled={busy} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{t("enable")}</button>
        )}
        {sharing && (
          <>
            <button onClick={locate} disabled={busy} className={`${btn} border border-[var(--accent)] text-[var(--accent-deep)]`}>{t("refresh")}</button>
            <button onClick={disable} disabled={busy} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--hover)]`}>{t("disable")}</button>
          </>
        )}
      </div>
      <p className="mt-2.5 text-[11.5px] leading-snug text-[var(--ink-faint)]">{t("privacy")}</p>
      {msg && <p className="mt-2 text-[12.5px] text-[var(--danger)]">{t(msg)}</p>}
    </FriendsSection>
  );
}
