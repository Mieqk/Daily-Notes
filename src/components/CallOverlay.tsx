import { useEffect, useRef } from "react";
import type { useCalls } from "../hooks/useCalls";

type CallState = ReturnType<typeof useCalls>;

const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/** Экран звонка: исходящий, входящий и разговор. Поверх всего приложения. */
export default function CallOverlay({ call }: { call: CallState }) {
  const { phase, peer, video, muted, camOff, secs, notice, local, remote, accept, hangup, toggleMute, toggleCam, t } = call;
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = remoteRef.current;
    if (el && el.srcObject !== remote) el.srcObject = remote;
    if (el && remote) void el.play().catch(() => {});
  }, [remote, phase]);
  useEffect(() => {
    const el = localRef.current;
    if (el && el.srcObject !== local) el.srcObject = local;
  }, [local, phase]);

  if (phase === "idle") {
    return notice ? (
      <div role="status" className="animate-rise fixed left-1/2 top-4 z-[110] max-w-[90vw] -translate-x-1/2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[13px] font-semibold text-[var(--panel)]" style={{ boxShadow: "var(--shadow)" }}>
        {notice}
      </div>
    ) : null;
  }

  const name = peer?.name ?? "";
  const status =
    phase === "outgoing" ? t("calling").replace("{name}", name)
    : phase === "incoming" ? t(video ? "incomingVideo" : "incoming").replace("{name}", name)
    : phase === "connecting" ? t("connecting")
    : mmss(secs);
  const showRemoteVideo = video && phase === "active";
  const circle = "grid h-14 w-14 place-items-center rounded-full text-[22px] transition-all active:scale-90";

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-[#0b0f14] text-white" role="dialog" aria-modal="true" aria-label={status}>
      {/* звук собеседника играет через этот элемент и в аудиозвонке */}
      <video ref={remoteRef} autoPlay playsInline className={showRemoteVideo ? "absolute inset-0 h-full w-full object-cover" : "hidden"} />
      {showRemoteVideo && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />}

      <div className="safe-top relative flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {!showRemoteVideo && (
          <span className={`block h-28 w-28 overflow-hidden rounded-3xl ${phase !== "active" ? "animate-pulse" : ""}`}>
            {peer?.avatar_url ? <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center bg-white/10 text-[56px]">{peer?.avatar || "🙂"}</span>}
          </span>
        )}
        <h2 className="text-[22px] font-bold drop-shadow">{name}</h2>
        <p className="text-[14px] font-medium text-white/80 drop-shadow" aria-live="polite">{status}</p>
      </div>

      {video && local && (
        <video ref={localRef} autoPlay muted playsInline className="absolute right-4 top-4 z-10 h-36 w-24 rounded-xl border border-white/30 bg-black object-cover" style={{ transform: "scaleX(-1)" }} />
      )}

      <div className="safe-bottom relative flex items-center justify-center gap-5 px-6 pb-8 pt-4">
        {phase === "incoming" ? (
          <>
            <button onClick={hangup} aria-label={t("decline")} className={`${circle} bg-red-500`}>📵</button>
            <button onClick={() => void accept()} aria-label={t("accept")} className={`${circle} bg-green-500`}>{video ? "📹" : "📞"}</button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} aria-label={muted ? t("unmute") : t("mute")} aria-pressed={muted} className={`${circle} ${muted ? "bg-white text-black" : "bg-white/15"}`}>{muted ? "🔇" : "🎤"}</button>
            {video && <button onClick={toggleCam} aria-label={camOff ? t("camOn") : t("camOff")} aria-pressed={camOff} className={`${circle} ${camOff ? "bg-white text-black" : "bg-white/15"}`}>{camOff ? "🚫" : "📷"}</button>}
            <button onClick={hangup} aria-label={t("hangup")} className={`${circle} bg-red-500`}>📵</button>
          </>
        )}
      </div>
    </div>
  );
}
