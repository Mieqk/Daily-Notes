import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { supabase } from "../lib/supabase";
import { isLocalMode } from "../lib/sync";
import {
  PLUGIN_KINDS, STARTER_PLUGINS, STARTER_TEMPLATES, blankPlugin, decodeAddon, downloadAddon, encodeAddon, newId,
  sanitizeAddon, sanitizePlugin, sanitizeTemplate, starterLang, withNewId,
} from "../addons";
import type { Addon, DayTemplate, Plugin, PluginKind } from "../addons";
import { useDayTemplates, usePlugins } from "../hooks/useAddons";
import { makeAddonStrings } from "../addon-strings";
import type { AddonKey } from "../addon-strings";

interface Props {
  lang: Lang;
  userId: string | null;
  showToast: (msg: string) => void;
}

interface Row {
  id: string;
  kind: "template" | "plugin";
  author: string;
  author_name: string;
  name: string;
  description: string;
  data: unknown;
  installs: number;
}

const btn = "rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[12px] font-bold transition-colors hover:border-[var(--ink-faint)] disabled:opacity-50";
const btnAccent = "rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50";
const field = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]";
const label = "mb-2 mt-6 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)] first:mt-0";

const KIND: Record<PluginKind, [AddonKey, AddonKey]> = {
  counter: ["kCounter", "kCounterHint"],
  number: ["kNumber", "kNumberHint"],
  scale: ["kScale", "kScaleHint"],
  check: ["kCheck", "kCheckHint"],
  checklist: ["kChecklist", "kChecklistHint"],
  question: ["kQuestion", "kQuestionHint"],
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-semibold text-[var(--ink-soft)]">
      {title}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function AddonsManager({ lang, userId, showToast }: Props) {
  const t = makeAddonStrings(lang);
  const [plugins, setPlugins] = usePlugins();
  const [templates, setTemplates] = useDayTemplates();
  const [editPlugin, setEditPlugin] = useState<Plugin | null>(null);
  const [itemsText, setItemsText] = useState("");
  const [editTpl, setEditTpl] = useState<DayTemplate | null>(null);
  const [tasksText, setTasksText] = useState("");
  const [picking, setPicking] = useState(false);
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [tab, setTab] = useState<"plugin" | "template">("plugin");
  const fileRef = useRef<HTMLInputElement>(null);

  const online = Boolean(userId && supabase && !isLocalMode());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "setup" | "error">("idle");

  const load = async () => {
    if (!online) return;
    setState("loading");
    const { data, error } = await supabase!
      .from("community_addons")
      .select("id,kind,author,author_name,name,description,data,installs")
      .order("installs", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setState(error.code === "42P01" || error.code === "PGRST205" || /community_addons/.test(error.message) ? "setup" : "error");
      return;
    }
    setRows(data as Row[]);
    setState("idle");
  };
  useEffect(() => { void load(); }, [online]);

  // Установка всегда добавляет копию с новым id, чтобы ничего своего не перезаписать
  const install = (a: Addon, galleryId?: string) => {
    if (a.kind === "plugin") setPlugins((l) => [...l, withNewId(a.item)]);
    else setTemplates((l) => [...l, withNewId(a.item)]);
    showToast(t("aAdded").replace("{n}", a.item.name));
    if (galleryId && online) void supabase!.rpc("community_addon_installed", { addon_id: galleryId });
  };

  const installCode = (text: string) => {
    const a = decodeAddon(text);
    setBad(!a);
    if (a) { install(a); setCode(""); }
  };

  const publish = async (a: Addon) => {
    if (!online) return;
    const { data: prof } = await supabase!.from("profiles").select("display_name").eq("id", userId!).maybeSingle();
    const { error } = await supabase!.from("community_addons").insert({
      kind: a.kind,
      name: a.item.name,
      description: desc.trim().slice(0, 200),
      author_name: ((prof as { display_name?: string } | null)?.display_name ?? "").slice(0, 40),
      data: { v: 1, ...a },
    });
    if (error) { showToast(t("glError")); return; }
    setPublishing(null);
    setDesc("");
    showToast(t("aPublished"));
    void load();
  };

  const savePlugin = () => {
    if (!editPlugin) return;
    const p = sanitizePlugin({ ...editPlugin, items: lines(itemsText) });
    if (!p) return;
    setPlugins((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p]));
    setEditPlugin(null);
  };

  const saveTpl = () => {
    if (!editTpl) return;
    const tp = sanitizeTemplate({ ...editTpl, tasks: lines(tasksText) });
    if (!tp) return;
    setTemplates((l) => (l.some((x) => x.id === tp.id) ? l.map((x) => (x.id === tp.id ? tp : x)) : [...l, tp]));
    setEditTpl(null);
  };

  const shareRow = (a: Addon) => (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button className={btn} onClick={() => (a.kind === "plugin" ? (setEditPlugin(a.item), setItemsText(a.item.items.join("\n"))) : (setEditTpl(a.item), setTasksText(a.item.tasks.join("\n"))))}>{t("aEdit")}</button>
        <button className={btn} onClick={() => { void navigator.clipboard?.writeText(encodeAddon(a)).then(() => showToast(t("aCopied"))); }}>⧉ {t("aCode")}</button>
        <button className={btn} onClick={() => downloadAddon(a)}>⬇ {t("aFile")}</button>
        {online && state !== "setup" && (
          <button className={btn} onClick={() => { setPublishing(publishing === a.item.id ? null : a.item.id); setDesc(""); }}>↑ {t("aPublish")}</button>
        )}
        <button
          className={`${btn} text-[var(--danger)]`}
          onClick={() => (a.kind === "plugin" ? setPlugins((l) => l.filter((x) => x.id !== a.item.id)) : setTemplates((l) => l.filter((x) => x.id !== a.item.id)))}
        >
          {t("aDelete")}
        </button>
      </div>
      {publishing === a.item.id && (
        <div className="mt-2 flex gap-2">
          <input value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} placeholder={t("glDesc")} className={field} />
          <button className={btnAccent} onClick={() => void publish(a)}>{t("aPublish")}</button>
        </div>
      )}
    </>
  );

  const item = "rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3";

  const pluginEditor = editPlugin && (
    <div className={`${item} mt-2 space-y-2.5 border-[var(--accent)]`}>
      <p className="text-[12px] font-bold text-[var(--accent-deep)]">{t(KIND[editPlugin.kind][0])} · <span className="font-normal text-[var(--ink-faint)]">{t(KIND[editPlugin.kind][1])}</span></p>
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field title={t("fEmoji")}><input value={editPlugin.emoji} maxLength={8} onChange={(e) => setEditPlugin({ ...editPlugin, emoji: e.target.value })} className={`${field} text-center`} /></Field>
        <Field title={t("fName")}><input value={editPlugin.name} maxLength={40} autoFocus onChange={(e) => setEditPlugin({ ...editPlugin, name: e.target.value })} className={field} /></Field>
      </div>
      {(editPlugin.kind === "counter" || editPlugin.kind === "number") && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field title={t("fGoal")}><input type="number" min={0} value={editPlugin.goal} onChange={(e) => setEditPlugin({ ...editPlugin, goal: Number(e.target.value) || 0 })} className={field} /></Field>
          <Field title={t("fUnit")}><input value={editPlugin.unit} maxLength={12} onChange={(e) => setEditPlugin({ ...editPlugin, unit: e.target.value })} className={field} /></Field>
          {editPlugin.kind === "counter" && (
            <Field title={t("fStep")}><input type="number" min={0.1} step={0.1} value={editPlugin.step} onChange={(e) => setEditPlugin({ ...editPlugin, step: Number(e.target.value) || 1 })} className={field} /></Field>
          )}
        </div>
      )}
      {editPlugin.kind === "checklist" && (
        <Field title={t("fItems")}><textarea rows={4} value={itemsText} onChange={(e) => setItemsText(e.target.value)} className={field} /></Field>
      )}
      {(editPlugin.kind === "check" || editPlugin.kind === "question") && (
        <Field title={t("fQuestion")}><input value={editPlugin.question} maxLength={200} onChange={(e) => setEditPlugin({ ...editPlugin, question: e.target.value })} className={field} /></Field>
      )}
      <div className="flex gap-2">
        <button className={btnAccent} disabled={!editPlugin.name.trim()} onClick={savePlugin}>{t("aSave")}</button>
        <button className={btn} onClick={() => setEditPlugin(null)}>{t("aCancel")}</button>
      </div>
    </div>
  );

  const tplEditor = editTpl && (
    <div className={`${item} mt-2 space-y-2.5 border-[var(--accent)]`}>
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field title={t("fEmoji")}><input value={editTpl.emoji} maxLength={8} onChange={(e) => setEditTpl({ ...editTpl, emoji: e.target.value })} className={`${field} text-center`} /></Field>
        <Field title={t("fName")}><input value={editTpl.name} maxLength={40} autoFocus onChange={(e) => setEditTpl({ ...editTpl, name: e.target.value })} className={field} /></Field>
      </div>
      <Field title={t("fTasks")}><textarea rows={4} value={tasksText} onChange={(e) => setTasksText(e.target.value)} className={field} /></Field>
      <Field title={t("fPrompt")}><textarea rows={3} value={editTpl.prompt} maxLength={2000} onChange={(e) => setEditTpl({ ...editTpl, prompt: e.target.value })} className={field} /></Field>
      <div className="flex gap-2">
        <button className={btnAccent} disabled={!editTpl.name.trim()} onClick={saveTpl}>{t("aSave")}</button>
        <button className={btn} onClick={() => setEditTpl(null)}>{t("aCancel")}</button>
      </div>
    </div>
  );

  const summary = (a: Addon) =>
    a.kind === "plugin"
      ? [t(KIND[a.item.kind][0]), a.item.goal ? `${a.item.goal} ${a.item.unit}`.trim() : "", a.item.items.length ? a.item.items.join(", ") : "", a.item.question].filter(Boolean).join(" · ")
      : a.item.tasks.join(" · ");

  const has = (a: Addon) => (a.kind === "plugin" ? plugins : templates).some((x) => x.name === a.item.name);

  const galleryCard = (a: Addon, opts: { key: string; galleryId?: string; meta?: string; desc?: string; mine?: boolean }) => (
    <div key={opts.key} className={`${item} flex flex-col`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-[18px]">{a.item.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{a.item.name}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-[var(--ink-soft)]">{opts.desc || summary(a)}</p>
      {opts.meta && <p className="mt-1 truncate text-[11px] text-[var(--ink-faint)]">{opts.meta}</p>}
      <div className="mt-auto flex gap-1.5 pt-2">
        <button className={`${btnAccent} flex-1`} disabled={has(a)} onClick={() => install(a, opts.galleryId)}>{has(a) ? `✓ ${t("aHave")}` : t("aInstall")}</button>
        {opts.mine && opts.galleryId && (
          <button className={`${btn} text-[var(--danger)]`} onClick={() => { void supabase!.from("community_addons").delete().eq("id", opts.galleryId!); setRows((r) => r?.filter((x) => x.id !== opts.galleryId) ?? null); }}>
            {t("aDelete")}
          </button>
        )}
      </div>
    </div>
  );

  const sl = starterLang(lang);
  const examples: Addon[] = tab === "plugin"
    ? STARTER_PLUGINS[sl].map((item) => ({ kind: "plugin", item }))
    : STARTER_TEMPLATES[sl].map((item) => ({ kind: "template", item }));
  const community = (rows ?? [])
    .filter((r) => r.kind === tab)
    .map((r) => ({ r, a: sanitizeAddon(r.data) }))
    .filter((x): x is { r: Row; a: Addon } => x.a !== null && x.a.kind === tab);
  const grid = "grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]";

  return (
    <div>
      <p className={label}>{t("adPlugins")}</p>
      <div className="space-y-2">
        {plugins.length === 0 && !editPlugin && <p className="text-[12.5px] text-[var(--ink-faint)]">{t("adNoPlugins")}</p>}
        {plugins.map((p) =>
          editPlugin?.id === p.id ? <div key={p.id}>{pluginEditor}</div> : (
            <div key={p.id} className={item}>
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-[18px]">{p.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{p.name}</span>
                <span className="text-[11px] text-[var(--ink-faint)]">{t(KIND[p.kind][0])}</span>
              </div>
              {shareRow({ kind: "plugin", item: p })}
            </div>
          ),
        )}
        {editPlugin && !plugins.some((p) => p.id === editPlugin.id) && pluginEditor}
      </div>
      {!editPlugin && (
        picking ? (
          <div className="mt-2">
            <p className="mb-2 text-[12px] font-semibold text-[var(--ink-soft)]">{t("adPickKind")}</p>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {PLUGIN_KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => { setEditPlugin({ ...blankPlugin(k), goal: k === "counter" ? 8 : 0 }); setItemsText(""); setPicking(false); }}
                  className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-2.5 text-left transition-colors hover:border-[var(--accent)]"
                >
                  <span className="block text-[12.5px] font-bold">{t(KIND[k][0])}</span>
                  <span className="block text-[11px] leading-snug text-[var(--ink-faint)]">{t(KIND[k][1])}</span>
                </button>
              ))}
            </div>
            <button className={`${btn} mt-2`} onClick={() => setPicking(false)}>{t("aCancel")}</button>
          </div>
        ) : (
          <button className={`${btn} mt-2`} onClick={() => setPicking(true)}>＋ {t("adNewPlugin")}</button>
        )
      )}

      <p className={label}>{t("adTemplates")}</p>
      <div className="space-y-2">
        {templates.length === 0 && !editTpl && <p className="text-[12.5px] text-[var(--ink-faint)]">{t("adNoTemplates")}</p>}
        {templates.map((tp) =>
          editTpl?.id === tp.id ? <div key={tp.id}>{tplEditor}</div> : (
            <div key={tp.id} className={item}>
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-[18px]">{tp.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{tp.name}</span>
              </div>
              {tp.tasks.length > 0 && <p className="mt-1 truncate text-[11.5px] text-[var(--ink-faint)]">{tp.tasks.join(" · ")}</p>}
              {shareRow({ kind: "template", item: tp })}
            </div>
          ),
        )}
        {editTpl && !templates.some((x) => x.id === editTpl.id) && tplEditor}
      </div>
      {!editTpl && (
        <button className={`${btn} mt-2`} onClick={() => { setEditTpl({ id: newId(), name: "", emoji: "📋", tasks: [], prompt: "" }); setTasksText(""); }}>
          ＋ {t("adNewTemplate")}
        </button>
      )}

      <p className={label}>{t("imTitle")}</p>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => { setCode(e.target.value); setBad(false); }} onKeyDown={(e) => e.key === "Enter" && installCode(code)} placeholder={t("imPaste")} className={field} />
        <button className={btnAccent} disabled={!code.trim()} onClick={() => installCode(code)}>{t("aInstall")}</button>
      </div>
      <button className={`${btn} mt-2`} onClick={() => fileRef.current?.click()}>📄 {t("imFile")}</button>
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
      {bad && <p className="mt-1.5 text-[12px] font-semibold text-[var(--danger)]">{t("imBad")}</p>}

      <div className="mb-3 mt-6 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{t("glTitle")}</p>
        {(["plugin", "template"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`rounded-full border px-3 py-1 text-[12px] font-bold ${tab === k ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "border-[var(--line)] text-[var(--ink-soft)]"}`}
          >
            {k === "plugin" ? t("glTabPlugins") : t("glTabTemplates")}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[12px] font-semibold text-[var(--ink-soft)]">{t("glExamples")}</p>
      <div className={grid}>{examples.map((a) => galleryCard(a, { key: a.item.id }))}</div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-[var(--ink-soft)]">{t("glCommunity")}</p>
        {online && state !== "setup" && <button onClick={() => void load()} className="text-[11.5px] font-bold text-[var(--accent-deep)] underline">{t("glRefresh")}</button>}
      </div>
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
          {community.map(({ r, a }) =>
            galleryCard(a, {
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
  );
}
