/** Простой рингтон на WebAudio: двойной гудок раз в 2 секунды. Если браузер не даёт звук без касания, остаётся вибрация. */
let ctx: AudioContext | null = null;
let timer = 0;

function beep(freq: number, at: number, len: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

export function startRing(incoming: boolean) {
  stopRing();
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const tick = () => {
      if (!ctx) return;
      void ctx.resume();
      const t = ctx.currentTime;
      if (incoming) { beep(880, t, 0.25); beep(660, t + 0.3, 0.25); }
      else beep(440, t, 0.5);
      if (incoming && "vibrate" in navigator) navigator.vibrate([250, 100, 250]);
    };
    tick();
    timer = window.setInterval(tick, 2000);
  } catch { /* звук не обязателен */ }
}

export function stopRing() {
  window.clearInterval(timer);
  timer = 0;
  if (ctx) { void ctx.close().catch(() => {}); ctx = null; }
  try { if ("vibrate" in navigator) navigator.vibrate(0); } catch { /* ignore */ }
}
