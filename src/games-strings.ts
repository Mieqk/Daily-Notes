import type { Lang } from "./i18n";

/** Строки мини-игр во вкладке «Хобби → Игры». */
const ru = {
  tab: "Игры", intro: "Пара минут отдыха, когда скучно. Рекорды хранятся на этом устройстве.", back: "Все игры", newGame: "Заново",
  best: "Рекорд", score: "Счёт", moves: "Ходы", time: "Время", sec: "с", ms: "мс", none: "—", record: "Новый рекорд!",
  g2048: "2048", g2048Desc: "Сдвигай плитки и собери 2048", memory: "Память", memoryDesc: "Найди все пары карточек",
  snake: "Змейка", snakeDesc: "Ешь и расти, не врезайся", mines: "Сапёр", minesDesc: "Открой поле, не задев мины", reaction: "Реакция", reactionDesc: "Нажми, как только станет зелёным",
  swipe: "Свайпай по полю или жми стрелки", gameOver: "Игра окончена", youWin: "Победа!", keep: "Можно играть дальше",
  start: "Нажми, чтобы начать", pause: "Пауза", resume: "Продолжить", left: "Влево", right: "Вправо", up: "Вверх", down: "Вниз",
  flag: "Флажок", flagOn: "Режим флажка включён", mineLeft: "Мин", waitGreen: "Жди зелёного…", tapNow: "Жми!", tooSoon: "Рано! Нажми, чтобы повторить", again: "Нажми, чтобы ещё раз",
  card: "Карточка",
};
type Strings = typeof ru;

const en: Strings = {
  tab: "Games", intro: "A couple of minutes of fun when you're bored. Records stay on this device.", back: "All games", newGame: "Restart",
  best: "Best", score: "Score", moves: "Moves", time: "Time", sec: "s", ms: "ms", none: "—", record: "New record!",
  g2048: "2048", g2048Desc: "Slide tiles and reach 2048", memory: "Memory", memoryDesc: "Find all the card pairs",
  snake: "Snake", snakeDesc: "Eat and grow, don't crash", mines: "Minesweeper", minesDesc: "Clear the field without hitting a mine", reaction: "Reaction", reactionDesc: "Tap the moment it turns green",
  swipe: "Swipe on the board or use the arrows", gameOver: "Game over", youWin: "You win!", keep: "You can keep playing",
  start: "Tap to start", pause: "Pause", resume: "Resume", left: "Left", right: "Right", up: "Up", down: "Down",
  flag: "Flag", flagOn: "Flag mode is on", mineLeft: "Mines", waitGreen: "Wait for green…", tapNow: "Tap!", tooSoon: "Too soon! Tap to retry", again: "Tap to go again",
  card: "Card",
};

const be: Strings = {
  tab: "Гульні", intro: "Пара хвілін адпачынку, калі сумна. Рэкорды захоўваюцца на гэтай прыладзе.", back: "Усе гульні", newGame: "Нанова",
  best: "Рэкорд", score: "Лік", moves: "Хады", time: "Час", sec: "с", ms: "мс", none: "—", record: "Новы рэкорд!",
  g2048: "2048", g2048Desc: "Зрушвай плітачкі і збяры 2048", memory: "Памяць", memoryDesc: "Знайдзі ўсе пары карткаў",
  snake: "Змейка", snakeDesc: "Еш і расці, не ўрэжся", mines: "Сапёр", minesDesc: "Адкрый поле, не зачапіўшы мін", reaction: "Рэакцыя", reactionDesc: "Націсні, як толькі стане зялёным",
  swipe: "Правядзі па полі або націскай стрэлкі", gameOver: "Гульня скончана", youWin: "Перамога!", keep: "Можна гуляць далей",
  start: "Націсні, каб пачаць", pause: "Паўза", resume: "Працягнуць", left: "Улева", right: "Управа", up: "Уверх", down: "Уніз",
  flag: "Сцяжок", flagOn: "Рэжым сцяжка ўключаны", mineLeft: "Мін", waitGreen: "Чакай зялёнага…", tapNow: "Жмі!", tooSoon: "Рана! Націсні, каб паўтарыць", again: "Націсні, каб яшчэ раз",
  card: "Картка",
};

const uk: Strings = {
  tab: "Ігри", intro: "Кілька хвилин відпочинку, коли нудно. Рекорди зберігаються на цьому пристрої.", back: "Усі ігри", newGame: "Заново",
  best: "Рекорд", score: "Рахунок", moves: "Ходи", time: "Час", sec: "с", ms: "мс", none: "—", record: "Новий рекорд!",
  g2048: "2048", g2048Desc: "Зсувай плитки та збери 2048", memory: "Пам’ять", memoryDesc: "Знайди всі пари карток",
  snake: "Змійка", snakeDesc: "Їж і рости, не врізайся", mines: "Сапер", minesDesc: "Відкрий поле, не зачепивши мін", reaction: "Реакція", reactionDesc: "Натисни, щойно стане зеленим",
  swipe: "Свайпай по полю або тисни стрілки", gameOver: "Гру закінчено", youWin: "Перемога!", keep: "Можна грати далі",
  start: "Натисни, щоб почати", pause: "Пауза", resume: "Продовжити", left: "Вліво", right: "Вправо", up: "Вгору", down: "Вниз",
  flag: "Прапорець", flagOn: "Режим прапорця ввімкнено", mineLeft: "Мін", waitGreen: "Чекай зеленого…", tapNow: "Тисни!", tooSoon: "Зарано! Натисни, щоб повторити", again: "Натисни, щоб ще раз",
  card: "Картка",
};

