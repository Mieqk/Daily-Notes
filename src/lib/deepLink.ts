// Ярлыки PWA (долгое нажатие на значок) открывают нужный раздел: /?tab=plan, /?tab=hobby&sub=ai
const TABS = ["daily", "plan", "stats", "notes", "sleep", "hobby", "friends", "settings"];
const SUBS = ["ai", "food", "workout"];

/** Возвращает, что сохранить в localStorage; пусто, если в адресе нет известных значений. */
export function parseDeepLink(search: string): Record<string, string> {
  const p = new URLSearchParams(search);
  const out: Record<string, string> = {};
  const tab = p.get("tab");
  if (tab && TABS.includes(tab)) out["dn.tab"] = JSON.stringify(tab);
  const sub = p.get("sub");
  if (tab === "hobby" && sub && SUBS.includes(sub)) out["dn.hobbyTab"] = JSON.stringify(sub);
  return out;
}

/** Применяет ссылку один раз при старте и убирает из адреса только свои параметры (tab, sub): остальные, например ?gcal= после входа в Google, нужны другим частям приложения. */
export function applyDeepLink() {
  try {
    const found = parseDeepLink(window.location.search);
    const p = new URLSearchParams(window.location.search);
    if (!p.has("tab") && !p.has("sub")) return;
    for (const [k, v] of Object.entries(found)) localStorage.setItem(k, v);
    p.delete("tab");
    p.delete("sub");
    const qs = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
  } catch { /* не критично */ }
}
