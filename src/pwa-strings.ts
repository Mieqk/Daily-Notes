import type { Lang } from "./i18n";

/** Подсказки по установке на iPhone/iPad («На экран Домой») и ограничения пушей в Safari. */
const ru = {
  iosTitle: "Установить на iPhone", iosSub: "Добавьте на экран «Домой»: приложение откроется без адресной строки и сможет присылать уведомления",
  iosHow: "Как?", iosGuideTitle: "Установка на iPhone",
  iosStep1: "Откройте сайт в Safari и нажмите «Поделиться» внизу экрана (квадрат со стрелкой вверх)",
  iosStep2: "Пролистайте меню вниз и выберите «На экран “Домой”»",
  iosStep3: "Нажмите «Добавить» в правом верхнем углу. Готово: иконка появится на экране",
  iosNote: "Нужен Safari (в других браузерах на iPhone кнопка может быть иной). Для уведомлений нужен iOS 16.4 или новее: включайте их уже в приложении с экрана «Домой».",
  iosOk: "Понятно", iosPushNeed: "На iPhone уведомления работают только после установки на экран «Домой» (iOS 16.4+).", iosPushOpen: "Показать, как установить",
};
type Strings = typeof ru;

const en: Strings = {
  iosTitle: "Install on iPhone", iosSub: "Add it to your Home Screen: it opens without the address bar and can send notifications",
  iosHow: "How?", iosGuideTitle: "Install on iPhone",
  iosStep1: "Open the site in Safari and tap Share at the bottom of the screen (a square with an arrow pointing up)",
  iosStep2: "Scroll the menu down and choose “Add to Home Screen”",
  iosStep3: "Tap “Add” in the top right corner. Done: the icon appears on your Home Screen",
  iosNote: "Safari is required (other iPhone browsers may differ). Notifications need iOS 16.4 or newer: turn them on inside the app opened from the Home Screen.",
  iosOk: "Got it", iosPushNeed: "On iPhone, notifications only work after adding the app to the Home Screen (iOS 16.4+).", iosPushOpen: "Show how to install",
};

const be: Strings = {
  iosTitle: "Усталяваць на iPhone", iosSub: "Дадайце на экран «Дадому»: праграма адкрыецца без адраснага радка і зможа дасылаць апавяшчэнні",
  iosHow: "Як?", iosGuideTitle: "Усталёўка на iPhone",
  iosStep1: "Адкрыйце сайт у Safari і націсніце «Падзяліцца» ўнізе экрана (квадрат са стрэлкай уверх)",
  iosStep2: "Праструбіце меню ўніз і абярыце «На экран “Дадому”»",
  iosStep3: "Націсніце «Дадаць» у правым верхнім куце. Гатова: іконка з’явіцца на экране",
  iosNote: "Патрэбны Safari (у іншых браўзерах на iPhone кнопка можа быць іншай). Для апавяшчэнняў патрэбна iOS 16.4 або навейшая: уключайце іх ужо ў праграме з экрана «Дадому».",
  iosOk: "Зразумела", iosPushNeed: "На iPhone апавяшчэнні працуюць толькі пасля ўсталёўкі на экран «Дадому» (iOS 16.4+).", iosPushOpen: "Паказаць, як усталяваць",
};

const uk: Strings = {
  iosTitle: "Встановити на iPhone", iosSub: "Додайте на екран «Додому»: застосунок відкриється без адресного рядка і зможе надсилати сповіщення",
  iosHow: "Як?", iosGuideTitle: "Встановлення на iPhone",
  iosStep1: "Відкрийте сайт у Safari і натисніть «Поділитися» внизу екрана (квадрат зі стрілкою вгору)",
  iosStep2: "Прокрутіть меню вниз і виберіть «На екран “Додому”»",
  iosStep3: "Натисніть «Додати» у правому верхньому куті. Готово: іконка з’явиться на екрані",
  iosNote: "Потрібен Safari (в інших браузерах на iPhone кнопка може бути іншою). Для сповіщень потрібна iOS 16.4 або новіша: вмикайте їх уже в застосунку з екрана «Додому».",
  iosOk: "Зрозуміло", iosPushNeed: "На iPhone сповіщення працюють лише після встановлення на екран «Додому» (iOS 16.4+).", iosPushOpen: "Показати, як встановити",
};