const de: Strings = {
  tab: "Spiele", intro: "Ein paar Minuten Spaß, wenn dir langweilig ist. Rekorde bleiben auf diesem Gerät.", back: "Alle Spiele", newGame: "Neu",
  best: "Rekord", score: "Punkte", moves: "Züge", time: "Zeit", sec: "s", ms: "ms", none: "—", record: "Neuer Rekord!",
  g2048: "2048", g2048Desc: "Schiebe Kacheln bis 2048", memory: "Memory", memoryDesc: "Finde alle Kartenpaare",
  snake: "Schlange", snakeDesc: "Fressen und wachsen, nicht crashen", mines: "Minesweeper", minesDesc: "Räume das Feld ohne Mine", reaction: "Reaktion", reactionDesc: "Tippe, sobald es grün wird",
  swipe: "Wische über das Feld oder nutze die Pfeile", gameOver: "Spiel vorbei", youWin: "Gewonnen!", keep: "Du kannst weiterspielen",
  start: "Tippen zum Start", pause: "Pause", resume: "Weiter", left: "Links", right: "Rechts", up: "Hoch", down: "Runter",
  flag: "Flagge", flagOn: "Flaggenmodus ist an", mineLeft: "Minen", waitGreen: "Warte auf Grün…", tapNow: "Tippen!", tooSoon: "Zu früh! Tippen zum Wiederholen", again: "Tippen für noch einmal",
  card: "Karte",
};

const fr: Strings = {
  tab: "Jeux", intro: "Quelques minutes de détente quand on s'ennuie. Les records restent sur cet appareil.", back: "Tous les jeux", newGame: "Rejouer",
  best: "Record", score: "Score", moves: "Coups", time: "Temps", sec: "s", ms: "ms", none: "—", record: "Nouveau record !",
  g2048: "2048", g2048Desc: "Fais glisser les tuiles jusqu'à 2048", memory: "Mémoire", memoryDesc: "Trouve toutes les paires",
  snake: "Serpent", snakeDesc: "Mange et grandis sans te cogner", mines: "Démineur", minesDesc: "Dégage le champ sans toucher de mine", reaction: "Réflexes", reactionDesc: "Touche dès que c'est vert",
  swipe: "Glisse sur la grille ou utilise les flèches", gameOver: "Perdu", youWin: "Gagné !", keep: "Tu peux continuer",
  start: "Touche pour commencer", pause: "Pause", resume: "Reprendre", left: "Gauche", right: "Droite", up: "Haut", down: "Bas",
  flag: "Drapeau", flagOn: "Mode drapeau activé", mineLeft: "Mines", waitGreen: "Attends le vert…", tapNow: "Touche !", tooSoon: "Trop tôt ! Touche pour réessayer", again: "Touche pour rejouer",
  card: "Carte",
};

const es: Strings = {
  tab: "Juegos", intro: "Un par de minutos de diversión cuando te aburres. Los récords se quedan en este dispositivo.", back: "Todos los juegos", newGame: "Reiniciar",
  best: "Récord", score: "Puntos", moves: "Movs.", time: "Tiempo", sec: "s", ms: "ms", none: "—", record: "¡Nuevo récord!",
  g2048: "2048", g2048Desc: "Desliza fichas hasta llegar a 2048", memory: "Memoria", memoryDesc: "Encuentra todas las parejas",
  snake: "Serpiente", snakeDesc: "Come y crece sin chocar", mines: "Buscaminas", minesDesc: "Despeja el campo sin pisar una mina", reaction: "Reacción", reactionDesc: "Toca en cuanto se ponga verde",
  swipe: "Desliza sobre el tablero o usa las flechas", gameOver: "Fin del juego", youWin: "¡Ganaste!", keep: "Puedes seguir jugando",
  start: "Toca para empezar", pause: "Pausa", resume: "Seguir", left: "Izquierda", right: "Derecha", up: "Arriba", down: "Abajo",
  flag: "Bandera", flagOn: "Modo bandera activado", mineLeft: "Minas", waitGreen: "Espera al verde…", tapNow: "¡Toca!", tooSoon: "¡Muy pronto! Toca para repetir", again: "Toca para otra vez",
  card: "Carta",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type GamesKey = keyof Strings;
export const makeGames = (lang: Lang) => (k: GamesKey): string => (ALL[lang] ?? en)[k];
