import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { useStored } from "../store";

export type CoachMode = "food" | "workout";
export interface CoachItem { name: string; grams?: number; kcal?: number; protein?: number; fat?: number; carbs?: number; sets?: number; reps?: number; kg?: number }
interface Msg { id: string; role: "user" | "assistant"; text: string; items?: CoachItem[]; added?: boolean }

interface S {
  name: string; hello: string; ph: string; send: string; thinking: string; err: string; details: string; add: string; added: string; clear: string; off: string;
  consent: string; enable: string; chips: string[]; kcal: string; g: string; setsX: string; kg: string;
}
const L: Record<CoachMode, Record<string, S>> = {
  workout: {
    ru: { name: "Тренер", hello: "Привет! Я твой тренер. Расскажи о цели, уровне и инвентаре, или просто скажи, какую мышцу качаем, и я составлю тренировку.", ph: "Напишите тренеру…", send: "Отправить", thinking: "Тренер думает…", err: "Не получилось ответить.", details: "Причина", add: "Добавить в тренировку", added: "Добавлено в день", clear: "Очистить чат", off: "Выключить помощника", consent: "Чтобы помощник отвечал, в Google Gemini уйдёт ваша переписка с ним и короткая сводка за день (упражнения и рабочие веса). Записи дневника, имя и email не отправляются. Пока вы не включите, ничего не отправляется.", enable: "Включить помощника", chips: ["Составь тренировку на грудь и трицепс на 45 минут", "Как мне начать, если я новичок?", "Как прогрессировать в жиме лёжа?"], kcal: "ккал", g: "г", setsX: "×", kg: "кг" },
    en: { name: "Trainer", hello: "Hi! I'm your trainer. Tell me your goal, level and equipment, or just say which muscles to train and I'll build a workout.", ph: "Message your trainer…", send: "Send", thinking: "Trainer is thinking…", err: "Couldn't get an answer.", details: "Reason", add: "Add to workout", added: "Added to the day", clear: "Clear chat", off: "Turn off the assistant", consent: "To answer, your chat with the assistant and a short summary of your day (exercises and working weights) are sent to Google Gemini. Diary entries, name and email are never sent. Nothing is sent until you turn it on.", enable: "Turn on the assistant", chips: ["Build a 45-minute chest and triceps workout", "How should I start as a beginner?", "How do I progress my bench press?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
    be: { name: "Трэнер", hello: "Прывітанне! Я твой трэнер. Раскажы пра мэту, узровень і інвентар, або проста скажы, якую мышцу трэніруем, і я складу трэніроўку.", ph: "Напішыце трэнеру…", send: "Адправіць", thinking: "Трэнер думае…", err: "Не атрымалася адказаць.", details: "Прычына", add: "Дадаць у трэніроўку", added: "Дададзена ў дзень", clear: "Ачысціць чат", off: "Выключыць памочніка", consent: "Каб памочнік адказваў, у Google Gemini пойдзе ваша перапіска з ім і кароткія звесткі за дзень (практыкаванні і працоўныя вагі). Запісы дзённіка, імя і email не адпраўляюцца. Пакуль вы не ўключыце, нічога не адпраўляецца.", enable: "Уключыць памочніка", chips: ["Скласці трэніроўку на грудзі і трыцэпс на 45 хвілін", "Як пачаць, калі я новачок?", "Як прагрэсаваць у жыме лежачы?"], kcal: "ккал", g: "г", setsX: "×", kg: "кг" },
    uk: { name: "Тренер", hello: "Привіт! Я твій тренер. Розкажи про мету, рівень та інвентар, або просто скажи, який м'яз качаємо, і я складу тренування.", ph: "Напишіть тренеру…", send: "Надіслати", thinking: "Тренер думає…", err: "Не вдалося відповісти.", details: "Причина", add: "Додати в тренування", added: "Додано в день", clear: "Очистити чат", off: "Вимкнути помічника", consent: "Щоб помічник відповідав, до Google Gemini піде ваше листування з ним і коротке зведення за день (вправи та робочі ваги). Записи щоденника, ім'я та email не надсилаються. Доки ви не ввімкнете, нічого не надсилається.", enable: "Увімкнути помічника", chips: ["Склади тренування на груди й тріцепс на 45 хвилин", "Як почати, якщо я новачок?", "Як прогресувати в жимі лежачи?"], kcal: "ккал", g: "г", setsX: "×", kg: "кг" },
    de: { name: "Trainer", hello: "Hallo! Ich bin dein Trainer. Nenne mir Ziel, Level und Equipment oder sag einfach, welche Muskeln wir trainieren, und ich stelle ein Training zusammen.", ph: "Schreibe deinem Trainer…", send: "Senden", thinking: "Trainer denkt nach…", err: "Keine Antwort erhalten.", details: "Grund", add: "Zum Training hinzufügen", added: "Zum Tag hinzugefügt", clear: "Chat leeren", off: "Assistenten ausschalten", consent: "Damit der Assistent antwortet, werden dein Chat mit ihm und eine kurze Tagesübersicht (Übungen und Arbeitsgewichte) an Google Gemini gesendet. Tagebucheinträge, Name und E-Mail werden nie gesendet. Ohne Einschalten wird nichts gesendet.", enable: "Assistenten einschalten", chips: ["Erstelle ein 45-Minuten-Training für Brust und Trizeps", "Wie fange ich als Anfänger an?", "Wie steigere ich mich beim Bankdrücken?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
    fr: { name: "Coach", hello: "Salut ! Je suis ton coach. Dis-moi ton objectif, ton niveau et ton matériel, ou indique juste les muscles à travailler et je compose une séance.", ph: "Écris à ton coach…", send: "Envoyer", thinking: "Le coach réfléchit…", err: "Impossible d’obtenir une réponse.", details: "Raison", add: "Ajouter à la séance", added: "Ajouté à la journée", clear: "Effacer le chat", off: "Désactiver l’assistant", consent: "Pour répondre, ta conversation avec l’assistant et un court résumé de ta journée (exercices et charges) sont envoyés à Google Gemini. Tes notes de journal, ton nom et ton e-mail ne sont jamais envoyés. Rien n’est envoyé tant que tu n’actives pas.", enable: "Activer l’assistant", chips: ["Compose une séance pectoraux et triceps de 45 minutes", "Comment démarrer quand on est débutant ?", "Comment progresser au développé couché ?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
    es: { name: "Entrenador", hello: "¡Hola! Soy tu entrenador. Cuéntame tu objetivo, nivel y material, o dime qué músculos trabajar y armo un entrenamiento.", ph: "Escribe a tu entrenador…", send: "Enviar", thinking: "El entrenador está pensando…", err: "No se pudo obtener respuesta.", details: "Motivo", add: "Añadir al entrenamiento", added: "Añadido al día", clear: "Borrar chat", off: "Desactivar el asistente", consent: "Para responder, tu chat con el asistente y un breve resumen de tu día (ejercicios y pesos de trabajo) se envían a Google Gemini. Nunca se envían entradas del diario, nombre ni correo. No se envía nada hasta que lo actives.", enable: "Activar el asistente", chips: ["Arma un entrenamiento de pecho y tríceps de 45 minutos", "¿Cómo empiezo si soy principiante?", "¿Cómo progreso en el press de banca?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
  },
  food: {
    ru: { name: "Диетолог", hello: "Привет! Я помощник по питанию. Напиши, что съел («курица 150 г и гречка 200 г»), и я посчитаю КБЖУ, или спроси, что съесть, чтобы уложиться в цель.", ph: "Напишите помощнику…", send: "Отправить", thinking: "Считаю…", err: "Не получилось ответить.", details: "Причина", add: "Добавить в день", added: "Добавлено в день", clear: "Очистить чат", off: "Выключить помощника", consent: "Чтобы помощник отвечал, в Google Gemini уйдёт ваша переписка с ним и короткая сводка за день (съеденное и цель по калориям). Записи дневника, имя и email не отправляются. Пока вы не включите, ничего не отправляется.", enable: "Включить помощника", chips: ["Съел курицу 150 г, гречку 200 г и яблоко. Посчитай", "Что съесть на ужин, чтобы добрать белок?", "Как мне набрать вес без лишнего жира?"], kcal: "ккал", g: "г", setsX: "×", kg: "кг" },
    en: { name: "Nutrition", hello: "Hi! I'm your nutrition assistant. Tell me what you ate (\"chicken 150 g and buckwheat 200 g\") and I'll work out the macros, or ask what to eat to hit your goal.", ph: "Message the assistant…", send: "Send", thinking: "Calculating…", err: "Couldn't get an answer.", details: "Reason", add: "Add to the day", added: "Added to the day", clear: "Clear chat", off: "Turn off the assistant", consent: "To answer, your chat with the assistant and a short summary of your day (what you ate and your calorie goal) are sent to Google Gemini. Diary entries, name and email are never sent. Nothing is sent until you turn it on.", enable: "Turn on the assistant", chips: ["I ate chicken 150 g, buckwheat 200 g and an apple. Calculate it", "What should I eat for dinner to get more protein?", "How do I gain weight without extra fat?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
    be: { name: "Дыетолаг", hello: "Прывітанне! Я памочнік па харчаванні. Напішы, што з'еў («курыца 150 г і грэчка 200 г»), і я падлічу КБЖУ, або спытай, што з'есці, каб трапіць у мэту.", ph: "Напішыце памочніку…", send: "Адправіць", thinking: "Лічу…", err: "Не атрымалася адказаць.", details: "Прычына", add: "Дадаць у дзень", added: "Дададзена ў дзень", clear: "Ачысціць чат", off: "Выключыць памочніка", consent: "Каб памочнік адказваў, у Google Gemini пойдзе ваша перапіска з ім і кароткія звесткі за дзень (з'едзенае і мэта па калорыях). Запісы дзённіка, імя і email не адпраўляюцца. Пакуль вы не ўключыце, нічога не адпраўляецца.", enable: "Уключыць памочніка", chips: ["З'еў курыцу 150 г, грэчку 200 г і яблык. Падлічы", "Што з'есці на вячэру, каб дабраць бялок?", "Як набраць вагу без лішняга тлушчу?"], kcal: "ккал", g: "г", setsX: "×", kg: "кг" },
    uk: { name: "Дієтолог", hello: "Привіт! Я помічник із харчування. Напиши, що з'їв («курка 150 г і гречка 200 г»), і я порахую КБЖВ, або спитай, що з'їсти, щоб вкластися в мету.", ph: "Напишіть помічнику…", send: "Надіслати", thinking: "Рахую…", err: "Не вдалося відповісти.", details: "Причина", add: "Додати в день", added: "Додано в день", clear: "Очистити чат", off: "Вимкнути помічника", consent: "Щоб помічник відповідав, до Google Gemini піде ваше листування з ним і коротке зведення за день (з'їдене й мета за калоріями). Записи щоденника, ім'я та email не надсилаються. Доки ви не ввімкнете, нічого не надсилається.", enable: "Увімкнути помічника", chips: ["З'їв курку 150 г, гречку 200 г і яблуко. Порахуй", "Що з'їсти на вечерю, щоб добрати білок?", "Як набрати вагу без зайвого жиру?"], kcal: "ккал", g: "г", setsX: "×", kg: "кг" },
    de: { name: "Ernährung", hello: "Hallo! Ich bin dein Ernährungsassistent. Schreib, was du gegessen hast („Hähnchen 150 g und Buchweizen 200 g“), und ich berechne die Makros, oder frag, was du essen sollst, um dein Ziel zu erreichen.", ph: "Schreibe dem Assistenten…", send: "Senden", thinking: "Ich rechne…", err: "Keine Antwort erhalten.", details: "Grund", add: "Zum Tag hinzufügen", added: "Zum Tag hinzugefügt", clear: "Chat leeren", off: "Assistenten ausschalten", consent: "Damit der Assistent antwortet, werden dein Chat mit ihm und eine kurze Tagesübersicht (Gegessenes und Kalorienziel) an Google Gemini gesendet. Tagebucheinträge, Name und E-Mail werden nie gesendet. Ohne Einschalten wird nichts gesendet.", enable: "Assistenten einschalten", chips: ["Ich habe Hähnchen 150 g, Buchweizen 200 g und einen Apfel gegessen. Berechne es", "Was esse ich abends, um mehr Eiweiß zu bekommen?", "Wie nehme ich ohne zusätzliches Fett zu?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
    fr: { name: "Nutrition", hello: "Salut ! Je suis ton assistant nutrition. Dis-moi ce que tu as mangé (« poulet 150 g et sarrasin 200 g ») et je calcule les macros, ou demande quoi manger pour atteindre ton objectif.", ph: "Écris à l’assistant…", send: "Envoyer", thinking: "Je calcule…", err: "Impossible d’obtenir une réponse.", details: "Raison", add: "Ajouter à la journée", added: "Ajouté à la journée", clear: "Effacer le chat", off: "Désactiver l’assistant", consent: "Pour répondre, ta conversation avec l’assistant et un court résumé de ta journée (ce que tu as mangé et ton objectif calorique) sont envoyés à Google Gemini. Tes notes de journal, ton nom et ton e-mail ne sont jamais envoyés. Rien n’est envoyé tant que tu n’actives pas.", enable: "Activer l’assistant", chips: ["J’ai mangé du poulet 150 g, du sarrasin 200 g et une pomme. Calcule", "Que manger ce soir pour avoir plus de protéines ?", "Comment prendre du poids sans graisse en trop ?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
    es: { name: "Nutrición", hello: "¡Hola! Soy tu asistente de nutrición. Dime qué comiste («pollo 150 g y trigo sarraceno 200 g») y calculo los macros, o pregunta qué comer para llegar a tu meta.", ph: "Escribe al asistente…", send: "Enviar", thinking: "Calculando…", err: "No se pudo obtener respuesta.", details: "Motivo", add: "Añadir al día", added: "Añadido al día", clear: "Borrar chat", off: "Desactivar el asistente", consent: "Para responder, tu chat con el asistente y un breve resumen de tu día (lo que comiste y tu meta de calorías) se envían a Google Gemini. Nunca se envían entradas del diario, nombre ni correo. No se envía nada hasta que lo actives.", enable: "Activar el asistente", chips: ["Comí pollo 150 g, trigo sarraceno 200 g y una manzana. Calcula", "¿Qué ceno para llegar a mi proteína?", "¿Cómo gano peso sin grasa extra?"], kcal: "kcal", g: "g", setsX: "×", kg: "kg" },
  },
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

interface Props {
  mode: CoachMode;
  lang: Lang;
  /** Короткая сводка за день для модели (собирает вкладка). */
  context: string;
  onApply: (items: CoachItem[]) => void;
}

export default function CoachChat({ mode, lang, context, onApply }: Props) {
  const l = (L[mode][lang] ?? L[mode].en);
  const [on, setOn] = useStored<boolean>(mode === "food" ? "dn.coachFood" : "dn.coachWorkout", false);
  const [msgs, setMsgs] = useStored<Msg[]>(`dn.coach.${mode}`, []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // текст ответа, который ещё печатается (приходит потоком); в историю попадает целиком, когда ответ готов
  const [live, setLive] = useState("");
  const [error, setError] = useState<{ msg: string; detail?: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [msgs.length, busy, live]);

  // кнопка «наверх»: появляется, когда чат пролистан вниз; страница листается внутри <main>
  const rootRef = useRef<HTMLDivElement>(null);
  const [showUp, setShowUp] = useState(false);
  useEffect(() => {
    const box = rootRef.current?.closest("main");
    if (!box) return;
    const onScroll = () => setShowUp(box.scrollTop > 400);
    onScroll();
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, [on]);
  const toTop = () => rootRef.current?.closest("main")?.scrollTo({ top: 0, behavior: "smooth" });

  const send = async (raw: string) => {
    const t = raw.trim();
    if (!t || busy || !on) return;
    const next: Msg[] = [...msgs, { id: uid(), role: "user" as const, text: t.slice(0, 600) }].slice(-40);
    setMsgs(next);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 55_000);
      const r = await fetch("/api/coach", {
        signal: ctl.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, mode, context, messages: next.slice(-14).map((m) => ({ role: m.role, text: m.text, items: m.items?.map((it) => ({ name: it.name })) })) }),
      });
      // тип ответа не проверяем: прокси и WebView могут его менять, а построчный разбор понимает и обычный JSON
      if (!r.ok || !r.body) {
        clearTimeout(timer);
        const d = await r.json().catch(() => ({}));
        throw Object.assign(new Error("bad"), { detail: d?.detail || `HTTP ${r.status}` });
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      type Fin = { reply?: string; items?: CoachItem[]; error?: string; detail?: string };
      let fin = null as Fin | null;
      const onLine = (raw: string) => {
        const line = raw.trim();
        if (!line) return;
        let ev: Fin & { d?: string; done?: boolean };
        try { ev = JSON.parse(line); } catch { return; }
        if (typeof ev.d === "string") { acc += ev.d; setLive(acc); }
        else if (ev.done || ev.error || typeof ev.reply === "string") fin = ev;
      };
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            onLine(buf.slice(0, nl));
            buf = buf.slice(nl + 1);
          }
        }
        onLine(buf);
      } catch (e) {
        // связь оборвалась посреди ответа: оставляем то, что успело прийти
        if (!acc) throw e;
      } finally {
        clearTimeout(timer);
      }
      const reply = typeof fin?.reply === "string" && fin.reply ? fin.reply : acc.trim();
      if (!reply) throw Object.assign(new Error("bad"), { detail: fin?.detail || `empty reply (HTTP ${r.status})` });
      const items = Array.isArray(fin?.items) && fin.items.length ? fin.items : undefined;
      // от текущей истории, а не от снимка до запроса: иначе пропадёт отметка «Добавлено», поставленная во время ответа
      setMsgs((prev) => [...prev, { id: uid(), role: "assistant" as const, text: reply, items }].slice(-40));
      if (fin?.error) setError({ msg: l.err, detail: fin.detail });
    } catch (e) {
      const err = e as { detail?: string; name?: string };
      setError({ msg: l.err, detail: err.name === "AbortError" ? "timeout" : err.detail });
    } finally {
      setBusy(false);
      setLive("");
    }
  };

  const apply = (m: Msg) => {
    if (!m.items || m.added) return;
    onApply(m.items);
    setMsgs((prev) => prev.map((x) => (x.id === m.id ? { ...x, added: true } : x)));
  };

  const describe = (it: CoachItem) =>
    mode === "food"
      ? `${it.name} · ${it.grams} ${l.g} · ${it.kcal} ${l.kcal}`
      : `${it.name} · ${it.sets}${l.setsX}${it.reps}${it.kg ? ` · ${it.kg} ${l.kg}` : ""}`;

  const bubble = "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed";

  if (!on) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] text-[18px] font-bold text-[var(--accent-ink)]" aria-hidden="true">{l.name[0]}</div>
        <p className="text-[13.5px] leading-relaxed">{l.hello}</p>
        <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">{l.consent}</p>
        <button onClick={() => setOn(true)} className="flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-[13px] font-bold text-[var(--accent-ink)] active:scale-95">{l.enable}</button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)]" aria-hidden="true">{l.name[0]}</div>
          <div className={`${bubble} rounded-bl-md border border-[var(--line)] bg-[var(--panel)]`}>{l.hello}</div>
        </div>
        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex items-end gap-2"}>
            {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)]" aria-hidden="true">{l.name[0]}</div>}
            <div className={`${bubble} ${m.role === "user" ? "rounded-br-md bg-[var(--accent)] text-[var(--accent-ink)]" : "flex flex-col gap-3 rounded-bl-md border border-[var(--line)] bg-[var(--panel)]"}`}>
              <span>{m.text}</span>
              {m.items && (
                <div className="flex flex-col gap-2 rounded-lg bg-[var(--panel-2)] p-2.5">
                  <ul className="flex flex-col gap-1 text-[12.5px]">{m.items.map((it, i) => <li key={i}>{describe(it)}</li>)}</ul>
                  <button onClick={() => apply(m)} disabled={m.added} className="flex h-9 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-bold text-[var(--accent-ink)] active:scale-95 disabled:opacity-60">{m.added ? `✓ ${l.added}` : l.add}</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && live && (
          <div className="flex items-end gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)]" aria-hidden="true">{l.name[0]}</div>
            <div className={`${bubble} rounded-bl-md border border-[var(--line)] bg-[var(--panel)]`} aria-live="polite">{live}<span className="ml-0.5 inline-block w-[0.5ch] animate-pulse">▍</span></div>
          </div>
        )}
        {busy && !live && <div className="text-[12.5px] text-[var(--ink-faint)]" role="status">{l.thinking}</div>}
        {error && (
          <div className="text-[12.5px] font-semibold text-red-400" role="alert">
            {error.msg}
            {error.detail && <div className="mt-1 break-words text-[11px] font-normal text-[var(--ink-faint)]">{l.details}: {error.detail}</div>}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {l.chips.map((c) => <button key={c} onClick={() => send(c)} disabled={busy} className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-left text-[12.5px] font-semibold hover:border-[var(--accent)] active:scale-95 disabled:opacity-60">{c}</button>)}
        </div>
      )}

      <div className="sticky bottom-24 z-10 flex gap-2 bg-[var(--bg)] pb-1 pt-2 md:bottom-0">
        {showUp && (
          <button onClick={toTop} aria-label={UP[lang] ?? UP.en} title={UP[lang] ?? UP.en} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[16px] font-bold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] active:scale-95">↑</button>
        )}
        <input className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-[13.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)]" value={text} maxLength={600} placeholder={l.ph} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(text); }} />
        <button onClick={() => send(text)} disabled={busy || !text.trim()} className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">{l.send}</button>
      </div>

      <div className="flex justify-between text-[12px] font-semibold text-[var(--ink-faint)]">
        <button onClick={() => { setMsgs([]); setError(null); }} disabled={!msgs.length || busy} className="hover:text-[var(--ink)] disabled:opacity-40">{l.clear}</button>
        <button onClick={() => setOn(false)} disabled={busy} className="hover:text-[var(--ink)] disabled:opacity-40">{l.off}</button>
      </div>
    </div>
  );
}

const UP: Record<Lang, string> = { ru: "Наверх", en: "Back to top", be: "Уверх", uk: "Нагору", de: "Nach oben", fr: "Haut de page", es: "Arriba" };

export const SEG: Record<Lang, { coach: string; day: string }> = {
  ru: { coach: "Помощник", day: "День" },
  en: { coach: "Assistant", day: "Day" },
  be: { coach: "Памочнік", day: "Дзень" },
  uk: { coach: "Помічник", day: "День" },
  de: { coach: "Assistent", day: "Tag" },
  fr: { coach: "Assistant", day: "Jour" },
  es: { coach: "Asistente", day: "Día" },
};
