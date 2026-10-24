import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { sendPushEvent } from "../lib/push";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import { makeUI } from "../ui-strings";
import FriendsSection from "./FriendsSection";

interface Signal { id: string; user_id: string; message: string | null; created_at: string; resolved_at: string | null }
interface Support { signal_id: string; user_id: string }
interface Person { id: string; display_name: string | null }

const DAY_MS = 24 * 60 * 60 * 1000;

/** SOS-сигналы поддержки: свой сигнал и сигналы друзей за последние сутки. */
export default function SosPanel({ userId, lang }: { userId: string; lang: Lang }) {
  const u = makeUI(lang);
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [support, setSupport] = useState<Support[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { data, error } = await supabase!.from("sos_signals").select("*").is("resolved_at", null).gte("created_at", since).order("created_at", { ascending: false });
    if (error) { setSignals([]); return; }
    const list = (data ?? []) as Signal[];
    setSignals(list);
    if (list.length === 0) { setSupport([]); return; }
    const { data: sup } = await supabase!.from("sos_support").select("*").in("signal_id", list.map((s) => s.id));
    const sups = (sup ?? []) as Support[];
    setSupport(sups);
    const ids = [...new Set([...list.map((s) => s.user_id), ...sups.map((x) => x.user_id)].filter((id) => id !== userId))];
    const profiles = await fetchProfiles<Person>(ids);
    setPeople(new Map(profiles.map((p) => [p.id, p])));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (signals === null) return null;

  const mine = signals.find((s) => s.user_id === userId);
  const others = signals.filter((s) => s.user_id !== userId);
  const nameOf = (id: string) => people.get(id)?.display_name || "—";
  const btn = "h-10 rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50";

  const send = async () => {
    setBusy(true);
    // старый незакрытый сигнал (старше суток) мешал бы создать новый
    await supabase!.from("sos_signals").update({ resolved_at: new Date().toISOString() }).eq("user_id", userId).is("resolved_at", null);
    const { data: row } = await supabase!.from("sos_signals").insert({ user_id: userId, message: text.trim() || null }).select("id").single();
    if (row?.id) sendPushEvent("sos", row.id);
    setBusy(false);
    setComposing(false);
    setText("");
    load();
  };

  const resolve = async (id: string) => {
    setBusy(true);
    await supabase!.from("sos_signals").update({ resolved_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    load();
  };

  const near = async (id: string, already: boolean) => {
    setBusy(true);
    if (already) await supabase!.from("sos_support").delete().eq("signal_id", id).eq("user_id", userId);
    else await supabase!.from("sos_support").insert({ signal_id: id, user_id: userId });
    setBusy(false);
    load();
  };

  const mySupporters = mine ? support.filter((x) => x.signal_id === mine.id) : [];

  return (
    <FriendsSection icon="🫂" title={u("sosTitle")}>

      {others.map((s) => {
        const already = support.some((x) => x.signal_id === s.id && x.user_id === userId);
        return (
          <div key={s.id} className="mt-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
            <div className="text-[13.5px] font-bold text-[var(--accent-deep)]">{u("sosFriend").replace("{name}", nameOf(s.user_id))}</div>
            {s.message && <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed">{s.message}</p>}
            <button onClick={() => near(s.id, already)} disabled={busy} className={`${btn} mt-2 ${already ? "border border-[var(--accent)] text-[var(--accent-deep)]" : "bg-[var(--accent)] text-[var(--accent-ink)]"}`}>
              {already ? u("sosYouNear") : u("sosNear")}
            </button>
          </div>
        );
      })}

      {mine ? (
        <div className="mt-3 rounded-lg bg-[var(--hover)] p-3">
          <div className="text-[13.5px] font-bold">{u("sosMine")}</div>
          {mine.message && <p className="mt-1 whitespace-pre-wrap break-words text-[14px]">{mine.message}</p>}
          <p className="mt-1.5 text-[12.5px] text-[var(--ink-soft)]">
            {mySupporters.length === 0 ? u("sosNobody") : `${u("sosNear")}: ${mySupporters.map((x) => nameOf(x.user_id)).join(", ")}`}
          </p>
          <button onClick={() => resolve(mine.id)} disabled={busy} className={`${btn} mt-2 border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-soft)] hover:border-[var(--accent)]`}>
            {u("sosBetter")}
          </button>
        </div>
      ) : composing ? (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder={u("sosPh")}
            aria-label={u("sosPh")}
            className="w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={send} disabled={busy} className={`${btn} bg-[var(--accent)] text-[var(--accent-ink)]`}>{u("sosSend")}</button>
            <button onClick={() => setComposing(false)} className={`${btn} text-[var(--ink-soft)] hover:bg-[var(--hover)]`}>{u("capCancel")}</button>
            <span className="ml-auto text-[12px] text-[var(--ink-faint)]">{u("sosNote")}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="mb-2 text-[12.5px] text-[var(--ink-soft)]">{u("sosHint")}</p>
          <button onClick={() => setComposing(true)} className={`${btn} border border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]`}>{u("sosBtn")}</button>
        </div>
      )}
    </FriendsSection>
  );
}
