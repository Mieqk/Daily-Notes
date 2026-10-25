import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { THEMES } from "../themes";
import type { ThemeId } from "../themes";
import { customVars } from "../look";
import type { Look } from "../look";
import { supabase } from "../lib/supabase";
import { isLocalMode } from "../lib/sync";
import { STARTER_PACKS, cleanName, decodeTheme, downloadTheme, encodeTheme, sanitizePack } from "../theme-share";
import type { ThemePack } from "../theme-share";
import { makeThemeStrings } from "../theme-strings";

interface Props {
  look: Look;
  theme: ThemeId;
  onLook: (l: Look) => void;
  onTheme: (t: ThemeId) => void;
  lang: Lang;
  userId: string | null;
  showToast: (msg: string) => void;
}

interface Row {
  id: string;
  author: string;
  author_name: string;
  name: string;
  description: string;
  data: unknown;
  installs: number;
}

const btn = "rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[12px] font-bold transition-colors hover:border-[var(--ink-faint)] disabled:opacity-50";
const btnAccent = "rounded-lg bg-[var(--accent)] px-3 py-2 text-[12px] font-bold text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50";
const field = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]";

const RADIUS = { auto: 10, sharp: 0, soft: 4, round: 16 } as const;
const FONT: Record<string, string> = {
  serif: "Georgia, serif",
  mono: "ui-monospace, Menlo, monospace",
  unbounded: '"Unbounded Variable", sans-serif',
};

/** Маленький макет приложения в цветах темы, чтобы оценить её до установки. */
function Preview({ pack }: { pack: ThemePack }) {
  const meta = THEMES.find((t) => t.id === pack.theme);
  const v = pack.theme === "custom" ? customVars(pack.look) : null;
  const bg = v?.["--bg"] ?? meta?.swatch.bg ?? "#eee";
  const panel = v?.["--panel"] ?? meta?.swatch.panel ?? "#fff";
  const accent = v?.["--accent"] ?? meta?.swatch.accent ?? "#333";
  const ink = v?.["--ink"] ?? (pack.look.base === "dark" ? "#eee" : "#222");
  const line = v?.["--line"] ?? "rgba(0,0,0,.12)";
  const r = RADIUS[pack.look.radius];
  const bw = pack.look.border === "bold" ? 2 : pack.look.border === "none" ? 0 : 1;
  const shadow = pack.look.shadow === "hard" ? `3px 3px 0 ${ink}` : pack.look.shadow === "deep" ? "0 8px 16px -6px rgba(0,0,0,.45)" : "none";
  return (
    <div aria-hidden className="relative h-24 overflow-hidden p-2.5" style={{ background: bg, borderRadius: Math.min(r, 12) }}>
      <div className="flex h-full gap-2">
        <div className="w-1/4 space-y-1.5 pt-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5" style={{ background: i === 0 ? accent : line, borderRadius: r ? 4 : 0, width: i === 0 ? "90%" : "70%" }} />
          ))}
        </div>
        <div className="flex-1 p-2" style={{ background: panel, borderRadius: r, border: `${bw}px solid ${bw === 2 ? ink : line}`, boxShadow: shadow }}>
          <div className="truncate text-[12px] font-bold leading-tight" style={{ color: ink, fontFamily: FONT[pack.look.headFont] ?? "inherit" }}>
            Aa {pack.name}
          </div>
          <div className="mt-1.5 h-1 w-4/5" style={{ background: line }} />
          <div className="mt-1 h-1 w-3/5" style={{ background: line }} />
          <div className="mt-2 inline-block h-3.5 w-12" style={{ background: accent, borderRadius: r ? 999 : 0 }} />
        </div>
      </div>
    </div>
  );
}

