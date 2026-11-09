import { useSyncExternalStore } from "react";

/** Общий плеер приложения: один <audio> на всё, играет при переходе между экранами. Играет 30-секундные превью. */
export interface PlayerTrack { id: string; title: string; artist: string | null; url: string | null; cover: string | null; preview: string | null }

export interface MusicState {
  queue: PlayerTrack[];
  curId: string | null;
  playing: boolean;
  time: number;
  dur: number;
  volume: number;
  muted: boolean;
  repeat: boolean;
  /** false, если устройство не даёт менять громкость программно (например, iPhone): тогда ползунок не показываем */
  volumeSupported: boolean;
}

const VOL_KEY = "dn.musicVolume";

/** Следующий (dir=1) или предыдущий (dir=-1) трек с превью. wrap: по кругу. */
export function neighborId(queue: PlayerTrack[], curId: string | null, dir: 1 | -1, wrap: boolean): string | null {
  const pl = queue.filter((t) => t.preview);
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
let state: MusicState = { queue: [], curId: null, playing: false, time: 0, dur: 30, volume: 1, muted: false, repeat: false, volumeSupported: true };
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
    if (!t?.preview) return;
    const a = ensure();
    if (a.src !== t.preview) { a.src = t.preview; emit({ time: 0, dur: 30 }); }
    a.volume = state.volume;
    a.muted = state.muted;
    emit({ curId: id });
    void a.play().catch(() => emit({ playing: false }));
  },
  toggle() {
    const a = ensure();
    if (!state.curId) return;
    if (a.paused) void a.play().catch(() => {}); else a.pause();
  },
  next() { const n = neighborId(state.queue, state.curId, 1, true); if (n) api.play(n); },
  prev() {
    // как на площадках: если трек уже играет больше 3 секунд, возвращаемся в его начало
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const n = neighborId(state.queue, state.curId, -1, true);
    if (n) api.play(n);
  },
  seek(sec: number) { const a = ensure(); a.currentTime = Math.max(0, sec); emit({ time: a.currentTime }); },
  setVolume(v: number) {
    const vol = clamp01(v);
    const a = ensure();
    a.volume = vol;
    a.muted = false;
    try { localStorage.setItem(VOL_KEY, String(vol)); } catch { /* ignore */ }
    emit({ volume: vol, muted: false });
  },
  toggleMute() { const a = ensure(); a.muted = !state.muted; emit({ muted: a.muted }); },
  toggleRepeat() { emit({ repeat: !state.repeat }); },
  /** Остановить и убрать мини-плеер. */
  close() {
    audio?.pause();
    if (audio) audio.removeAttribute("src");
    emit({ queue: [], curId: null, playing: false, time: 0, dur: 30 });
  },
};

export const getMusic = () => state;
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useMusic(): MusicState { return useSyncExternalStore(subscribe, getMusic, getMusic); }

/** Только для тестов. */
export function _resetMusic() { audio = null; inited = false; state = { queue: [], curId: null, playing: false, time: 0, dur: 30, volume: 1, muted: false, repeat: false, volumeSupported: true }; }
