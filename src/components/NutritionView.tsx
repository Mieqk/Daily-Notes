import { useState } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "../i18n";
import { localeOf } from "../i18n";
import { fromISO, shiftISO, todayISO } from "../store";
import { useSyncedStored, mergeById, mergeLog, preferRemote } from "../lib/fitnessSync";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";
import CoachChat, { SEG, type CoachItem } from "./CoachChat";
import DayCalendar from "./DayCalendar";
import { makeUI } from "../ui-strings";

interface Per100 { kcal: number; p: number; f: number; c: number }
interface Food extends Per100 { id: string; name: string; grams: number }
interface Entry { id: string; name: string; grams: number; per100: Per100 }

const L: Record<string, {
  today: string; more: string; calc: string; goal: string; kcal: string; p: string; f: string; c: string; left: string; over: string;
  quick: string; quickEmpty: string; add: string; newFood: string; name: string; per100: string; portion: string; save: string; cancel: string;
  logTitle: string; logEmpty: string; g: string;
  aiTitle: string; aiHint: string; aiWarn: string; aiEnable: string; aiDisable: string; aiPh: string; aiRun: string; aiLoading: string; aiErr: string; aiNote: string;
  ioTitle: string; ioHint: string; copyPrompt: string; copied: string; export: string; importPh: string; importBtn: string; imported: string; importErr: string; prompt: string;
}> = {
  ru: {
    today: "Сегодня", more: "Ещё", calc: "Посчитать", goal: "Цель, ккал", kcal: "ккал", p: "Белки", f: "Жиры", c: "Углеводы", left: "Осталось", over: "Перебор",
    quick: "Мои продукты и блюда", quickEmpty: "Пока пусто. Добавьте продукт или блюдо один раз, дальше он вносится в день одним нажатием.", add: "Нажмите, чтобы добавить в день", newFood: "Новый продукт или блюдо", name: "Название", per100: "На 100 г", portion: "Обычная порция, г", save: "Сохранить", cancel: "Отмена",
    logTitle: "Съедено", logEmpty: "Ничего не добавлено. Нажмите на продукт выше или опишите еду для ИИ.", g: "г",
    aiTitle: "Добавить с помощью ИИ", aiHint: "Опишите, что съели, и ИИ посчитает КБЖУ.", aiWarn: "В Google Gemini уйдёт только текст, который вы здесь введёте. Записи дневника и личные данные не отправляются. Функция выключена, пока вы её не включите.", aiEnable: "Включить и разрешить отправку", aiDisable: "Выключить", aiPh: "Например: куриная грудка 150 г, гречка 200 г, яблоко", aiRun: "Посчитать и добавить", aiLoading: "ИИ считает…", aiErr: "Не получилось распознать. Попробуйте описать иначе.", aiNote: "Значения приблизительные. Добавленное можно поправить по граммам.",
    ioTitle: "Любая нейросеть (DeepSeek и др.)", ioHint: "Скопируйте подсказку, вставьте её в любую нейросеть вместе со списком еды, а ответ вставьте сюда. Продукты попадут в ваш список.", copyPrompt: "Скопировать подсказку для нейросети", copied: "Скопировано", export: "Скопировать мой список (JSON)", importPh: "Вставьте ответ нейросети в формате JSON", importBtn: "Импортировать", imported: "Добавлено в список: {n}", importErr: "Не нашёл JSON-список. Проверьте ответ нейросети.",
    prompt: "Ты калькулятор питания. Я пришлю список еды. Ответь ТОЛЬКО JSON-массивом без пояснений и без markdown. Для каждого продукта или блюда объект: {\"name\": \"название\", \"kcal\": ккал на 100 г, \"protein\": белки г на 100 г, \"fat\": жиры г на 100 г, \"carbs\": углеводы г на 100 г, \"grams\": обычная порция в граммах}. Мой список еды:\n",
  },
  en: {
    today: "Today", more: "More", calc: "Calculate", goal: "Goal, kcal", kcal: "kcal", p: "Protein", f: "Fat", c: "Carbs", left: "Left", over: "Over",
    quick: "My foods and dishes", quickEmpty: "Nothing yet. Add a food or dish once, then log it in one tap.", add: "Tap to add to the day", newFood: "New food or dish", name: "Name", per100: "Per 100 g", portion: "Usual portion, g", save: "Save", cancel: "Cancel",
    logTitle: "Eaten", logEmpty: "Nothing logged. Tap a food above or describe your meal to the AI.", g: "g",
    aiTitle: "Add with AI", aiHint: "Describe what you ate and the AI works out the macros.", aiWarn: "Only the text you type here is sent to Google Gemini. Your diary entries and personal data are never sent. This stays off until you turn it on.", aiEnable: "Turn on and allow sending", aiDisable: "Turn off", aiPh: "E.g. chicken breast 150 g, buckwheat 200 g, an apple", aiRun: "Calculate and add", aiLoading: "AI is calculating…", aiErr: "Couldn't recognise that. Try describing it differently.", aiNote: "Values are approximate. You can adjust grams afterwards.",
    ioTitle: "Any AI (DeepSeek etc.)", ioHint: "Copy the prompt, paste it into any AI together with your food list, then paste its answer here. The foods go into your list.", copyPrompt: "Copy prompt for an AI", copied: "Copied", export: "Copy my list (JSON)", importPh: "Paste the AI's JSON answer", importBtn: "Import", imported: "Added to your list: {n}", importErr: "Couldn't find a JSON list. Check the AI's answer.",
    prompt: "You are a nutrition calculator. I will send a list of foods. Reply with ONLY a JSON array, no explanations and no markdown. For each food or dish one object: {\"name\": \"name\", \"kcal\": kcal per 100 g, \"protein\": protein g per 100 g, \"fat\": fat g per 100 g, \"carbs\": carbs g per 100 g, \"grams\": usual portion in grams}. My food list:\n",
  },
  be: {
    today: "Сёння", more: "Яшчэ", calc: "Падлічыць", goal: "Мэта, ккал", kcal: "ккал", p: "Бялкі", f: "Тлушчы", c: "Вуглявады", left: "Засталося", over: "Перабор",
    quick: "Мае прадукты і стравы", quickEmpty: "Пакуль пуста. Дадайце прадукт або страву адзін раз, далей яна ўносіцца ў дзень адным націскам.", add: "Націсніце, каб дадаць у дзень", newFood: "Новы прадукт або страва", name: "Назва", per100: "На 100 г", portion: "Звычайная порцыя, г", save: "Захаваць", cancel: "Скасаваць",
    logTitle: "З'едзена", logEmpty: "Нічога не дададзена. Націсніце на прадукт вышэй або апішыце ежу для ШІ.", g: "г",
    aiTitle: "Дадаць з дапамогай ШІ", aiHint: "Апішыце, што з'елі, і ШІ падлічыць КБЖУ.", aiWarn: "У Google Gemini пойдзе толькі тэкст, які вы тут увядзяце. Запісы дзённіка і асабістыя даныя не адпраўляюцца. Функцыя выключана, пакуль вы яе не ўключыце.", aiEnable: "Уключыць і дазволіць адпраўку", aiDisable: "Выключыць", aiPh: "Напрыклад: куриная грудка 150 г, грэчка 200 г, яблык", aiRun: "Падлічыць і дадаць", aiLoading: "ШІ лічыць…", aiErr: "Не атрымалася распазнаць. Паспрабуйце апісаць інакш.", aiNote: "Значэнні прыблізныя. Дададзенае можна паправіць па грамах.",
    ioTitle: "Любая нейрасетка (DeepSeek і інш.)", ioHint: "Скапіруйце падказку, устаўце яе ў любую нейрасетку разам са спісам ежы, а адказ устаўце сюды. Прадукты трапяць у ваш спіс.", copyPrompt: "Скапіраваць падказку для нейрасеткі", copied: "Скапіравана", export: "Скапіраваць мой спіс (JSON)", importPh: "Уставьце адказ нейрасеткі ў фармаце JSON", importBtn: "Імпартаваць", imported: "Дададзена ў спіс: {n}", importErr: "Не знайшоў JSON-спіс. Праверце адказ нейрасеткі.",
    prompt: "Ты калькулятар харчавання. Я дашлю спіс ежы. Адкажы ТОЛЬКІ JSON-масівам без тлумачэнняў і без markdown. Для кожнага прадукту або стравы аб'ект: {\"name\": \"назва\", \"kcal\": ккал на 100 г, \"protein\": бялкі г на 100 г, \"fat\": тлушчы г на 100 г, \"carbs\": вуглявады г на 100 г, \"grams\": звычайная порцыя ў грамах}. Мой спіс ежы:\n",
  },
  uk: {
    today: "Сьогодні", more: "Ще", calc: "Порахувати", goal: "Мета, ккал", kcal: "ккал", p: "Білки", f: "Жири", c: "Вуглеводи", left: "Залишилось", over: "Перебір",
    quick: "Мої продукти й страви", quickEmpty: "Поки порожньо. Додайте продукт або страву один раз, далі вона вноситься в день одним дотиком.", add: "Торкніться, щоб додати в день", newFood: "Новий продукт або страва", name: "Назва", per100: "На 100 г", portion: "Звична порція, г", save: "Зберегти", cancel: "Скасувати",
    logTitle: "З'їдено", logEmpty: "Нічого не додано. Торкніться продукту вище або опишіть їжу для ШІ.", g: "г",
    aiTitle: "Додати за допомогою ШІ", aiHint: "Опишіть, що з'їли, і ШІ порахує КБЖВ.", aiWarn: "До Google Gemini піде лише текст, який ви тут введете. Записи щоденника й особисті дані не надсилаються. Функція вимкнена, доки ви її не ввімкнете.", aiEnable: "Увімкнути й дозволити надсилання", aiDisable: "Вимкнути", aiPh: "Наприклад: куряча грудка 150 г, гречка 200 г, яблуко", aiRun: "Порахувати й додати", aiLoading: "ШІ рахує…", aiErr: "Не вдалося розпізнати. Спробуйте описати інакше.", aiNote: "Значення приблизні. Додане можна поправити за грамами.",
    ioTitle: "Будь-яка нейромережа (DeepSeek тощо)", ioHint: "Скопіюйте підказку, вставте її в будь-яку нейромережу разом зі списком їжі, а відповідь вставте сюди. Продукти потраплять у ваш список.", copyPrompt: "Скопіювати підказку для нейромережі", copied: "Скопійовано", export: "Скопіювати мій список (JSON)", importPh: "Вставте відповідь нейромережі у форматі JSON", importBtn: "Імпортувати", imported: "Додано до списку: {n}", importErr: "Не знайшов JSON-список. Перевірте відповідь нейромережі.",
    prompt: "Ти калькулятор харчування. Я надішлю список їжі. Відповідай ЛИШЕ JSON-масивом без пояснень і без markdown. Для кожного продукту чи страви об'єкт: {\"name\": \"назва\", \"kcal\": ккал на 100 г, \"protein\": білки г на 100 г, \"fat\": жири г на 100 г, \"carbs\": вуглеводи г на 100 г, \"grams\": звична порція в грамах}. Мій список їжі:\n",
  },
  de: {
    today: "Heute", more: "Mehr", calc: "Berechnen", goal: "Ziel, kcal", kcal: "kcal", p: "Eiweiß", f: "Fett", c: "Kohlenhydrate", left: "Übrig", over: "Drüber",
    quick: "Meine Lebensmittel und Gerichte", quickEmpty: "Noch leer. Legen Sie ein Lebensmittel oder Gericht einmal an, danach tragen Sie es mit einem Tipp ein.", add: "Tippen, um zum Tag hinzuzufügen", newFood: "Neues Lebensmittel oder Gericht", name: "Name", per100: "Pro 100 g", portion: "Übliche Portion, g", save: "Speichern", cancel: "Abbrechen",
    logTitle: "Gegessen", logEmpty: "Nichts eingetragen. Tippen Sie oben auf ein Lebensmittel oder beschreiben Sie Ihr Essen der KI.", g: "g",
    aiTitle: "Mit KI hinzufügen", aiHint: "Beschreiben Sie, was Sie gegessen haben, und die KI berechnet die Makros.", aiWarn: "Nur der hier eingegebene Text wird an Google Gemini gesendet. Tagebucheinträge und persönliche Daten werden nie gesendet. Die Funktion bleibt aus, bis Sie sie einschalten.", aiEnable: "Einschalten und Senden erlauben", aiDisable: "Ausschalten", aiPh: "Z. B.: Hähnchenbrust 150 g, Buchweizen 200 g, ein Apfel", aiRun: "Berechnen und hinzufügen", aiLoading: "KI rechnet…", aiErr: "Das konnte nicht erkannt werden. Beschreiben Sie es anders.", aiNote: "Die Werte sind ungefähr. Die Gramm lassen sich danach anpassen.",
    ioTitle: "Beliebige KI (DeepSeek usw.)", ioHint: "Kopieren Sie den Prompt, fügen Sie ihn mit Ihrer Essensliste in eine KI ein und fügen Sie die Antwort hier ein. Die Lebensmittel landen in Ihrer Liste.", copyPrompt: "Prompt für eine KI kopieren", copied: "Kopiert", export: "Meine Liste kopieren (JSON)", importPh: "JSON-Antwort der KI einfügen", importBtn: "Importieren", imported: "Zur Liste hinzugefügt: {n}", importErr: "Keine JSON-Liste gefunden. Prüfen Sie die Antwort der KI.",
    prompt: "Du bist ein Ernährungsrechner. Ich sende eine Liste von Lebensmitteln. Antworte NUR mit einem JSON-Array, ohne Erklärungen und ohne Markdown. Pro Lebensmittel oder Gericht ein Objekt: {\"name\": \"Name\", \"kcal\": kcal pro 100 g, \"protein\": Eiweiß g pro 100 g, \"fat\": Fett g pro 100 g, \"carbs\": Kohlenhydrate g pro 100 g, \"grams\": übliche Portion in Gramm}. Meine Liste:\n",
  },
  fr: {
    today: "Aujourd’hui", more: "Plus", calc: "Calculer", goal: "Objectif, kcal", kcal: "kcal", p: "Protéines", f: "Lipides", c: "Glucides", left: "Reste", over: "En trop",
    quick: "Mes aliments et plats", quickEmpty: "Rien pour l’instant. Ajoute un aliment ou un plat une fois, puis saisis-le en un geste.", add: "Touche pour ajouter à la journée", newFood: "Nouvel aliment ou plat", name: "Nom", per100: "Pour 100 g", portion: "Portion habituelle, g", save: "Enregistrer", cancel: "Annuler",
    logTitle: "Mangé", logEmpty: "Rien d’ajouté. Touche un aliment ci-dessus ou décris ton repas à l’IA.", g: "g",
    aiTitle: "Ajouter avec l’IA", aiHint: "Décris ce que tu as mangé et l’IA calcule les macros.", aiWarn: "Seul le texte saisi ici est envoyé à Google Gemini. Tes notes de journal et tes données personnelles ne sont jamais envoyées. La fonction reste désactivée tant que tu ne l’actives pas.", aiEnable: "Activer et autoriser l’envoi", aiDisable: "Désactiver", aiPh: "Ex. : poulet 150 g, sarrasin 200 g, une pomme", aiRun: "Calculer et ajouter", aiLoading: "L’IA calcule…", aiErr: "Impossible de reconnaître cela. Essaie de le décrire autrement.", aiNote: "Valeurs approximatives. Tu peux ajuster les grammes ensuite.",
    ioTitle: "N’importe quelle IA (DeepSeek, etc.)", ioHint: "Copie la consigne, colle-la dans une IA avec ta liste d’aliments, puis colle sa réponse ici. Les aliments rejoignent ta liste.", copyPrompt: "Copier la consigne pour une IA", copied: "Copié", export: "Copier ma liste (JSON)", importPh: "Colle la réponse JSON de l’IA", importBtn: "Importer", imported: "Ajoutés à ta liste : {n}", importErr: "Aucune liste JSON trouvée. Vérifie la réponse de l’IA.",
    prompt: "Tu es un calculateur de nutrition. Je t’envoie une liste d’aliments. Réponds UNIQUEMENT par un tableau JSON, sans explication ni markdown. Pour chaque aliment ou plat un objet : {\"name\": \"nom\", \"kcal\": kcal pour 100 g, \"protein\": protéines g pour 100 g, \"fat\": lipides g pour 100 g, \"carbs\": glucides g pour 100 g, \"grams\": portion habituelle en grammes}. Ma liste :\n",
  },
  es: {
    today: "Hoy", more: "Más", calc: "Calcular", goal: "Meta, kcal", kcal: "kcal", p: "Proteínas", f: "Grasas", c: "Carbohidratos", left: "Quedan", over: "Exceso",
    quick: "Mis alimentos y platos", quickEmpty: "Aún no hay nada. Añade un alimento o plato una vez y luego regístralo con un toque.", add: "Toca para añadir al día", newFood: "Nuevo alimento o plato", name: "Nombre", per100: "Por 100 g", portion: "Porción habitual, g", save: "Guardar", cancel: "Cancelar",
    logTitle: "Comido", logEmpty: "Nada registrado. Toca un alimento de arriba o describe tu comida a la IA.", g: "g",
    aiTitle: "Añadir con IA", aiHint: "Describe lo que comiste y la IA calcula los macros.", aiWarn: "A Google Gemini solo se envía el texto que escribas aquí. Nunca se envían tus entradas del diario ni datos personales. Se mantiene desactivado hasta que lo actives.", aiEnable: "Activar y permitir el envío", aiDisable: "Desactivar", aiPh: "Ej.: pechuga de pollo 150 g, trigo sarraceno 200 g, una manzana", aiRun: "Calcular y añadir", aiLoading: "La IA está calculando…", aiErr: "No se pudo reconocer. Prueba a describirlo de otra forma.", aiNote: "Los valores son aproximados. Después puedes ajustar los gramos.",
    ioTitle: "Cualquier IA (DeepSeek, etc.)", ioHint: "Copia el prompt, pégalo en cualquier IA junto con tu lista de comida y pega aquí su respuesta. Los alimentos pasan a tu lista.", copyPrompt: "Copiar prompt para una IA", copied: "Copiado", export: "Copiar mi lista (JSON)", importPh: "Pega la respuesta JSON de la IA", importBtn: "Importar", imported: "Añadidos a tu lista: {n}", importErr: "No encontré una lista JSON. Revisa la respuesta de la IA.",
    prompt: "Eres una calculadora de nutrición. Te enviaré una lista de alimentos. Responde SOLO con un arreglo JSON, sin explicaciones ni markdown. Para cada alimento o plato un objeto: {\"name\": \"nombre\", \"kcal\": kcal por 100 g, \"protein\": proteínas g por 100 g, \"fat\": grasas g por 100 g, \"carbs\": carbohidratos g por 100 g, \"grams\": porción habitual en gramos}. Mi lista:\n",
  },
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const round1 = (n: number) => Math.round(n * 10) / 10;
const toNum = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const calc = (e: Entry) => {
  const k = e.grams / 100;
  return { kcal: Math.round(e.per100.kcal * k), p: round1(e.per100.p * k), f: round1(e.per100.f * k), c: round1(e.per100.c * k) };
};

/** Достаёт JSON-массив из ответа нейросети (допускает ```-обёртку и пояснения вокруг). */
function parseFoodJson(text: string): Food[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    const out: Food[] = [];
    for (const x of arr.slice(0, 100)) {
      const name = String(x?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      const kcal = toNum(x?.kcal), p = toNum(x?.protein ?? x?.p), f = toNum(x?.fat ?? x?.f), c = toNum(x?.carbs ?? x?.c);
      const grams = toNum(x?.grams ?? 100);
      if (!name || [kcal, p, f, c].some((v) => Number.isNaN(v) || v < 0)) continue;
      out.push({ id: uid(), name, kcal: Math.min(kcal, 1000), p: Math.min(p, 100), f: Math.min(f, 100), c: Math.min(c, 100), grams: grams > 0 ? Math.min(grams, 5000) : 100 });
    }
    return out;
  } catch {
    return [];
  }
}

const inputCls = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";
const btnCls = "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[12px] font-semibold text-[var(--ink-soft)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-deep)] active:scale-95 disabled:opacity-60";
const primaryCls = "flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all duration-150 active:scale-95 disabled:opacity-50";

export default function NutritionView({ lang, barHost }: { lang: Lang; barHost?: HTMLElement | null }) {
  const l = L[lang] ?? L.en;
  const [foods, setFoods] = useSyncedStored<Food[]>("foods", [], mergeById<Food>((f) => f.name.trim().toLowerCase()));
  const [log, setLog] = useSyncedStored<Record<string, Entry[]>>("foodLog", {}, mergeLog<Entry>());
  const [goal, setGoal] = useSyncedStored<number>("foodGoal", 2000, preferRemote);
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState<"coach" | "day" | "calendar">("coach");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", kcal: "", p: "", f: "", c: "", grams: "100" });
  const [msg, setMsg] = useState<string | null>(null);
  const [importText, setImportText] = useState("");

  const entries = log[date] ?? [];
  const total = entries.reduce((a, e) => { const x = calc(e); return { kcal: a.kcal + x.kcal, p: a.p + x.p, f: a.f + x.f, c: a.c + x.c }; }, { kcal: 0, p: 0, f: 0, c: 0 });
  const safeGoal = goal > 0 ? goal : 2000;
  const pct = Math.min(100, Math.round((total.kcal / safeGoal) * 100));
  const diff = safeGoal - total.kcal;

  const setDay = (next: Entry[]) => setLog((prev) => { const n = { ...prev }; if (next.length) n[date] = next; else delete n[date]; return n; });
  const addEntry = (name: string, grams: number, per100: Per100) => ({ id: uid(), name, grams, per100 });
  const addFood = (f: Food) => setDay([...entries, addEntry(f.name, f.grams, { kcal: f.kcal, p: f.p, f: f.f, c: f.c })]);
  const setGrams = (id: string, v: string) => {
    const g = toNum(v);
    setDay(entries.map((e) => (e.id === id ? { ...e, grams: Number.isNaN(g) ? 0 : Math.min(g, 5000) } : e)));
  };
  const mergeFoods = (incoming: Food[]) => {
    setFoods((prev) => {
      const names = new Set(prev.map((x) => x.name.toLowerCase()));
      const fresh = incoming.filter((x) => !names.has(x.name.toLowerCase()));
      return [...prev, ...fresh];
    });
  };

  const saveForm = () => {
    const name = form.name.trim();
    const [kcal, p, f, c, grams] = [form.kcal, form.p, form.f, form.c, form.grams].map(toNum);
    if (!name || [kcal, p, f, c].some((v) => Number.isNaN(v) || v < 0)) return;
    mergeFoods([{ id: uid(), name: name.slice(0, 60), kcal, p, f, c, grams: grams > 0 ? grams : 100 }]);
    setForm({ name: "", kcal: "", p: "", f: "", c: "", grams: "100" });
    setAdding(false);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(l.copied);
    } catch {
      setMsg(text);
    }
  };

  const doImport = () => {
    const items = parseFoodJson(importText);
    if (!items.length) { setMsg(l.importErr); return; }
    const names = new Set(foods.map((x) => x.name.toLowerCase()));
    mergeFoods(items);
    setMsg(l.imported.replace("{n}", String(items.filter((x) => !names.has(x.name.toLowerCase())).length)));
    setImportText("");
  };

  const coachContext = `Calorie goal ${safeGoal} kcal. Eaten today: ${total.kcal} kcal, protein ${round1(total.p)} g, fat ${round1(total.f)} g, carbs ${round1(total.c)} g.` +
    (entries.length ? ` Foods: ${entries.map((e) => `${e.name} ${e.grams} g`).join(", ")}.` : "");
  const applyCoach = (items: CoachItem[]) => {
    const newEntries: Entry[] = [];
    const newFoods: Food[] = [];
    for (const it of items) {
      if (!it.grams) continue;
      const k = 100 / it.grams;
      const per100 = { kcal: round1((it.kcal ?? 0) * k), p: round1((it.protein ?? 0) * k), f: round1((it.fat ?? 0) * k), c: round1((it.carbs ?? 0) * k) };
      newEntries.push(addEntry(it.name, it.grams, per100));
      newFoods.push({ id: uid(), name: it.name, grams: it.grams, ...per100 });
    }
    setDay([...entries, ...newEntries]);
    mergeFoods(newFoods);
  };
  const kcalByDay = Object.fromEntries(Object.entries(log).map(([iso, list]) => [iso, list.reduce((a, e) => a + calc(e).kcal, 0)]));
  const dateLabel = date === todayISO() ? l.today : new Intl.DateTimeFormat(localeOf(lang), { weekday: "short", day: "numeric", month: "short" }).format(fromISO(date));
  const field = (key: keyof typeof form, label: string, numeric = true) => (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-[var(--ink-faint)]">
      {label}
      <input className={inputCls} inputMode={numeric ? "decimal" : "text"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      {/* переключатель живёт в закреплённом блоке «Хобби» (портал), чтобы обе плашки были в одной подложке */}
      {barHost && createPortal(
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1" role="tablist" style={{ boxShadow: "var(--shadow-sm)" }}>
          {(["coach", "day", "calendar"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`h-9 rounded-lg text-[13px] font-semibold transition-all ${view === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--hover)]"}`}>{v === "calendar" ? makeUI(lang)("viewCalendar") : SEG[lang][v]}</button>
          ))}
        </div>
        , barHost)}

      {view === "calendar" ? (
        <DayCalendar valueByDay={kcalByDay} goal={safeGoal} summary={(days) => (days.length ? `Ø ${Math.round(days.reduce((a, d) => a + kcalByDay[d], 0) / days.length)} / ${safeGoal} ${l.kcal}` : null)} selected={date} onPick={(iso) => { setDate(iso); setView("day"); }} lang={lang} />
      ) : view === "coach" ? (
        <>
          <div className="flex items-baseline justify-between text-[13px] text-[var(--ink-soft)]">
            <span>{dateLabel}: <b className="text-[var(--ink)]">{total.kcal}</b> / {safeGoal} {l.kcal}</span>
            <span>{l.p[0]} {round1(total.p)} · {l.f[0]} {round1(total.f)} · {l.c[0]} {round1(total.c)}</span>
          </div>
          <CoachChat mode="food" lang={lang} context={coachContext} onApply={applyCoach} />
        </>
      ) : (
      <>
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(shiftISO(date, -1))} className={btnCls} aria-label="‹"><ArrowLeftIcon className="h-4 w-4" /></button>
        <span className="text-[15px] font-bold">{dateLabel}</span>
        <button onClick={() => setDate(shiftISO(date, 1))} className={btnCls} aria-label="›"><ArrowRightIcon className="h-4 w-4" /></button>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[32px] font-extrabold leading-none">{total.kcal}<span className="ml-1.5 text-[13px] font-semibold text-[var(--ink-faint)]">/ {safeGoal} {l.kcal}</span></div>
          <div className={`text-[12px] font-semibold ${diff < 0 ? "text-red-400" : "text-[var(--ink-soft)]"}`}>{diff < 0 ? `${l.over}: ${-diff}` : `${l.left}: ${diff}`}</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="flex justify-between text-[13px]">
          {([[l.p, total.p], [l.f, total.f], [l.c, total.c]] as const).map(([label, v]) => (
            <span key={label}><b>{round1(v)}</b> <span className="text-[var(--ink-faint)]">{label}</span></span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {foods.map((f) => (
            <button key={f.id} onClick={() => addFood(f)} title={`${f.grams} ${l.g} · ${Math.round((f.kcal * f.grams) / 100)} ${l.kcal}`} className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[12.5px] font-semibold hover:border-[var(--accent)] active:scale-95">+ {f.name}</button>
          ))}
          <button onClick={() => setAdding(!adding)} className="rounded-full border border-dashed border-[var(--line)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ink-faint)] hover:text-[var(--ink)]">{adding ? "−" : "+"} {l.newFood}</button>
        </div>
        {foods.length === 0 && !adding && <p className="text-[12px] text-[var(--ink-faint)]">{l.quickEmpty}</p>}
        {adding && (
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
            {field("name", l.name, false)}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {field("kcal", l.kcal)}{field("p", l.p)}{field("f", l.f)}{field("c", l.c)}{field("grams", l.portion)}
            </div>
            <div className="text-[11px] text-[var(--ink-faint)]">{l.per100}</div>
            <button onClick={saveForm} className={`${primaryCls} self-start`}>{l.save}</button>
          </div>
        )}
      </section>

      {entries.length > 0 && (
        <ul className="flex flex-col">
          {entries.map((e) => {
            const x = calc(e);
            return (
              <li key={e.id} className="flex items-center gap-3 border-b border-[var(--line)] py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{e.name}</div>
                  <div className="text-[11.5px] text-[var(--ink-faint)]">{x.kcal} {l.kcal} · {l.p[0]} {x.p} · {l.f[0]} {x.f} · {l.c[0]} {x.c}</div>
                </div>
                <input className={`${inputCls} !w-20 text-right`} inputMode="decimal" value={e.grams || ""} onChange={(ev) => setGrams(e.id, ev.target.value)} aria-label={l.g} />
                <span className="text-[12px] text-[var(--ink-faint)]">{l.g}</span>
                <button onClick={() => setDay(entries.filter((y) => y.id !== e.id))} aria-label="×" className="px-1 text-[var(--ink-faint)] hover:text-red-400">×</button>
              </li>
            );
          })}
        </ul>
      )}

      <details className="group rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <summary className="cursor-pointer select-none text-[13px] font-semibold text-[var(--ink-soft)]">{l.more}</summary>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex w-32 flex-col gap-1 text-[11px] font-semibold text-[var(--ink-faint)]">
            {l.goal}
            <input className={inputCls} inputMode="numeric" value={goal || ""} onChange={(e) => setGoal(Math.min(10000, Math.max(0, Math.round(toNum(e.target.value) || 0))))} />
          </label>
          {foods.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold">{l.quick}</span>
              <ul className="flex flex-col">
                {foods.map((f) => (
                  <li key={f.id} className="flex items-center justify-between border-b border-[var(--line)] py-2 text-[13px]">
                    <span className="truncate">{f.name} <span className="text-[var(--ink-faint)]">· {f.grams} {l.g} · {Math.round((f.kcal * f.grams) / 100)} {l.kcal}</span></span>
                    <button onClick={() => setFoods(foods.filter((x) => x.id !== f.id))} aria-label="×" className="px-1 text-[var(--ink-faint)] hover:text-red-400">×</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold">{l.ioTitle}</span>
            <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">{l.ioHint}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copy(l.prompt)} className={btnCls}>{l.copyPrompt}</button>
              <button onClick={() => copy(JSON.stringify(foods.map((f) => ({ name: f.name, kcal: f.kcal, protein: f.p, fat: f.f, carbs: f.c, grams: f.grams })), null, 2))} className={btnCls} disabled={!foods.length}>{l.export}</button>
            </div>
            <textarea className={`${inputCls} !h-20 py-2 font-mono`} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={l.importPh} />
            <button onClick={doImport} disabled={!importText.trim()} className={`${btnCls} self-start`}>{l.importBtn}</button>
          </div>
          {msg && <p className="text-[12.5px] font-semibold text-[var(--ink-soft)]" role="status">{msg}</p>}
        </div>
      </details>
      </>
      )}
    </div>
  );
}
