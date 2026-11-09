import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { coverFromLink } from "../lib/musicEmbed";
import { api, isPlayable } from "../lib/musicStore";
import { cleanMusic } from "../lib/nowPlaying";
import { safeCoverUrl, safePreviewUrl, type FoundTrack } from "../lib/trackSearch";
import { makePairPlaylist } from "../pair-playlist-strings";
import FriendsSection from "./FriendsSection";
import { Cover, TrackSearch } from "./MusicParts";
import MusicPlayer from "./MusicPlayer";

interface Row { id: string; added_by: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }
const MAX = 100;

/** Общий плейлист пары: оба добавляют песни, слушают в нашем плеере и могут убирать. */
export default function PairPlaylist({ linkId, userId, lang, name }: { linkId: string; userId: string; lang: Lang; name: string }) {
  const t = makePairPlaylist(lang);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number>(0);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("pair_tracks").select("id,added_by,title,artist,url,cover,preview").eq("link_id", linkId).order("created_at", { ascending: true }).limit(MAX);
    if (error) { setFailed(true); return; }
    setFailed(false);
    setRows(((data ?? []) as Row[]).map((r) => ({ ...r, cover: safeCoverUrl(r.cover) ?? coverFromLink(r.url), preview: safePreviewUrl(r.preview) })));
  }, [linkId]);
  useEffect(() => {
    void load();
    // друг мог добавить песню, пока карточка открыта
    const id = window.setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => window.clearInterval(id);
  }, [load]);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 3000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const select = (id: string) => {
    setSelId(id);
    const r = rows?.find((x) => x.id === id);
    if (r && isPlayable(r)) api.playQueue((rows ?? []).filter(isPlayable), id);
  };

  const add = async (f: FoundTrack): Promise<boolean> => {
    const c = cleanMusic(f.title, f.artist ?? "", f.url ?? "", { cover: f.cover, preview: f.preview });
    if (!c || !supabase) return false;
    if ((rows?.length ?? 0) >= MAX) { setMsg({ ok: false, text: t("full") }); return false; }
    const { error } = await supabase.from("pair_tracks").insert({ link_id: linkId, added_by: userId, title: c.title, artist: c.artist, url: c.url, cover: c.cover, preview: c.preview });
    if (error) { setMsg({ ok: false, text: t("err") }); return false; }
    await load();
    setMsg({ ok: true, text: t("added") });
    return true;
  };

  const remove = async (r: Row) => {
    if (confirmId !== r.id) {
      setConfirmId(r.id);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    setConfirmId(null);
    const { error } = await supabase!.from("pair_tracks").delete().eq("id", r.id);
    if (error) { setMsg({ ok: false, text: t("err") }); return; }
    setRows((l) => (l ?? []).filter((x) => x.id !== r.id));
  };

  if (failed) return <FriendsSection icon="🎧" title={t("title")}><p className="text-[12.5px] leading-snug text-[var(--ink-soft)]">{t("setup")}</p></FriendsSection>;

  const chip = "h-8 shrink-0 rounded-full border border-[var(--line)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--hover)] active:scale-95";
  return (
    <FriendsSection
      icon="🎧" title={t("title")} hint={t("hint").replace("{name}", name)} count={rows?.length}
      action={<button onClick={() => setAdding((v) => !v)} aria-expanded={adding} className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-[var(--accent-ink)] active:scale-95">{adding ? "×" : `+ ${t("add")}`}</button>}
    >
      <div>
        {adding && <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3"><TrackSearch lang={lang} onPick={add} autoFocus /></div>}
        {msg && <div role="status" className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${msg.ok ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{msg.text}</div>}
        {rows === null ? (
          <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">…</div>
        ) : rows.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-[var(--ink-faint)]">{t("empty")}</div>
        ) : (
          <>
            <MusicPlayer tracks={rows} selId={selId} onSel={setSelId} lang={lang} />
            <ul className="flex flex-col gap-2">
              {rows.map((r) => {
                const active = r.id === selId;
                return (
                  <li key={r.id} className={`rounded-xl p-2.5 transition-colors ${active ? "bg-[var(--accent-soft)]" : "bg-[var(--panel-2)]"}`}>
                    <button onClick={() => select(r.id)} aria-current={active} className="flex w-full items-center gap-3 text-left active:scale-[0.99]">
                      <Cover src={r.cover} size={52} />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[14px] font-bold ${active ? "text-[var(--accent-deep)]" : ""}`}>{r.title}</span>
                        {r.artist && <span className="block truncate text-[12.5px] text-[var(--ink-soft)]">{r.artist}</span>}
                        <span className="block truncate text-[11px] text-[var(--ink-faint)]">{r.added_by === userId ? t("byYou") : t("byThem").replace("{name}", name)}</span>
                      </span>
                      <span aria-hidden className="shrink-0 text-[var(--accent-deep)]">{active ? "♪" : "▶"}</span>
                    </button>
                    <div className="mt-2 flex">
                      <button onClick={() => void remove(r)} className={`${chip} ml-auto ${confirmId === r.id ? "!border-transparent !bg-[var(--danger)] !text-white" : ""}`}>{confirmId === r.id ? t("delSure") : t("del")}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </FriendsSection>
  );
}
