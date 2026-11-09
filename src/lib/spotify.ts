import type { FoundTrack } from "./trackSearch";

/**
 * Подключение Spotify (вход через PKCE, без своего сервера). Работает в режиме разработки Spotify:
 * подключиться могут только люди из списка пользователей приложения. Client ID публичный, секрет не нужен.
 */
// Client ID приложения Spotify (его можно переопределить переменной VITE_SPOTIFY_CLIENT_ID)
export const SPOTIFY_CLIENT_ID_DEFAULT = "";
const CLIENT_ID: string = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) || SPOTIFY_CLIENT_ID_DEFAULT;
export const spotifyConfigured = () => !!CLIENT_ID;

const SCOPES = ["user-read-currently-playing", "user-read-playback-state", "playlist-read-private", "playlist-read-collaborative", "user-library-read"].join(" ");
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const TOKENS_KEY = "dn.spotify";
const PENDING_KEY = "dn.spotify.pending";
const SYNC_KEY = "dn.spotify.sync";
/** Спотифай сообщил об изменении подключения: экраны перечитывают состояние. */
export const SPOTIFY_EVENT = "dn-spotify";

interface Tokens { access: string; refresh: string; exp: number }

// Адрес при загрузке страницы запоминаем сразу: другие модули могут вычистить параметры из адресной строки раньше нас
const bootSearch = typeof location === "undefined" ? "" : location.search;

const redirectUri = () => `${location.origin}/`;

export function base64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function randomString(len: number): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return base64url(a).slice(0, len);
}
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

function readTokens(): Tokens | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOKENS_KEY) ?? "null") as Tokens | null;
    return t && typeof t.access === "string" && typeof t.refresh === "string" ? t : null;
  } catch { return null; }
}
function writeTokens(t: Tokens | null) {
  try { if (t) localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); else localStorage.removeItem(TOKENS_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(SPOTIFY_EVENT));
}
export const spotifyConnected = () => !!readTokens();
export function spotifyDisconnect() { writeTokens(null); }

/** Показывать ли друзьям то, что играет в Spotify (по умолчанию да). */
export function syncEnabled(): boolean { try { return localStorage.getItem(SYNC_KEY) !== "0"; } catch { return true; } }
export function setSyncEnabled(on: boolean) {
  try { localStorage.setItem(SYNC_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  window.dispatchEvent(new Event(SPOTIFY_EVENT));
}

/** Уходим на страницу входа Spotify. */
export async function spotifyLogin() {
  if (!CLIENT_ID) return;
  const verifier = randomString(96);
  const state = randomString(24);
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state })); } catch { /* ignore */ }
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", CLIENT_ID);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("code_challenge", await pkceChallenge(verifier));
  u.searchParams.set("state", state);
  location.assign(u.toString());
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens | null> {
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: CLIENT_ID, ...body }) });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  return { access: j.access_token, refresh: j.refresh_token ?? body.refresh_token ?? "", exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
}

/** Возврат со страницы Spotify: меняет код на токены. "ok" / "error" / null, если это не возврат. */
export async function completeSpotifyLogin(): Promise<"ok" | "error" | null> {
  const q = new URLSearchParams(bootSearch);
  const code = q.get("code");
  const err = q.get("error");
  const state = q.get("state");
  if (!state || (!code && !err)) return null;
  let pending: { verifier?: string; state?: string } | null = null;
  try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null"); } catch { /* ignore */ }
  if (!pending || pending.state !== state) return null; // чужой параметр state: это не наш вход
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
  history.replaceState(null, "", location.pathname + location.hash);
  if (err || !code || !pending.verifier) return "error";
  try {
    const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: pending.verifier });
    if (!t) return "error";
    writeTokens(t);
    return "ok";
  } catch { return "error"; }
}

async function accessToken(force = false): Promise<string | null> {
  const t = readTokens();
  if (!t) return null;
  if (!force && t.exp - 60_000 > Date.now()) return t.access;
  try {
    const n = await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh });
    if (!n) { writeTokens(null); return null; } // доступ отозван: просим войти заново
    writeTokens({ ...n, refresh: n.refresh || t.refresh });
    return n.access;
  } catch { return null; }
}

export class SpotifyError extends Error { constructor(public status: number) { super(`spotify ${status}`); } }

async function api<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const tok = await accessToken(attempt === 1);
    if (!tok) throw new SpotifyError(401);
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 401 && attempt === 0) continue;
    if (res.status === 204) return null;
    if (!res.ok) throw new SpotifyError(res.status);
    return (await res.json()) as T;
  }
  return null;
}

interface SpTrack { id?: string; name?: string; type?: string; is_local?: boolean; artists?: { name?: string }[]; album?: { images?: { url?: string; width?: number }[] }; external_urls?: { spotify?: string } }

/** Трек Spotify в наш формат. Превью у Spotify почти не отдаётся, его позже находит поиск Apple. */
export function toFound(t: SpTrack | null | undefined): FoundTrack | null {
  if (!t || t.is_local || (t.type && t.type !== "track") || typeof t.name !== "string" || !t.name.trim()) return null;
  const imgs = t.album?.images ?? [];
  const img = imgs.find((i) => i.width === 300) ?? imgs[1] ?? imgs[0];
  const artist = (t.artists ?? []).map((a) => a.name).filter(Boolean).join(", ");
  return { title: t.name.trim().slice(0, 80), artist: artist ? artist.slice(0, 80) : null, url: t.external_urls?.spotify ?? null, cover: img?.url ?? null, preview: null };
}

/** Что сейчас играет у человека в Spotify (null, если ничего). */
export async function getNowPlaying(): Promise<{ id: string; playing: boolean; track: FoundTrack } | null> {
  const j = await api<{ is_playing?: boolean; currently_playing_type?: string; item?: SpTrack }>("/me/player/currently-playing");
  const track = toFound(j?.item);
  if (!j || !track || !j.item?.id) return null;
  return { id: j.item.id, playing: !!j.is_playing, track };
}

export interface SpPlaylist { id: string; name: string; image: string | null }
export async function getMyPlaylists(): Promise<SpPlaylist[]> {
  const j = await api<{ items?: { id?: string; name?: string; images?: { url?: string }[] | null }[] }>("/me/playlists?limit=50");
  return (j?.items ?? []).filter((p) => p?.id && p.name).map((p) => ({ id: p.id!, name: p.name!, image: p.images?.[0]?.url ?? null }));
}

type ItemsPage = { items?: { track?: SpTrack | null; item?: SpTrack | null }[] };
const fromPage = (j: ItemsPage | null): FoundTrack[] => (j?.items ?? []).map((i) => toFound(i.track ?? i.item)).filter((x): x is FoundTrack => !!x);

/** Треки плейлиста (до 50). Spotify переименовывал этот запрос, поэтому пробуем оба адреса. */
export async function getPlaylistTracks(id: string): Promise<FoundTrack[]> {
  try { return fromPage(await api<ItemsPage>(`/playlists/${encodeURIComponent(id)}/tracks?limit=50`)); }
  catch (e) {
    if (e instanceof SpotifyError && (e.status === 404 || e.status === 400)) return fromPage(await api<ItemsPage>(`/playlists/${encodeURIComponent(id)}/items?limit=50`));
    throw e;
  }
}
export async function getLikedTracks(): Promise<FoundTrack[]> {
  return fromPage(await api<{ items?: { track?: SpTrack }[] }>("/me/tracks?limit=50"));
}
