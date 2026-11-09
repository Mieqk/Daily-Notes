import { useSyncExternalStore } from "react";
import { youtubeId } from "./musicEmbed";
import { cachedYoutube } from "./youtubeSearch";

/** Общий плеер приложения: один <audio> (30-секундные превью) и один плеер YouTube (полные треки), играет при переходе между экранами. */
export interface PlayerTrack { id: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }

/** Видео YouTube для полного трека: из ссылки или найденное ранее. */
export const ytIdOf = (t: Pick<PlayerTrack, "title" | "artist" | "url">): string | null => youtubeId(t.url) ?? cachedYoutube(t.title, t.artist);
/** Трек можно проиграть: есть превью или полная версия на YouTube. */
export const isPlayable = (t: PlayerTrack): boolean => !!(t.preview || ytIdOf(t));

export interface MusicState {
  queue: PlayerTrack[];
  curId: string | null;
  playing: boolean;
  time: number;
  dur: number;
  volume: number;
  muted: boolean;
  repeat: boolean;
  /** что играет: превью через <audio> или полный трек через YouTube */
  kind: "audio" | "yt";
  /** false, если устройство не даёт менять громкость программно (например, iPhone): тогда ползунок не показываем */
  volumeSupported: boolean;
}

const VOL_KEY = "dn.musicVolume";

/** Следующий (dir=1) или предыдущий (dir=-1) трек с превью. wrap: по кругу. */
export function neighborId(queue: PlayerTrack[], curId: string | null, dir: 1 | -1, wrap: boolean): string | null {
  const pl = queue.filter(isPlayable);
  if (!pl.length) return null;
  const i = curId ? pl.findIndex((t) => t.id === curId) : -1;
  if (i < 0) return (dir === 1 ? pl[0] : pl[pl.length - 1]).id;
  const n = i + dir;
  if (n < 0 || n >= pl.length) return wrap ? pl[(n + pl.length) % pl.length].id : null;
  return pl[n].id;
}

export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);

/** Трек вне плейлиста (на стене, в плашке профиля): id по адресу превью. */
export const adhocTrack = (t: Omit<PlayerTrack, "id">): PlayerTrack => ({ ...t, id: `pv:${t.preview ?? t.title}` });

function loadVolume(): number {
  try { const v = localStorage.getItem(VOL_KEY); return v === null ? 1 : clamp01(Number(v)); } catch { return 1; }
}

let audio: HTMLAudioElement | null = null;
let state: MusicState = { queue: [], curId: null, playing: false, time: 0, dur: 30, volume: 1, muted: false, repeat: false, kind: "audio", volumeSupported: true };
let inited = false;
const subs = new Set<() => void>();
const emit = (patch: Partial<MusicState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };

function ensure(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = "none";
  if (!inited) {
    inited = true;
    const vol = loadVolume();
    // iOS Safari не даёт менять громкость из кода: значение остаётся 1
    a.volume = 0.5;
    const supported = a.volume === 0.5;
    a.volume = vol;
    state = { ...state, volume: vol, volumeSupported: supported };
  }
  a.onplay = () => { emit({ playing: true }); syncSession(); };
  a.onpause = () => emit({ playing: false });
  a.ontimeupdate = () => emit({ time: a.currentTime });
  a.onloadedmetadata = () => emit({ dur: Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 30 });
  a.onended = () => {
    if (state.repeat) { a.currentTime = 0; void a.play().catch(() => {}); return; }
    const n = neighborId(state.queue, state.curId, 1, false);
    if (n) api.play(n); else emit({ playing: false, time: 0 });
  };
  audio = a;
  return a;
}


/* ---- YouTube ---- */
interface YtPlayer {
  loadVideoById(id: string): void; playVideo(): void; pauseVideo(): void; stopVideo(): void; destroy(): void;
  seekTo(sec: number, allow: boolean): void; setVolume(v: number): void; mute(): void; unMute(): void;
  getCurrentTime(): number; getDuration(): number; getPlayerState(): number;
}
interface YtApi { Player: new (el: HTMLElement, opts: unknown) => YtPlayer }
let ytPlayer: YtPlayer | null = null;
let ytHost: HTMLElement | null = null;
let ytApi: Promise<YtApi> | null = null;
let ytTimer = 0;
let ytWant = 0; // номер последней просьбы включить видео, чтобы поздние ответы не перебили новый выбор

function loadYtApi(): Promise<YtApi> {
  const w = window as unknown as { YT?: YtApi; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytApi) return ytApi;
  ytApi = new Promise<YtApi>((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { prev?.(); if (w.YT) resolve(w.YT); else reject(new Error("yt")); };
    const sc = document.createElement("script");
    sc.src = "https://www.youtube.com/iframe_api";
    sc.async = true;
    sc.onerror = () => { ytApi = null; reject(new Error("yt")); };
    document.head.appendChild(sc);
  });
  return ytApi;
}

const ytStopTimer = () => { if (ytTimer) { window.clearInterval(ytTimer); ytTimer = 0; } };
const ytStartTimer = () => {
  ytStopTimer();
  ytTimer = window.setInterval(() => {
    if (!ytPlayer || state.kind !== "yt") return;
    try {
      const d = ytPlayer.getDuration();
      emit({ time: ytPlayer.getCurrentTime() || 0, ...(d > 0 ? { dur: d } : {}) });
    } catch { /* игрок ещё не готов */ }
  }, 250);
};