export default function ThemeShare({ look, theme, onLook, onTheme, lang, userId, showToast }: Props) {
  const t = makeThemeStrings(lang);
  const [name, setName] = useState(t("shMyTheme"));
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [prev, setPrev] = useState<{ theme: ThemeId; look: Look; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const online = Boolean(userId && supabase && !isLocalMode());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "setup" | "error">("idle");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const pack = (): ThemePack => ({ v: 1, name: cleanName(name, t("shMyTheme")), theme, look });

  const install = (p: ThemePack, galleryId?: string) => {
    setPrev({ theme, look, name: p.name });
    onTheme(p.theme);
    onLook(p.look);
    showToast(t("shInstalled").replace("{n}", p.name));
    if (galleryId && online) void supabase!.rpc("community_theme_installed", { theme_id: galleryId });
  };

  const installCode = (text: string) => {
    const p = decodeTheme(text);
    setBad(!p);
    if (p) { install(p); setCode(""); }
  };

  const load = async () => {
    if (!online) return;
    setState("loading");
    const { data, error } = await supabase!
      .from("community_themes")
      .select("id,author,author_name,name,description,data,installs")
      .order("installs", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      setState(error.code === "42P01" || error.code === "PGRST205" || /community_themes/.test(error.message) ? "setup" : "error");
      return;
    }
    setRows(data as Row[]);
    setState("idle");
  };

  useEffect(() => { void load(); }, [online]);

  const publish = async () => {
    if (!online || busy) return;
    setBusy(true);
    const { data: prof } = await supabase!.from("profiles").select("display_name").eq("id", userId!).maybeSingle();
    const p = pack();
    const { error } = await supabase!.from("community_themes").insert({
      name: p.name,
      description: desc.trim().slice(0, 200),
      author_name: cleanName((prof as { display_name?: string } | null)?.display_name ?? ""),
      data: p,
    });
    setBusy(false);
    if (error) { showToast(t("glError")); return; }
    setDesc("");
    showToast(t("glPublished"));
    void load();
  };

  const remove = async (id: string) => {
    await supabase!.from("community_themes").delete().eq("id", id);
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  };

  const card = (p: ThemePack, opts: { key: string; meta?: string; desc?: string; galleryId?: string; mine?: boolean }) => (
    <div key={opts.key} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-2)]">
      <Preview pack={p} />
      <div className="p-2.5">
        <p className="truncate text-[13px] font-bold">{p.name}</p>
        {opts.meta && <p className="truncate text-[11px] text-[var(--ink-faint)]">{opts.meta}</p>}
        {opts.desc && <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-[var(--ink-soft)]">{opts.desc}</p>}
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => install(p, opts.galleryId)} className={`${btnAccent} flex-1 py-1.5`}>{t("glTry")}</button>
          {opts.mine && opts.galleryId && (
            <button onClick={() => void remove(opts.galleryId!)} className={`${btn} py-1.5 text-[var(--danger)]`}>{t("glDelete")}</button>
          )}
        </div>
      </div>
    </div>
  );

  const grid = "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]";
  const community = (rows ?? []).map((r) => ({ r, p: sanitizePack(r.data) })).filter((x): x is { r: Row; p: ThemePack } => x.p !== null);
  const mine = community.filter((x) => x.r.author === userId);
  const label = "mb-2 mt-5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]";

  return (
    <div>
      {prev && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[12.5px]">
          <span className="min-w-0 truncate font-semibold">✓ {t("shInstalled").replace("{n}", prev.name)}</span>
          <button onClick={() => { onTheme(prev.theme); onLook(prev.look); setPrev(null); }} className="font-bold text-[var(--accent-deep)] underline">
            {t("shUndo")}
          </button>
        </div>
      )}

      <p className={`${label} mt-0`}>{t("shTitle")}</p>
      <label className="block text-[12px] font-semibold text-[var(--ink-soft)]">
        {t("shName")}
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => downloadTheme(pack())} className={btn}>⬇ {t("shDownload")}</button>
        <button
          onClick={() => { void navigator.clipboard?.writeText(encodeTheme(pack())).then(() => showToast(t("shCopied"))); }}
          className={btn}
        >
          ⧉ {t("shCopy")}
        </button>
        {online && state !== "setup" && (
          <button onClick={() => void publish()} disabled={busy} className={btnAccent}>↑ {t("glPublish")}</button>
        )}
      </div>
      {online && state !== "setup" && (
        <input value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} placeholder={t("glDesc")} className={`${field} mt-2`} />
      )}

      <p className={label}>{t("shImport")}</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setBad(false); }}
          onKeyDown={(e) => e.key === "Enter" && installCode(code)}
          placeholder={t("shPaste")}
          className={field}
        />
        <button onClick={() => installCode(code)} disabled={!code.trim()} className={btnAccent}>{t("shInstall")}</button>
      </div>
      <button onClick={() => fileRef.current?.click()} className={`${btn} mt-2`}>📄 {t("shFile")}</button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json,text/plain"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f && f.size < 20000) installCode(await f.text());
          else if (f) setBad(true);
        }}
      />
      {bad && <p className="mt-1.5 text-[12px] font-semibold text-[var(--danger)]">{t("shBadCode")}</p>}

      <p className={label}>{t("glExamples")}</p>
      <div className={grid}>{STARTER_PACKS.map((p) => card(p, { key: p.name }))}</div>

      <div className="mt-5 flex items-center justify-between">
        <p className={`${label} mt-0 mb-0`}>{t("glCommunity")}</p>
        {online && state !== "setup" && (
          <button onClick={() => void load()} className="text-[11.5px] font-bold text-[var(--accent-deep)] underline">{t("glRefresh")}</button>
        )}
      </div>
      <div className="mt-2">
        {!online ? (
          <p className="text-[12.5px] text-[var(--ink-faint)]">{t("glNeedLogin")}</p>
        ) : state === "setup" ? (
          <p className="text-[12.5px] text-[var(--ink-faint)]">{t("glNeedSetup")}</p>
        ) : state === "loading" && !rows ? (
          <p className="text-[12.5px] text-[var(--ink-faint)]">{t("glLoading")}</p>
        ) : state === "error" ? (
          <p className="text-[12.5px] text-[var(--danger)]">{t("glError")}</p>
        ) : community.length === 0 ? (
          <p className="text-[12.5px] text-[var(--ink-faint)]">{t("glEmpty")}</p>
        ) : (
          <div className={grid}>
            {community.map(({ r, p }) =>
              card({ ...p, name: r.name }, {
                key: r.id,
                galleryId: r.id,
                mine: r.author === userId,
                desc: r.description,
                meta: [r.author_name && t("glBy").replace("{a}", r.author_name), `⬇ ${r.installs}`].filter(Boolean).join(" · "),
              }),
            )}
          </div>
        )}
      </div>

      {mine.length > 0 && (
        <>
          <p className={label}>{t("glMine")}</p>
          <div className={grid}>
            {mine.map(({ r, p }) => card({ ...p, name: r.name }, { key: `m-${r.id}`, galleryId: r.id, mine: true, meta: `⬇ ${r.installs}` }))}
          </div>
        </>
      )}
    </div>
  );
}
