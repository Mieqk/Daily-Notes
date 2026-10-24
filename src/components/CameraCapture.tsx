import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { makeDevice } from "../device-strings";
import { CameraIcon, XIcon } from "../icons";

interface CameraCaptureProps {
  lang: Lang;
  onCapture: (file: File) => void;
  onClose: () => void;
}

/** Снимок с камеры через getUserMedia. Поток всегда останавливается при закрытии. */
export default function CameraCapture({ lang, onCapture, onClose }: CameraCaptureProps) {
  const d = makeDevice(lang);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof DOMException && e.name === "NotAllowedError" ? d("camDenied") : d("camBusy"));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (b) onCapture(new File([b], "camera.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={d("camTitle")}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]" style={{ boxShadow: "var(--shadow)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-sm font-bold">{d("camTitle")}</span>
          <button onClick={onClose} aria-label={d("camClose")} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--hover)]">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/80">{error}</p>
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="h-10 rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold text-[var(--ink-soft)] hover:bg-[var(--hover)]"
          >
            {d("camFlip")}
          </button>
          <button
            onClick={shoot}
            disabled={!ready || Boolean(error)}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CameraIcon className="h-4 w-4" />{d("camShot")}
          </button>
        </div>
      </div>
    </div>
  );
}