const de: Strings = {
  iosTitle: "Auf dem iPhone installieren", iosSub: "Zum Home-Bildschirm hinzufügen: Die App öffnet sich ohne Adressleiste und kann Benachrichtigungen senden",
  iosHow: "Wie?", iosGuideTitle: "Installation auf dem iPhone",
  iosStep1: "Öffne die Seite in Safari und tippe unten auf „Teilen“ (Quadrat mit Pfeil nach oben)",
  iosStep2: "Scrolle im Menü nach unten und wähle „Zum Home-Bildschirm“",
  iosStep3: "Tippe oben rechts auf „Hinzufügen“. Fertig: Das Symbol erscheint auf dem Home-Bildschirm",
  iosNote: "Safari wird benötigt (andere iPhone-Browser können abweichen). Benachrichtigungen brauchen iOS 16.4 oder neuer: Schalte sie in der App ein, die du vom Home-Bildschirm öffnest.",
  iosOk: "Verstanden", iosPushNeed: "Auf dem iPhone funktionieren Benachrichtigungen erst nach dem Hinzufügen zum Home-Bildschirm (iOS 16.4+).", iosPushOpen: "Installation zeigen",
};

const fr: Strings = {
  iosTitle: "Installer sur iPhone", iosSub: "Ajoutez-la à l'écran d'accueil : l'application s'ouvre sans barre d'adresse et peut envoyer des notifications",
  iosHow: "Comment ?", iosGuideTitle: "Installation sur iPhone",
  iosStep1: "Ouvrez le site dans Safari et touchez Partager en bas de l'écran (un carré avec une flèche vers le haut)",
  iosStep2: "Faites défiler le menu vers le bas et choisissez « Sur l'écran d'accueil »",
  iosStep3: "Touchez « Ajouter » en haut à droite. C'est fait : l'icône apparaît sur l'écran d'accueil",
  iosNote: "Safari est nécessaire (les autres navigateurs d'iPhone peuvent différer). Les notifications demandent iOS 16.4 ou plus récent : activez-les dans l'application ouverte depuis l'écran d'accueil.",
  iosOk: "Compris", iosPushNeed: "Sur iPhone, les notifications ne fonctionnent qu'après l'ajout à l'écran d'accueil (iOS 16.4+).", iosPushOpen: "Voir comment installer",
};

const es: Strings = {
  iosTitle: "Instalar en iPhone", iosSub: "Añádela a la pantalla de inicio: se abre sin barra de direcciones y puede enviar notificaciones",
  iosHow: "¿Cómo?", iosGuideTitle: "Instalación en iPhone",
  iosStep1: "Abre el sitio en Safari y toca Compartir en la parte inferior (un cuadrado con una flecha hacia arriba)",
  iosStep2: "Desplaza el menú hacia abajo y elige «Añadir a pantalla de inicio»",
  iosStep3: "Toca «Añadir» arriba a la derecha. Listo: el icono aparece en la pantalla de inicio",
  iosNote: "Se necesita Safari (otros navegadores del iPhone pueden variar). Las notificaciones requieren iOS 16.4 o superior: actívalas dentro de la app abierta desde la pantalla de inicio.",
  iosOk: "Entendido", iosPushNeed: "En iPhone las notificaciones solo funcionan tras añadir la app a la pantalla de inicio (iOS 16.4+).", iosPushOpen: "Ver cómo instalar",
};

const all: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export const makePwa = (lang: Lang) => (k: keyof Strings): string => (all[lang] ?? all.en)[k];