async function ensureYt(): Promise<YtPlayer | null> {
  const YT = await loadYtApi();
  // окно плеера появляется вместе с мини-плеером: ждём его до 3 секунд
  for (let i = 0; i < 60 && !ytHost; i++) await new Promise((r) => setTimeout(r, 50));
  if (!ytHost) return null;
  if (ytPlayer) return ytPlayer;
  const slot = document.createElement("div");
  ytHost.appendChild(slot);
  return await new Promise<YtPlayer>((resolve) => {
    const p: YtPlayer = new YT.Player(slot, {
      width: "100%", height: "100%",
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 1, origin: location.origin },
      events: {
        onReady: () => { ytPlayer = p; resolve(p); },
        onStateChange: (e: { data: number }) => {
          if (e.data === 1) { emit({ playing: true }); ytStartTimer(); syncSession(); }
          else if (e.data === 2) { emit({ playing: false }); }
          else if (e.data === 0) {
            if (state.repeat) { p.seekTo(0, true); p.playVideo(); return; }
            const n = neighborId(state.queue, state.curId, 1, false);
            if (n) api.play(n); else { ytStopTimer(); emit({ playing: false, time: 0 }); }
          }
        },
        onError: () => { emit({ playing: false }); },
      },
    });
  });
}

function playYt(id: string, vid: string) {
  audio?.pause();
  const mine = ++ytWant;
  emit({ curId: id, kind: "yt", time: 0, dur: 1, playing: true });
  void ensureYt().then((p) => {
    if (!p || mine !== ytWant || state.curId !== id) return;
    p.setVolume(Math.round(state.volume * 100));
    if (state.muted) p.mute(); else p.unMute();
    p.loadVideoById(vid);
  }, () => emit({ playing: false }));
}

function stopYt() {
  ytWant++;
  ytStopTimer();
  try { ytPlayer?.pauseVideo(); } catch { /* ignore */ }
}

function syncSession() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const t = state.queue.find((x) => x.id === state.curId);
  if (!t) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist ?? "", artwork: t.cover ? [{ src: t.cover, sizes: "300x300" }] : [] });
    navigator.mediaSession.setActionHandler("play", () => api.toggle());
    navigator.mediaSession.setActionHandler("pause", () => api.toggle());
    navigator.mediaSession.setActionHandler("nexttrack", () => api.next());
    navigator.mediaSession.setActionHandler("previoustrack", () => api.prev());
  } catch { /* не везде поддерживается */ }
}

export const api = {
  /** Задать очередь и сразу играть трек id. */
  playQueue(queue: PlayerTrack[], id: string) {
    emit({ queue });
    api.play(id);
  },
  play(id: string) {
    const t = state.queue.find((x) => x.id === id);
    if (!t) return;
    const vid = ytIdOf(t);
    if (vid) { playYt(id, vid); return; }
    if (!t.preview) return;
    stopYt();
    const a = ensure();
    if (a.src !== t.preview) { a.src = t.preview; emit({ time: 0, dur: 30 }); }
    a.volume = state.volume;
    a.muted = state.muted;
    emit({ curId: id, kind: "audio" });
    void a.play().catch(() => emit({ playing: false }));
  },
  toggle() {
    if (state.kind === "yt") {
      if (!ytPlayer || !state.curId) return;
      if (ytPlayer.getPlayerState() === 1) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
      return;
    }
    const a = ensure();
    if (!state.curId) return;
    if (a.paused) void a.play().catch(() => {}); else a.pause();
  },
  next() { const n = neighborId(state.queue, state.curId, 1, true); if (n) api.play(n); },
  prev() {
    // как на площадках: если трек уже играет больше 3 секунд, возвращаемся в его начало
    if (state.kind === "yt" && ytPlayer && state.time > 3) { ytPlayer.seekTo(0, true); emit({ time: 0 }); return; }
    if (state.kind === "audio" && audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const n = neighborId(state.queue, state.curId, -1, true);
    if (n) api.play(n);
  },
  seek(sec: number) {
    if (state.kind === "yt") { ytPlayer?.seekTo(Math.max(0, sec), true); emit({ time: Math.max(0, sec) }); return; }
    const a = ensure(); a.currentTime = Math.max(0, sec); emit({ time: a.currentTime }); },
  setVolume(v: number) {
    const vol = clamp01(v);
    const a = ensure();
    a.volume = vol;
    a.muted = false;
    if (ytPlayer) { ytPlayer.setVolume(Math.round(vol * 100)); ytPlayer.unMute(); }
    try { localStorage.setItem(VOL_KEY, String(vol)); } catch { /* ignore */ }
    emit({ volume: vol, muted: false });
  },
  toggleMute() {
    const a = ensure();
    a.muted = !state.muted;
    if (ytPlayer) { if (a.muted) ytPlayer.mute(); else ytPlayer.unMute(); }
    emit({ muted: a.muted });
  },
  toggleRepeat() { emit({ repeat: !state.repeat }); },
  /** Остановить и убрать мини-плеер. */
  close() {
    audio?.pause();
    if (audio) audio.removeAttribute("src");
    ytWant++;
    ytStopTimer();
    try { ytPlayer?.destroy(); } catch { /* ignore */ }
    ytPlayer = null;
    emit({ queue: [], curId: null, playing: false, time: 0, dur: 30, kind: "audio" });
  },
  /** Контейнер для окна YouTube (его показывает мини-плеер); null, когда окна нет. */
  attachYtHost(el: HTMLElement | null) { ytHost = el; },
};

export const getMusic = () => state;
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useMusic(): MusicState { return useSyncExternalStore(subscribe, getMusic, getMusic); }

/** Только для тестов. */
export function _resetMusic() { audio = null; inited = false; state = { queue: [], curId: null, playing: false, time: 0, dur: 30, volume: 1, muted: false, repeat: false, kind: "audio", volumeSupported: true }; }
