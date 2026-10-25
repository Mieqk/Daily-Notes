import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Lang } from "../i18n";
import { makeMedia } from "../media-strings";
import { baseMime, kindOf, type PendingMedia } from "../lib/media";
import { XIcon } from "../icons";

const MAX_REC_SEC = 120;

/** Кнопки «прикрепить файл» и «записать голос» плюс превью выбранного вложения. Само ничего не загружает: файл уходит при отправке. */
export default function MediaAttach({ lang, value, onChange, onError, disabled, floating, className = "" }: {
  lang: Lang; value: PendingMedia | null; onChange: (v: PendingMedia | null) => void; onError: (msg: string) => void; disabled?: boolean; floating?: boolean; className?: string;
}) {
  const m = makeMedia(lang);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => () => { if (value) URL.revokeObjectURL(value.preview); }, [value]);
  useEffect(() => () => {
    if (recRef.current && recRef.current.state !== "inactive") { recRef.current.onstop = null; recRef.current.stop(); }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (!rec) return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [rec]);
  useEffect(() => { if (rec && secs >= MAX_REC_SEC) stop(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [secs, rec]);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const kind = kindOf(f);
    if (!kind) { onError(m("badType")); return; }
    onChange({ file: f, kind, preview: URL.createObjectURL(f) });
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { onError(m("noRec")); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { onError(m("mic")); return; }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const mime = baseMime(mr.mimeType || type || "audio/webm");
      const blob = new Blob(chunks, { type: mime });
      if (blob.size === 0) return;
      const ext = mime === "audio/mp4" ? "m4a" : mime === "audio/ogg" ? "ogg" : "webm";
      const file = new File([blob], `voice.${ext}`, { type: mime });
      onChange({ file, kind: "audio", preview: URL.createObjectURL(file) });
    };
    streamRef.current = stream;
    recRef.current = mr;
    setSecs(0);
    setRec(true);
    mr.start();
  };

  function stop() {
    setRec(false);
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  }

  const iconBtn = "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] text-[17px] text-[var(--ink-soft)] transition-all active:scale-95 disabled:opacity-50";
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className={`flex flex-col gap-2 ${floating ? "relative" : ""} ${className}`}>
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={pick} className="hidden" />
        {rec ? (
          <button type="button" onClick={stop} aria-label={m("stop")} className="flex h-10 items-center gap-2 rounded-xl bg-[var(--danger)] px-3.5 text-[13px] font-semibold text-white active:scale-95">
            <span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-sm bg-white" />
            {m("recording")} {mmss}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled} aria-label={m("attach")} title={m("attach")} className={iconBtn}>📎</button>
            <button type="button" onClick={start} disabled={disabled} aria-label={m("record")} title={m("record")} className={iconBtn}>🎙️</button>
          </>
        )}
      </div>
      {value && !rec && (
        <div className={`flex items-center gap-2.5 rounded-lg bg-[var(--panel)] p-2 ${floating ? "absolute bottom-full left-0 z-10 mb-2 w-72 border border-[var(--line)]" : ""}`} style={floating ? { boxShadow: "var(--shadow)" } : undefined}>
          {value.kind === "image" && <img src={value.preview} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />}
          {value.kind === "video" && <video src={value.preview} muted playsInline className="h-12 w-12 shrink-0 rounded-md bg-black object-cover" />}
          {value.kind === "audio" && <audio src={value.preview} controls className="h-10 min-w-0 flex-1" />}
          {value.kind !== "audio" && <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink-soft)]">{value.file.name}</span>}
          <button type="button" onClick={() => onChange(null)} aria-label={m("remove")} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ink-faint)] hover:bg-[var(--hover)]">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
