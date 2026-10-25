import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { fetchProfiles } from "../lib/profiles";
import { sendPushEvent } from "../lib/push";
import { notify } from "../lib/notify";
import { cachedPresenceMode } from "../lib/presence";
import { generateUUID } from "../lib/uuid";
import { startRing, stopRing } from "../lib/ringtone";
import { makeCall } from "../call-strings";

export interface CallPeer { id: string; name: string; avatar: string | null; avatar_url: string | null }
export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "active";
export const START_CALL_EVENT = "dn-start-call";
export interface StartCallDetail { peer: CallPeer; video: boolean }

interface Signal { id: string; call_id: string; sender: string; recipient: string; kind: string; video: boolean; payload: Record<string, unknown> | null; created_at: string }

const RING_MS = 45_000;
const STUN: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

export const callsSupported = () =>
  typeof window !== "undefined" && typeof RTCPeerConnection !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

async function loadIceServers(): Promise<RTCIceServer[]> {
  try {
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return STUN;
    const r = await fetch("/api/turn", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return STUN;
    const j = (await r.json()) as { iceServers?: RTCIceServer[] };
    return j.iceServers?.length ? j.iceServers : STUN;
  } catch { return STUN; }
}

/** Звонки один на один: сигналы идут через таблицу call_signals (Realtime), звук и видео напрямую между телефонами (WebRTC). */
export function useCalls(userId: string | null, lang: Lang) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [video, setVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);

  const t = useRef(makeCall(lang));
  t.current = makeCall(lang);
  const phaseRef = useRef<CallPhase>("idle");
  const peerRef = useRef<CallPeer | null>(null);
  const callId = useRef<string | null>(null);
  const videoRef = useRef(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const ringTimer = useRef(0);
  const sentIds = useRef<string[]>([]);

  const setPhaseBoth = (p: CallPhase) => { phaseRef.current = p; setPhase(p); };

  const send = useCallback(async (kind: string, to: string, id: string, payload?: unknown, isVideo = videoRef.current) => {
    if (!supabase || !userId) return null;
    const { data } = await supabase.from("call_signals").insert({ call_id: id, sender: userId, recipient: to, kind, video: isVideo, payload: payload ?? null }).select("id").single();
    if (data?.id) sentIds.current.push(data.id as string);
    return (data?.id as string | undefined) ?? null;
  }, [userId]);

  const cleanup = useCallback((message?: string) => {
    stopRing();
    window.clearTimeout(ringTimer.current);
    pc.current?.close();
    pc.current = null;
    localRef.current?.getTracks().forEach((tr) => tr.stop());
    localRef.current = null;
    pendingIce.current = [];
    // служебные сообщения нашей стороны больше не нужны
    if (supabase && callId.current && userId) void supabase.from("call_signals").delete().eq("call_id", callId.current).eq("sender", userId);
    callId.current = null;
    peerRef.current = null;
    sentIds.current = [];
    setLocal(null); setRemote(null); setMuted(false); setCamOff(false); setSecs(0); setPeer(null); setVideo(false);
    setPhaseBoth("idle");
    if (message) setNotice(message);
  }, [userId]);

  const getMedia = useCallback(async (withVideo: boolean): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: withVideo ? { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } } : false,
      });
      localRef.current = stream;
      setLocal(stream);
      return stream;
    } catch {
      setNotice(t.current("noMedia"));
      return null;
    }
  }, []);

  const buildPc = useCallback(async (to: string, id: string) => {
    const conn = new RTCPeerConnection({ iceServers: await loadIceServers() });
    pc.current = conn;
    localRef.current?.getTracks().forEach((tr) => conn.addTrack(tr, localRef.current!));
    conn.onicecandidate = (e) => { if (e.candidate) void send("ice", to, id, e.candidate.toJSON()); };
    conn.ontrack = (e) => { setRemote(e.streams[0] ?? new MediaStream([e.track])); };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === "connected") { stopRing(); window.clearTimeout(ringTimer.current); setPhaseBoth("active"); }
      else if (conn.connectionState === "failed") { void send("hangup", to, id); cleanup(t.current("failed")); }
    };
    return conn;
  }, [send, cleanup]);

  const flushIce = async () => {
    const conn = pc.current;
    if (!conn?.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) { try { await conn.addIceCandidate(c); } catch { /* устаревший кандидат */ } }
  };

  const startCall = useCallback(async (to: CallPeer, withVideo: boolean) => {
    if (!userId || phaseRef.current !== "idle") return;
    if (!callsSupported()) { setNotice(t.current("unsupported")); return; }
    const stream = await getMedia(withVideo);
    if (!stream) return;
    // хвосты прошлых звонков (например, при обрыве связи) не копим
    void supabase!.from("call_signals").delete().eq("sender", userId).lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
    const id = generateUUID();
    callId.current = id; peerRef.current = to; videoRef.current = withVideo;
    setPeer(to); setVideo(withVideo);
    setPhaseBoth("outgoing");
    startRing(false);
    const inviteId = await send("invite", to.id, id, null, withVideo);
    if (!inviteId) { cleanup(t.current("failed")); return; }
    sendPushEvent("call", inviteId);
    ringTimer.current = window.setTimeout(() => {
      void send("hangup", to.id, id);
      cleanup(t.current("missed").replace("{name}", to.name));
    }, RING_MS);
  }, [userId, getMedia, send, cleanup]);

  const accept = useCallback(async () => {
    const p = peerRef.current; const id = callId.current;
    if (!p || !id || phaseRef.current !== "incoming") return;
    stopRing();
    window.clearTimeout(ringTimer.current);
    const stream = await getMedia(videoRef.current);
    if (!stream) { void send("decline", p.id, id); cleanup(); return; }
    setPhaseBoth("connecting");
    await buildPc(p.id, id);
    await send("accept", p.id, id);
    ringTimer.current = window.setTimeout(() => { void send("hangup", p.id, id); cleanup(t.current("failed")); }, 20_000);
  }, [getMedia, buildPc, send, cleanup]);

  const hangup = useCallback(() => {
    const p = peerRef.current; const id = callId.current;
    if (p && id) void send(phaseRef.current === "incoming" ? "decline" : "hangup", p.id, id);
    cleanup(phaseRef.current === "active" ? t.current("ended") : undefined);
  }, [send, cleanup]);

  const handle = useCallback(async (s: Signal) => {
    if (!userId || s.recipient !== userId) return;
    const fresh = Date.now() - new Date(s.created_at).getTime() < RING_MS;

    if (s.kind === "invite") {
      if (!fresh || s.call_id === callId.current) return;
      if (phaseRef.current !== "idle" || cachedPresenceMode() === "dnd") { await send("busy", s.sender, s.call_id, null, s.video); return; }
      const prof = (await fetchProfiles<{ id: string; display_name: string | null; friend_code: string | null; avatar: string | null; avatar_url: string | null }>([s.sender]))[0];
      if (phaseRef.current !== "idle") { await send("busy", s.sender, s.call_id, null, s.video); return; }
      const p: CallPeer = { id: s.sender, name: prof?.display_name || prof?.friend_code || "—", avatar: prof?.avatar ?? null, avatar_url: prof?.avatar_url ?? null };
      callId.current = s.call_id; peerRef.current = p; videoRef.current = s.video;
      setPeer(p); setVideo(s.video);
      setPhaseBoth("incoming");
      startRing(true);
      if (document.hidden) notify(p.name, t.current(s.video ? "incomingVideo" : "incoming").replace("{name}", p.name), "dn-call");
      ringTimer.current = window.setTimeout(() => {
        notify(t.current("missedCall"), p.name, "dn-call");
        cleanup();
      }, Math.max(1000, RING_MS - (Date.now() - new Date(s.created_at).getTime())));
      return;
    }

    if (s.call_id !== callId.current || s.sender !== peerRef.current?.id) return;
    const p = peerRef.current;

    if (s.kind === "accept" && phaseRef.current === "outgoing") {
      stopRing(); window.clearTimeout(ringTimer.current);
      setPhaseBoth("connecting");
      const conn = await buildPc(p.id, s.call_id);
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      await send("offer", p.id, s.call_id, { type: offer.type, sdp: offer.sdp });
      ringTimer.current = window.setTimeout(() => { void send("hangup", p.id, s.call_id); cleanup(t.current("failed")); }, 20_000);
    } else if (s.kind === "offer" && pc.current) {
      await pc.current.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
      await flushIce();
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      await send("answer", p.id, s.call_id, { type: answer.type, sdp: answer.sdp });
    } else if (s.kind === "answer" && pc.current) {
      await pc.current.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
      await flushIce();
    } else if (s.kind === "ice") {
      pendingIce.current.push(s.payload as unknown as RTCIceCandidateInit);
      await flushIce();
    } else if (s.kind === "decline") {
      cleanup(t.current("declined").replace("{name}", p.name));
    } else if (s.kind === "busy") {
      cleanup(t.current("busy").replace("{name}", p.name));
    } else if (s.kind === "hangup") {
      const wasRinging = phaseRef.current === "incoming";
      if (wasRinging) notify(t.current("missedCall"), p.name, "dn-call");
      cleanup(phaseRef.current === "active" ? t.current("ended") : undefined);
    }
  }, [userId, send, buildPc, cleanup]);

  // входящие сигналы + то, что пришло, пока приложение было закрыто (звонок живёт 45 секунд)
  useEffect(() => {
    if (!userId || !supabase || !callsSupported()) return;
    const since = new Date(Date.now() - RING_MS).toISOString();
    supabase.from("call_signals").select("*").eq("recipient", userId).gte("created_at", since).order("created_at", { ascending: true }).limit(60)
      .then(async ({ data }) => {
        const rows = (data ?? []) as Signal[];
        const ended = new Set(rows.filter((r) => ["hangup", "decline", "busy"].includes(r.kind)).map((r) => r.call_id));
        for (const r of rows) if (r.kind === "invite" && !ended.has(r.call_id)) await handle(r);
      });
    const channel = supabase
      .channel("calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `recipient=eq.${userId}` }, (p) => { void handle(p.new as Signal); })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [userId, handle]);

  // кнопки звонка в чате запускают звонок через событие
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent<StartCallDetail>).detail; if (d) void startCall(d.peer, d.video); };
    window.addEventListener(START_CALL_EVENT, on);
    return () => window.removeEventListener(START_CALL_EVENT, on);
  }, [startCall]);

  // таймер разговора
  useEffect(() => {
    if (phase !== "active") return;
    setSecs(0);
    const id = window.setInterval(() => setSecs((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // закрытие вкладки во время звонка
  useEffect(() => {
    const onUnload = () => { const p = peerRef.current; const id = callId.current; if (p && id) void send("hangup", p.id, id); };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, [send]);

  const toggleMute = () => {
    const on = !muted;
    localRef.current?.getAudioTracks().forEach((tr) => { tr.enabled = !on; });
    setMuted(on);
  };
  const toggleCam = () => {
    const off = !camOff;
    localRef.current?.getVideoTracks().forEach((tr) => { tr.enabled = !off; });
    setCamOff(off);
  };

  return { phase, peer, video, muted, camOff, secs, notice, local, remote, accept, hangup, toggleMute, toggleCam, t: t.current };
}
