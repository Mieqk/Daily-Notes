/** Расшифровка голоса через ИИ (запасной путь диктовки там, где нет Web Speech API). Работает только после явного согласия. */
export const DICTATE_CONSENT_KEY = "dn.dictateAi";
export const MAX_DICTATE_SEC = 90;

export const dictateConsent = () => { try { return localStorage.getItem(DICTATE_CONSENT_KEY) === "1"; } catch { return false; } };
export const setDictateConsent = (on: boolean) => { try { localStorage.setItem(DICTATE_CONSENT_KEY, on ? "1" : "0"); } catch { /* ignore */ } };

export const speechApiSupported = () => {
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
};
export const canRecordAudio = () => Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

export const pickAudioType = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result); resolve(s.slice(s.indexOf(",") + 1)); };
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(blob);
  });

/** Отправляет запись на /api/transcribe и возвращает текст. Бросает Error("fail" | "empty"). */
export async function transcribeAudio(blob: Blob, lang: string): Promise<string> {
  const data = await toBase64(blob);
  const r = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: { mime: blob.type.split(";")[0] || "audio/webm", data }, lang }),
  });
  if (!r.ok) throw new Error("fail");
  const d = (await r.json().catch(() => ({}))) as { text?: string };
  const text = (d.text ?? "").trim();
  if (!text) throw new Error("empty");
  return text;
}
