import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { useStored } from "../store";
import { MAX_PHOTOS, MAX_VIDEO_SEC, prepareAiMedia, type AiAttachment, type AiMediaError } from "../lib/aiMedia";
import SparkMemoryPanel from "./SparkMemoryPanel";
import { EMPTY_MEMORY, addFact, memoryForRequest, sanitizeMemory, type SparkMemory } from "../lib/sparkMemory";
import { parseStreamLine, type CoachFinal } from "../lib/aiStream";

export type CoachMode = "food" | "workout" | "hobby";
export interface CoachItem { name: string; grams?: number; kcal?: number; protein?: number; fat?: number; carbs?: number; sets?: number; reps?: number; kg?: number }
interface Msg { id: string; role: "user" | "assistant"; text: string; items?: CoachItem[]; added?: boolean; /** превью вложений пользователя (маленькие картинки; сами файлы не хранятся) */ thumbs?: string[]; video?: boolean; /** ссылки, на которые опирался ответ с поиском Google */ sources?: { title: string; url: string }[] }

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
  hobby: {
    ru: { name: "Искра", hello: "Привет! Я Искра, твой ИИ-помощник. Спрашивай о чём угодно: объясню, помогу с текстом, идеями, планом или учёбой.", ph: "Напиши Искре…", send: "Отправить", thinking: "Искра думает…", err: "Не получилось получить ответ. Попробуй ещё раз.", details: "Причина", add: "Добавить в тренировку", added: "Добавлено в день", clear: "Очистить чат", off: "Выключить помощника", consent: "Чтобы Искра отвечала, в Google Gemini уйдёт ваша переписка с ней. Записи дневника, имя и email не отправляются. Пока вы не включите, ничего не отправляется.", enable: "Включить помощника", chips: ["Объясни простыми словами, как работают налоги", "Помоги написать вежливое письмо", "Придумай идею для выходных"], kcal: "ккал", g: "Тренер думает…", setsX: "×", kg: "кг" },
    en: { name: "Spark", hello: "Hi! I'm Spark, your AI assistant. Ask me anything: I can explain, help with writing, ideas, plans or studying.", ph: "Message Spark…", send: "Send", thinking: "Spark is thinking…", err: "Couldn't get a reply. Try again.", details: "Reason", add: "Add to workout", added: "Added to the day", clear: "Clear chat", off: "Turn off the assistant", consent: "For Spark to reply, your conversation with it is sent to Google Gemini. Diary entries, name and email are never sent. Nothing is sent until you turn it on.", enable: "Turn on the assistant", chips: ["Explain how taxes work in simple words", "Help me write a polite email", "Suggest an idea for the weekend"], kcal: "kcal", g: "Trainer is thinking…", setsX: "×", kg: "kg" },
    be: { name: "Іскра", hello: "Прывітанне! Я Іскра, твой ШІ-памочнік. Пытай пра што заўгодна: растлумачу, дапамагу з тэкстам, ідэямі, планам або вучобай.", ph: "Напішы Іскры…", send: "Адправіць", thinking: "Іскра думае…", err: "Не атрымалася атрымаць адказ. Паспрабуй яшчэ раз.", details: "Прычына", add: "Дадаць у трэніроўку", added: "Дададзена ў дзень", clear: "Ачысціць чат", off: "Выключыць памочніка", consent: "Каб Іскра адказвала, у Google Gemini пойдзе ваша перапіска з ёй. Запісы дзённіка, імя і email не адпраўляюцца. Пакуль вы не ўключыце, нічога не адпраўляецца.", enable: "Уключыць памочніка", chips: ["Растлумач простымі словамі, як працуюць падаткі", "Дапамажы напісаць ветлы ліст", "Прыдумай ідэю на выходныя"], kcal: "ккал", g: "Трэнер думае…", setsX: "×", kg: "кг" },
    uk: { name: "Іскра", hello: "Привіт! Я Іскра, твій ШІ-помічник. Питай про що завгодно: поясню, допоможу з текстом, ідеями, планом або навчанням.", ph: "Напиши Іскрі…", send: "Надіслати", thinking: "Іскра думає…", err: "Не вдалося отримати відповідь. Спробуй ще раз.", details: "Причина", add: "Додати в тренування", added: "Додано в день", clear: "Очистити чат", off: "Вимкнути помічника", consent: "Щоб Іскра відповідала, до Google Gemini піде ваше листування з нею. Записи щоденника, ім'я та email не надсилаються. Доки ви не ввімкнете, нічого не надсилається.", enable: "Увімкнути помічника", chips: ["Поясни простими словами, як працюють податки", "Допоможи написати ввічливого листа", "Придумай ідею на вихідні"], kcal: "ккал", g: "Тренер думає…", setsX: "×", kg: "кг" },
    de: { name: "Funke", hello: "Hallo! Ich bin Funke, dein KI-Assistent. Frag mich alles: Ich erkläre, helfe bei Texten, Ideen, Plänen oder beim Lernen.", ph: "Schreibe Funke…", send: "Senden", thinking: "Funke denkt nach…", err: "Keine Antwort erhalten. Versuch es noch einmal.", details: "Grund", add: "Zum Training hinzufügen", added: "Zum Tag hinzugefügt", clear: "Chat leeren", off: "Assistenten ausschalten", consent: "Damit Funke antwortet, wird euer Gespräch an Google Gemini gesendet. Tagebucheinträge, Name und E-Mail werden nie gesendet. Solange du es nicht einschaltest, wird nichts gesendet.", enable: "Assistenten einschalten", chips: ["Erkläre einfach, wie Steuern funktionieren", "Hilf mir bei einer höflichen E-Mail", "Gib mir eine Idee fürs Wochenende"], kcal: "kcal", g: "Trainer denkt nach…", setsX: "×", kg: "kg" },
    fr: { name: "Étincelle", hello: "Salut ! Je suis Étincelle, ton assistant IA. Demande-moi ce que tu veux : j’explique, j’aide pour un texte, des idées, un plan ou des études.", ph: "Écris à Étincelle…", send: "Envoyer", thinking: "Étincelle réfléchit…", err: "Impossible d’obtenir une réponse. Réessaie.", details: "Raison", add: "Ajouter à la séance", added: "Ajouté à la journée", clear: "Effacer le chat", off: "Désactiver l’assistant", consent: "Pour qu’Étincelle réponde, votre conversation est envoyée à Google Gemini. Les notes du journal, le nom et l’e-mail ne sont jamais envoyés. Rien n’est envoyé tant que vous n’activez pas.", enable: "Activer l’assistant", chips: ["Explique simplement comment fonctionnent les impôts", "Aide-moi à écrire un e-mail poli", "Propose une idée pour le week-end"], kcal: "kcal", g: "Le coach réfléchit…", setsX: "×", kg: "kg" },
    es: { name: "Chispa", hello: "¡Hola! Soy Chispa, tu asistente de IA. Pregúntame lo que quieras: explico, ayudo con textos, ideas, planes o estudios.", ph: "Escribe a Chispa…", send: "Enviar", thinking: "Chispa está pensando…", err: "No se pudo obtener respuesta. Inténtalo de nuevo.", details: "Motivo", add: "Añadir al entrenamiento", added: "Añadido al día", clear: "Borrar chat", off: "Desactivar el asistente", consent: "Para que Chispa responda, tu conversación se envía a Google Gemini. Las notas del diario, el nombre y el correo nunca se envían. No se envía nada hasta que lo actives.", enable: "Activar el asistente", chips: ["Explícame con palabras sencillas cómo funcionan los impuestos", "Ayúdame a escribir un correo educado", "Sugiere una idea para el fin de semana"], kcal: "kcal", g: "El entrenador está pensando…", setsX: "×", kg: "kg" },
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

interface AS { web: string; webHint: string; sources: string; attach: string; preparing: string; note: string; remove: string; video: string; errors: Record<AiMediaError | "limit", string> }
const A: Record<Lang, AS> = {
  ru: { web: "Искать в интернете", webHint: "Помощник сможет искать в Google: новинки, состав и КБЖУ конкретных продуктов. Ответ идёт чуть дольше, а число поисков в сутки ограничено. Запрос уйдёт в Google Search.", sources: "Источники", attach: "Прикрепить фото или видео", preparing: "Готовлю вложение…", note: "Фото и кадры из видео (без звука) тоже уйдут в Google Gemini.", remove: "Убрать вложение", video: "Видео", errors: { "not-media": "Можно прикрепить только фото или видео.", "too-big": "Файл слишком большой.", "too-long": `Видео длиннее ${MAX_VIDEO_SEC} секунд. Обрежьте его.`, unreadable: "Не удалось открыть файл.", limit: `Можно до ${MAX_PHOTOS} фото или одно видео.` } },
  en: { web: "Search the web", webHint: "The assistant can search Google: new products, nutrition facts of specific foods. Answers take a bit longer and the number of searches per day is limited. Your question is sent to Google Search.", sources: "Sources", attach: "Attach a photo or video", preparing: "Preparing the attachment…", note: "Photos and frames from videos (no sound) are sent to Google Gemini too.", remove: "Remove attachment", video: "Video", errors: { "not-media": "Only photos and videos can be attached.", "too-big": "The file is too big.", "too-long": `The video is longer than ${MAX_VIDEO_SEC} seconds. Trim it.`, unreadable: "Couldn't open the file.", limit: `Up to ${MAX_PHOTOS} photos or one video.` } },
  be: { web: "Шукаць у інтэрнэце", webHint: "Памочнік зможа шукаць у Google: навінкі, склад і КБЖВ канкрэтных прадуктаў. Адказ ідзе трохі даўжэй, а колькасць пошукаў за суткі абмежавана. Запыт пойдзе ў Google Search.", sources: "Крыніцы", attach: "Прымацаваць фота або відэа", preparing: "Рыхтую ўкладанне…", note: "Фота і кадры з відэа (без гуку) таксама пойдуць у Google Gemini.", remove: "Прыбраць укладанне", video: "Відэа", errors: { "not-media": "Можна прымацаваць толькі фота або відэа.", "too-big": "Файл занадта вялікі.", "too-long": `Відэа даўжэйшае за ${MAX_VIDEO_SEC} секунд. Абрэжце яго.`, unreadable: "Не атрымалася адкрыць файл.", limit: `Можна да ${MAX_PHOTOS} фота або адно відэа.` } },
  uk: { web: "Шукати в інтернеті", webHint: "Помічник зможе шукати в Google: новинки, склад і КБЖВ конкретних продуктів. Відповідь іде трохи довше, а кількість пошуків на добу обмежена. Запит піде в Google Search.", sources: "Джерела", attach: "Прикріпити фото або відео", preparing: "Готую вкладення…", note: "Фото й кадри з відео (без звуку) також підуть до Google Gemini.", remove: "Прибрати вкладення", video: "Відео", errors: { "not-media": "Можна прикріпити лише фото або відео.", "too-big": "Файл завеликий.", "too-long": `Відео довше за ${MAX_VIDEO_SEC} секунд. Обріжте його.`, unreadable: "Не вдалося відкрити файл.", limit: `Можна до ${MAX_PHOTOS} фото або одне відео.` } },
  de: { web: "Im Web suchen", webHint: "Der Assistent kann bei Google suchen: neue Produkte, Nährwerte bestimmter Lebensmittel. Antworten dauern etwas länger und die Zahl der Suchen pro Tag ist begrenzt. Deine Frage geht an Google Search.", sources: "Quellen", attach: "Foto oder Video anhängen", preparing: "Anhang wird vorbereitet…", note: "Fotos und Einzelbilder aus Videos (ohne Ton) werden ebenfalls an Google Gemini gesendet.", remove: "Anhang entfernen", video: "Video", errors: { "not-media": "Es können nur Fotos und Videos angehängt werden.", "too-big": "Die Datei ist zu groß.", "too-long": `Das Video ist länger als ${MAX_VIDEO_SEC} Sekunden. Kürze es.`, unreadable: "Die Datei konnte nicht geöffnet werden.", limit: `Bis zu ${MAX_PHOTOS} Fotos oder ein Video.` } },
  fr: { web: "Chercher sur le web", webHint: "L’assistant peut chercher sur Google : nouveaux produits, valeurs nutritionnelles d’aliments précis. Les réponses sont un peu plus lentes et le nombre de recherches par jour est limité. Ta question est envoyée à Google Search.", sources: "Sources", attach: "Joindre une photo ou une vidéo", preparing: "Préparation de la pièce jointe…", note: "Les photos et des images extraites des vidéos (sans le son) sont aussi envoyées à Google Gemini.", remove: "Retirer la pièce jointe", video: "Vidéo", errors: { "not-media": "Seules les photos et les vidéos peuvent être jointes.", "too-big": "Le fichier est trop volumineux.", "too-long": `La vidéo dépasse ${MAX_VIDEO_SEC} secondes. Raccourcis-la.`, unreadable: "Impossible d’ouvrir le fichier.", limit: `Jusqu’à ${MAX_PHOTOS} photos ou une vidéo.` } },
  es: { web: "Buscar en la web", webHint: "El asistente puede buscar en Google: productos nuevos, valores nutricionales de alimentos concretos. Las respuestas tardan un poco más y el número de búsquedas al día es limitado. Tu pregunta se envía a Google Search.", sources: "Fuentes", attach: "Adjuntar foto o vídeo", preparing: "Preparando el adjunto…", note: "Las fotos y fotogramas de vídeos (sin sonido) también se envían a Google Gemini.", remove: "Quitar adjunto", video: "Vídeo", errors: { "not-media": "Solo se pueden adjuntar fotos y vídeos.", "too-big": "El archivo es demasiado grande.", "too-long": `El vídeo dura más de ${MAX_VIDEO_SEC} segundos. Recórtalo.`, unreadable: "No se pudo abrir el archivo.", limit: `Hasta ${MAX_PHOTOS} fotos o un vídeo.` } },
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
  const [on, setOn] = useStored<boolean>(mode === "food" ? "dn.coachFood" : mode === "hobby" ? "dn.coachHobby" : "dn.coachWorkout", false);
  // поиск Google включается вручную и общий для всех помощников: он медленнее и расходует дневной лимит
  const [web, setWeb] = useStored<boolean>("dn.coachWeb", false);
  const [msgs, setMsgs] = useStored<Msg[]>(`dn.coach.${mode}`, []);
  const [memRaw, setMemRaw] = useStored<SparkMemory>("dn.sparkMemory", EMPTY_MEMORY);
  const memory = sanitizeMemory(memRaw);
  const [memOpen, setMemOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // текст ответа, который ещё печатается (приходит потоком); в историю попадает целиком, когда ответ готов
  const [live, setLive] = useState("");
  const [error, setError] = useState<{ msg: string; detail?: string } | null>(null);
  const a = A[lang] ?? A.en;
  const [files, setFiles] = useState<AiAttachment[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [fileErr, setFileErr] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // листаем только <main>: scrollIntoView сдвигал и внешние контейнеры, и шапка уезжала вверх
  useEffect(() => {
    const box = endRef.current?.closest("main");
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [msgs.length, busy, live]);

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

  const attach = async (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (pick.current) pick.current.value = "";
    if (!picked.length) return;
    setFileErr("");
    setPreparing(true);
    try {
      let cur = files;
      for (const f of picked) {
        const video = f.type.startsWith("video/");
        // одно видео (это набор кадров) или несколько фото, но не вместе
        if (video ? cur.length > 0 : cur.length >= MAX_PHOTOS || cur.some((x) => x.kind === "video")) { setFileErr(a.errors.limit); break; }
        try {
          cur = [...cur, await prepareAiMedia(f)];
          setFiles(cur);
        } catch (e) {
          setFileErr(a.errors[(e as Error).message as AiMediaError] ?? a.errors.unreadable);
        }
      }
    } finally {
      setPreparing(false);
    }
  };

  const send = async (raw: string) => {
    const t = raw.trim();
    const sending = files;
    if ((!t && !sending.length) || busy || preparing || !on) return;
    const next: Msg[] = [...msgs, { id: uid(), role: "user" as const, text: t.slice(0, 600), ...(sending.length ? { thumbs: sending.map((x) => x.thumb), video: sending[0].kind === "video" } : {}) }].slice(-40);
    setMsgs(next);
    setText("");
    setFiles([]);
    setFileErr("");
    setBusy(true);
    setError(null);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 55_000);
      const r = await fetch("/api/coach", {
        signal: ctl.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang, mode, context, web,
          ...(mode === "hobby" && memoryForRequest(memory).length ? { memory: memoryForRequest(memory) } : {}),
          messages: next.slice(-14).map((m) => ({ role: m.role, text: m.text, attached: m.thumbs?.length, items: m.items?.map((it) => ({ name: it.name })) })),
          // сами картинки уходят только с текущей репликой
          ...(sending.length ? { images: sending.flatMap((x) => x.images), video: sending[0].kind === "video" } : {}),
        }),
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
      type Fin = Omit<CoachFinal, "items"> & { items?: CoachItem[] };
      let fin = null as Fin | null;
      const onLine = (raw: string) => {
        const ev = parseStreamLine(raw);
        if (ev?.kind === "delta") { acc += ev.text; setLive(acc); }
        else if (ev?.kind === "final") fin = ev.data as Fin;
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
      setMsgs((prev) => [...prev, { id: uid(), role: "assistant" as const, text: reply, items, sources: Array.isArray(fin?.sources) && fin.sources.length ? fin.sources : undefined }].slice(-40));
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
        <p className="text-[12px] leading-relaxed text-[var(--ink-soft)]">{l.consent} {a.note}</p>
        <button onClick={() => setOn(true)} className="flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-[13px] font-bold text-[var(--accent-ink)] active:scale-95">{l.enable}</button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      {mode === "hobby" && <SparkMemoryPanel lang={lang} memory={memory} onChange={setMemRaw} open={memOpen} onToggle={() => setMemOpen((v) => !v)} />}
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)]" aria-hidden="true">{l.name[0]}</div>
          <div className={`${bubble} rounded-bl-md border border-[var(--line)] bg-[var(--panel)]`}>{l.hello}</div>
        </div>
        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex items-end gap-2"}>
            {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)]" aria-hidden="true">{l.name[0]}</div>}
            <div className={`${bubble} ${m.role === "user" ? "rounded-br-md bg-[var(--accent)] text-[var(--accent-ink)]" : "flex flex-col gap-3 rounded-bl-md border border-[var(--line)] bg-[var(--panel)]"}`}>
              {m.thumbs && (
                <div className="flex flex-wrap gap-1.5">
                  {m.thumbs.map((th, i) => <img key={i} src={th} alt="" className="h-16 w-16 rounded-lg object-cover" />)}
                  {m.video && <span className="self-end rounded-md bg-black/30 px-1.5 py-0.5 text-[11px] font-bold">▶ {a.video}</span>}
                </div>
              )}
              {m.text && <span>{m.text}</span>}
              {mode === "hobby" && memory.on && m.role === "user" && m.text && !memory.facts.some((f) => f.text === m.text.replace(/\s+/g, " ").trim().slice(0, 160)) && memory.facts.length < 20 && (
                <button onClick={() => setMemRaw(addFact(memory, m.text, uid()))} className="self-end text-[11.5px] font-semibold underline opacity-80 hover:opacity-100">{(REMEMBER[lang] ?? REMEMBER.en)}</button>
              )}
              {m.sources && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--ink-faint)]">
                  <span>🔎 {a.sources}:</span>
                  {m.sources.map((src, i) => <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--line)] px-2 py-0.5 font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)]">{src.title}</a>)}
                </div>
              )}
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
        {fileErr && <div className="text-[12.5px] font-semibold text-red-400" role="alert">{fileErr}</div>}
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

      <div className="sticky bottom-2 z-10 flex flex-col gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-col gap-1 px-0.5 pt-0.5">
        <button
          type="button"
          role="switch"
          aria-checked={web}
          onClick={() => setWeb(!web)}
          disabled={busy}
          title={a.webHint}
          className={`flex h-9 w-fit max-w-full items-center gap-2 rounded-full border pl-2.5 pr-1.5 text-[12.5px] font-bold transition-all duration-200 active:scale-95 disabled:opacity-60 ${web ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-soft)] hover:border-[var(--accent)]"}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={web ? "text-[var(--accent)]" : ""}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></svg>
          <span className="truncate">{a.web}</span>
          <span aria-hidden="true" className={`relative ml-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${web ? "bg-[var(--accent)]" : "bg-[var(--hover)]"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${web ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
        {web && <p className="px-1 pb-0.5 text-[11.5px] leading-snug text-[var(--ink-faint)]">{a.webHint}</p>}
      </div>
      {(files.length > 0 || preparing) && (
        <div className="flex items-center gap-2 px-0.5 pt-0.5">
          {files.map((f) => (
            <div key={f.id} className="relative">
              <img src={f.thumb} alt="" className="h-14 w-14 rounded-lg object-cover" />
              {f.kind === "video" && <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] font-bold text-white">▶</span>}
              <button onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))} aria-label={a.remove} title={a.remove} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--ink)] text-[11px] font-bold leading-none text-[var(--bg)]">×</button>
            </div>
          ))}
          {preparing && <span className="text-[12px] text-[var(--ink-faint)]" role="status">{a.preparing}</span>}
        </div>
      )}
      <div className="flex gap-1.5">
        {showUp && (
          <button onClick={toTop} aria-label={UP[lang] ?? UP.en} title={UP[lang] ?? UP.en} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[16px] font-bold text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] active:scale-95">↑</button>
        )}
        <input ref={pick} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => attach(e.target.files)} />
        <button onClick={() => pick.current?.click()} disabled={busy || preparing} aria-label={a.attach} title={a.attach} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] active:scale-95 disabled:opacity-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.4 11.6-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8" /></svg>
        </button>
        <input className="h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-[var(--panel-2)] px-3 text-[13.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)]" value={text} maxLength={600} placeholder={l.ph} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(text); }} />
        <button onClick={() => send(text)} disabled={busy || preparing || (!text.trim() && !files.length)} className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent-ink)] transition-all active:scale-95 disabled:opacity-50">{l.send}</button>
      </div>
      </div>

      <div className="flex justify-between px-1 pb-2 text-[12px] font-semibold leading-relaxed text-[var(--ink-faint)]">
        <button onClick={() => { setMsgs([]); setError(null); }} disabled={!msgs.length || busy} className="hover:text-[var(--ink)] disabled:opacity-40">{l.clear}</button>
        <button onClick={() => setOn(false)} disabled={busy} className="hover:text-[var(--ink)] disabled:opacity-40">{l.off}</button>
      </div>
    </div>
  );
}

const REMEMBER: Record<Lang, string> = { ru: "Запомнить", en: "Remember this", be: "Запомніць", uk: "Запам'ятати", de: "Merken", fr: "Retenir", es: "Recordar" };

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
