import type { Lang } from "../i18n";
import { fromISO } from "../store";

/** Вопросы дня. Порядок одинаков во всех языках: друг видит тот же вопрос на своём языке. */
export const QUESTIONS: Record<Lang, string[]> = {
  ru: [
    "За что ты благодарен сегодня?", "Что сегодня заставило тебя улыбнуться?", "Чему ты научился на этой неделе?",
    "Какой маленький шаг приблизит тебя к важной цели?", "Что бы ты сказал себе год назад?", "Кто сегодня сделал твой день лучше?",
    "Что ты откладываешь и почему?", "Какое место в твоём городе ты любишь больше всего?", "Какая песня описывает твоё настроение сегодня?",
    "Что тебя сейчас по-настоящему радует?", "Чего тебе не хватает прямо сейчас?", "Что ты сделал сегодня для себя?",
    "Какое твоё любимое воспоминание из детства?", "Что бы ты сделал, если бы не боялся ошибиться?", "Кому ты давно хотел написать?",
    "Что тебя вдохновляет в последнее время?", "Какая привычка помогает тебе больше всего?", "Что было самым трудным сегодня и как ты справился?",
    "Какое блюдо ты бы съел прямо сейчас?", "Чем бы ты занялся, будь у тебя свободный день?", "Какое решение ты недавно принял и рад ему?",
    "Что ты хочешь запомнить об этом периоде жизни?", "Какую книгу, фильм или игру ты бы посоветовал другу?", "Что даёт тебе энергию?",
    "Что ты хочешь отпустить?", "Какой комплимент ты получил или хотел бы получить?", "Каким ты хочешь видеть завтрашний день?",
    "Чем ты гордишься в себе?", "Что нового ты попробовал недавно?", "Какой совет ты бы дал другу в твоей ситуации?",
  ],
  en: [
    "What are you grateful for today?", "What made you smile today?", "What did you learn this week?",
    "What small step would bring you closer to an important goal?", "What would you tell yourself a year ago?", "Who made your day better today?",
    "What are you putting off, and why?", "Which place in your city do you love the most?", "Which song describes your mood today?",
    "What truly makes you happy right now?", "What are you missing right now?", "What did you do for yourself today?",
    "What is your favorite childhood memory?", "What would you do if you weren't afraid of failing?", "Who have you been meaning to write to?",
    "What has inspired you lately?", "Which habit helps you the most?", "What was the hardest thing today, and how did you handle it?",
    "What dish would you eat right now?", "What would you do with a completely free day?", "Which recent decision are you glad you made?",
    "What do you want to remember about this period of your life?", "Which book, film or game would you recommend to a friend?", "What gives you energy?",
    "What do you want to let go of?", "What compliment did you get, or wish you'd get?", "How would you like tomorrow to go?",
    "What are you proud of in yourself?", "What new thing did you try recently?", "What advice would you give a friend in your situation?",
  ],
  be: [
    "За што ты ўдзячны сёння?", "Што сёння прымусіла цябе ўсміхнуцца?", "Чаму ты навучыўся на гэтым тыдні?",
    "Які маленькі крок наблізіць цябе да важнай мэты?", "Што б ты сказаў сабе год таму?", "Хто сёння зрабіў твой дзень лепшым?",
    "Што ты адкладаеш і чаму?", "Якое месца ў тваім горадзе ты любіш больш за ўсё?", "Якая песня апісвае тваё сённяшняе надвор'е ў душы?",
    "Што цябе зараз сапраўды радуе?", "Чаго табе не хапае проста зараз?", "Што ты зрабіў сёння для сябе?",
    "Якое тваё любімае ўспамін з дзяцінства?", "Што б ты зрабіў, калі б не баяўся памыліцца?", "Каму ты даўно хацеў напісаць?",
    "Што цябе натхняе апошнім часам?", "Якая звычка дапамагае табе больш за ўсё?", "Што было самым цяжкім сёння і як ты справіўся?",
    "Якую страву ты з'еў бы проста зараз?", "Чым бы ты заняўся, калі б меў вольны дзень?", "Якое рашэнне ты нядаўна прыняў і рады яму?",
    "Што ты хочаш запомніць пра гэты перыяд жыцця?", "Якую кнігу, фільм або гульню ты параіў бы сябру?", "Што дае табе энергію?",
    "Ад чаго ты хочаш адпусціць?", "Які камплімент ты атрымаў або хацеў бы атрымаць?", "Якім ты хочаш бачыць заўтрашні дзень?",
    "Чым ты ганарышся ў сабе?", "Што новага ты паспрабаваў нядаўна?", "Якую параду ты даў бы сябру ў тваёй сітуацыі?",
  ],
  uk: [
    "За що ти вдячний сьогодні?", "Що сьогодні змусило тебе всміхнутися?", "Чого ти навчився цього тижня?",
    "Який маленький крок наблизить тебе до важливої мети?", "Що б ти сказав собі рік тому?", "Хто сьогодні зробив твій день кращим?",
    "Що ти відкладаєш і чому?", "Яке місце у твоєму місті ти любиш найбільше?", "Яка пісня описує твій настрій сьогодні?",
    "Що тебе зараз справді радує?", "Чого тобі бракує просто зараз?", "Що ти зробив сьогодні для себе?",
    "Який твій улюблений спогад із дитинства?", "Що б ти зробив, якби не боявся помилитися?", "Кому ти давно хотів написати?",
    "Що тебе надихає останнім часом?", "Яка звичка допомагає тобі найбільше?", "Що було найважчим сьогодні і як ти впорався?",
    "Яку страву ти б з'їв просто зараз?", "Чим би ти зайнявся, якби мав вільний день?", "Яке рішення ти нещодавно ухвалив і радий йому?",
    "Що ти хочеш запам'ятати про цей період життя?", "Яку книгу, фільм чи гру ти б порадив другові?", "Що дає тобі енергію?",
    "Що ти хочеш відпустити?", "Який комплімент ти отримав або хотів би отримати?", "Яким ти хочеш бачити завтрашній день?",
    "Чим ти пишаєшся в собі?", "Що нового ти спробував нещодавно?", "Яку пораду ти дав би другові у твоїй ситуації?",
  ],
  de: [
    "Wofür bist du heute dankbar?", "Was hat dich heute zum Lächeln gebracht?", "Was hast du diese Woche gelernt?",
    "Welcher kleine Schritt bringt dich einem wichtigen Ziel näher?", "Was würdest du dir vor einem Jahr sagen?", "Wer hat deinen Tag heute besser gemacht?",
    "Was schiebst du auf, und warum?", "Welchen Ort in deiner Stadt liebst du am meisten?", "Welches Lied beschreibt deine Stimmung heute?",
    "Was macht dich gerade wirklich glücklich?", "Was fehlt dir gerade?", "Was hast du heute für dich getan?",
    "Was ist deine schönste Kindheitserinnerung?", "Was würdest du tun, wenn du keine Angst vor Fehlern hättest?", "Wem wolltest du schon lange schreiben?",
    "Was hat dich in letzter Zeit inspiriert?", "Welche Gewohnheit hilft dir am meisten?", "Was war heute am schwierigsten, und wie hast du es gemeistert?",
    "Welches Gericht würdest du jetzt essen?", "Was würdest du mit einem freien Tag anfangen?", "Welche Entscheidung hast du kürzlich getroffen und bist froh darüber?",
    "Woran möchtest du dich aus dieser Lebensphase erinnern?", "Welches Buch, welchen Film oder welches Spiel würdest du einem Freund empfehlen?", "Was gibt dir Energie?",
    "Was möchtest du loslassen?", "Welches Kompliment hast du bekommen oder dir gewünscht?", "Wie soll dein morgiger Tag aussehen?",
    "Worauf bist du an dir stolz?", "Was hast du kürzlich Neues ausprobiert?", "Welchen Rat würdest du einem Freund in deiner Lage geben?",
  ],
  fr: [
    "De quoi es-tu reconnaissant aujourd'hui ?", "Qu'est-ce qui t'a fait sourire aujourd'hui ?", "Qu'as-tu appris cette semaine ?",
    "Quel petit pas te rapprocherait d'un objectif important ?", "Que te dirais-tu il y a un an ?", "Qui a rendu ta journée meilleure aujourd'hui ?",
    "Que remets-tu à plus tard, et pourquoi ?", "Quel endroit de ta ville préfères-tu ?", "Quelle chanson décrit ton humeur aujourd'hui ?",
    "Qu'est-ce qui te rend vraiment heureux en ce moment ?", "Qu'est-ce qui te manque en ce moment ?", "Qu'as-tu fait pour toi aujourd'hui ?",
    "Quel est ton souvenir d'enfance préféré ?", "Que ferais-tu si tu n'avais pas peur de te tromper ?", "À qui voulais-tu écrire depuis longtemps ?",
    "Qu'est-ce qui t'inspire ces derniers temps ?", "Quelle habitude t'aide le plus ?", "Qu'est-ce qui a été le plus difficile aujourd'hui, et comment l'as-tu géré ?",
    "Quel plat mangerais-tu maintenant ?", "Que ferais-tu d'une journée entièrement libre ?", "Quelle décision récente es-tu content d'avoir prise ?",
    "Que veux-tu retenir de cette période de ta vie ?", "Quel livre, film ou jeu recommanderais-tu à un ami ?", "Qu'est-ce qui te donne de l'énergie ?",
    "Qu'as-tu envie de laisser derrière toi ?", "Quel compliment as-tu reçu, ou aimerais-tu recevoir ?", "Comment aimerais-tu que se passe demain ?",
    "De quoi es-tu fier en toi ?", "Qu'as-tu essayé de nouveau récemment ?", "Quel conseil donnerais-tu à un ami dans ta situation ?",
  ],
  es: [
    "¿Por qué estás agradecido hoy?", "¿Qué te hizo sonreír hoy?", "¿Qué aprendiste esta semana?",
    "¿Qué pequeño paso te acercaría a una meta importante?", "¿Qué te dirías a ti mismo hace un año?", "¿Quién hizo mejor tu día hoy?",
    "¿Qué estás posponiendo y por qué?", "¿Qué lugar de tu ciudad es tu favorito?", "¿Qué canción describe tu estado de ánimo hoy?",
    "¿Qué te hace realmente feliz ahora mismo?", "¿Qué te falta ahora mismo?", "¿Qué hiciste hoy por ti?",
    "¿Cuál es tu recuerdo favorito de la infancia?", "¿Qué harías si no tuvieras miedo a equivocarte?", "¿A quién querías escribir desde hace tiempo?",
    "¿Qué te ha inspirado últimamente?", "¿Qué hábito te ayuda más?", "¿Qué fue lo más difícil hoy y cómo lo manejaste?",
    "¿Qué plato comerías ahora mismo?", "¿Qué harías con un día totalmente libre?", "¿Qué decisión reciente te alegra haber tomado?",
    "¿Qué quieres recordar de esta etapa de tu vida?", "¿Qué libro, película o juego le recomendarías a un amigo?", "¿Qué te da energía?",
    "¿Qué quieres soltar?", "¿Qué cumplido recibiste o te gustaría recibir?", "¿Cómo te gustaría que fuera mañana?",
    "¿De qué te sientes orgulloso?", "¿Qué cosa nueva probaste hace poco?", "¿Qué consejo le darías a un amigo en tu situación?",
  ],
};

const COUNT = QUESTIONS.ru.length;

/** Номер вопроса для даты: меняется каждый день и одинаков у всех пользователей. */
export function questionIndex(iso: string): number {
  const d = fromISO(iso);
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return ((days % COUNT) + COUNT) % COUNT;
}

export function questionText(lang: Lang, idx: number): string {
  const list = QUESTIONS[lang] ?? QUESTIONS.en;
  return list[((idx % COUNT) + COUNT) % COUNT];
}
