import type { Lang } from "./i18n";

/** Строки диктовки через ИИ и напоминаний по месту. */
const ru = {
  dictAiTitle: "Диктовка через ИИ", dictAiConsent: "В этом браузере нет встроенной диктовки. Можно расшифровывать голос через Google Gemini: короткая запись уйдёт туда один раз для расшифровки и нигде не сохранится. Записи дневника, имя и email не отправляются. Отправлять запись для расшифровки?",
  dictRec: "Идёт запись… нажмите ещё раз, чтобы расшифровать", dictWork: "Расшифровываю…", dictFail: "Не получилось расшифровать. Попробуйте ещё раз", dictEmpty: "Речь не распознана",
  dictMic: "Нет доступа к микрофону. Разрешите его в настройках браузера",
  plTitle: "Напоминания по месту", plSub: "Например, «купить хлеб», когда вы рядом с магазином",
  plNote: "Места хранятся только на этом устройстве и никуда не отправляются. Браузер не умеет следить за местом, когда приложение закрыто, поэтому напоминание приходит, если приложение открыто (или свёрнуто, но не выгружено) и вы рядом, либо когда вы нажмёте «Проверить сейчас». В APK сработает так же, только после обновления приложения до новой версии.",
  plEmpty: "Мест пока нет", plAdd: "Добавить место", plNamePh: "Название (например, магазин)", plTextPh: "Что напомнить", plHere: "Взять моё место", plHereOk: "Место взято", plRadius: "Радиус",
  plSave: "Сохранить", plCancel: "Отмена", plCheck: "Проверить сейчас", plNothing: "Рядом нет мест с напоминаниями", plSaved: "Место сохранено", plLimit: "Можно до {n} мест", plDelete: "Удалить",
  plDenied: "Нет доступа к местоположению. Разрешите его в настройках браузера", plUnavail: "Не удалось определить местоположение", plTimeout: "Местоположение определяется слишком долго. Попробуйте на улице или у окна",
  plVague: "Место определено неточно ({m} м). Подойдите ближе к окну или выйдите на улицу", plNeedPlace: "Сначала возьмите место и напишите, что напомнить", plNotSupported: "Этот браузер не умеет определять местоположение",
  plNear: "Рядом: {name}", plAuto: "Пока приложение открыто, проверяю место раз в пару минут", plOn: "Напоминание включено", plOff: "Напоминание выключено", plM: "{m} м", plKm: "{km} км",
};
type Strings = typeof ru;

const en: Strings = {
  dictAiTitle: "Dictate with AI", dictAiConsent: "This browser has no built-in dictation. Your voice can be transcribed with Google Gemini: a short recording is sent there once to be transcribed and is not stored. Diary entries, name and email are never sent. Send the recording for transcription?",
  dictRec: "Recording… tap again to transcribe", dictWork: "Transcribing…", dictFail: "Couldn't transcribe. Try again", dictEmpty: "No speech recognised",
  dictMic: "No microphone access. Allow it in your browser settings",
  plTitle: "Place reminders", plSub: "For example, “buy bread” when you are near the shop",
  plNote: "Places are stored only on this device and are never sent anywhere. A browser can't track your location while the app is closed, so a reminder appears when the app is open (or minimised but not unloaded) and you are nearby, or when you tap “Check now”. The APK works the same way, once updated to the new version.",
  plEmpty: "No places yet", plAdd: "Add a place", plNamePh: "Name (for example, the shop)", plTextPh: "What to remind", plHere: "Use my location", plHereOk: "Location taken", plRadius: "Radius",
  plSave: "Save", plCancel: "Cancel", plCheck: "Check now", plNothing: "No reminder places nearby", plSaved: "Place saved", plLimit: "Up to {n} places", plDelete: "Delete",
  plDenied: "No location access. Allow it in your browser settings", plUnavail: "Couldn't get your location", plTimeout: "Locating takes too long. Try outside or by a window",
  plVague: "Location is imprecise ({m} m). Move closer to a window or go outside", plNeedPlace: "First take your location and write what to remind", plNotSupported: "This browser can't get your location",
  plNear: "Nearby: {name}", plAuto: "While the app is open, I check your location every couple of minutes", plOn: "Reminder on", plOff: "Reminder off", plM: "{m} m", plKm: "{km} km",
};

const be: Strings = {
  dictAiTitle: "Дыктоўка праз ШІ", dictAiConsent: "У гэтым браўзеры няма ўбудаванай дыктоўкі. Голас можна расшыфроўваць праз Google Gemini: кароткі запіс пойдзе туды адзін раз для расшыфроўкі і нідзе не захаваецца. Запісы дзённіка, імя і email не адпраўляюцца. Адпраўляць запіс для расшыфроўкі?",
  dictRec: "Ідзе запіс… націсніце яшчэ раз, каб расшыфраваць", dictWork: "Расшыфроўваю…", dictFail: "Не атрымалася расшыфраваць. Паспрабуйце яшчэ раз", dictEmpty: "Маўленне не распазнана",
  dictMic: "Няма доступу да мікрафона. Дазвольце яго ў наладах браўзера",
  plTitle: "Напамінкі па месцы", plSub: "Напрыклад, «купіць хлеб», калі вы каля крамы",
  plNote: "Месцы захоўваюцца толькі на гэтай прыладзе і нікуды не адпраўляюцца. Браўзер не ўмее сачыць за месцам, калі праграма закрыта, таму напамінак прыходзіць, калі праграма адкрытая (або згорнутая, але не выгружаная) і вы побач, або калі вы націснеце «Праверыць зараз». У APK спрацуе гэтак жа, толькі пасля абнаўлення праграмы да новай версіі.",
  plEmpty: "Месцаў пакуль няма", plAdd: "Дадаць месца", plNamePh: "Назва (напрыклад, крама)", plTextPh: "Што нагадаць", plHere: "Узяць маё месца", plHereOk: "Месца ўзята", plRadius: "Радыус",
  plSave: "Захаваць", plCancel: "Скасаваць", plCheck: "Праверыць зараз", plNothing: "Побач няма месцаў з напамінкамі", plSaved: "Месца захавана", plLimit: "Можна да {n} месцаў", plDelete: "Выдаліць",
  plDenied: "Няма доступу да месцазнаходжання. Дазвольце яго ў наладах браўзера", plUnavail: "Не ўдалося вызначыць месцазнаходжанне", plTimeout: "Месцазнаходжанне вызначаецца занадта доўга. Паспрабуйце на вуліцы або каля акна",
  plVague: "Месца вызначана недакладна ({m} м). Падыдзіце бліжэй да акна або выйдзіце на вуліцу", plNeedPlace: "Спачатку вазьміце месца і напішыце, што нагадаць", plNotSupported: "Гэты браўзер не ўмее вызначаць месцазнаходжанне",
  plNear: "Побач: {name}", plAuto: "Пакуль праграма адкрытая, правяраю месца раз у пару хвілін", plOn: "Напамінак уключаны", plOff: "Напамінак выключаны", plM: "{m} м", plKm: "{km} км",
};

const uk: Strings = {
  dictAiTitle: "Диктування через ШІ", dictAiConsent: "У цьому браузері немає вбудованого диктування. Голос можна розшифровувати через Google Gemini: короткий запис піде туди один раз для розшифрування і ніде не збережеться. Записи щоденника, ім’я та email не надсилаються. Надсилати запис для розшифрування?",
  dictRec: "Триває запис… натисніть ще раз, щоб розшифрувати", dictWork: "Розшифровую…", dictFail: "Не вдалося розшифрувати. Спробуйте ще раз", dictEmpty: "Мовлення не розпізнано",
  dictMic: "Немає доступу до мікрофона. Дозвольте його в налаштуваннях браузера",
  plTitle: "Нагадування за місцем", plSub: "Наприклад, «купити хліб», коли ви біля магазину",
  plNote: "Місця зберігаються лише на цьому пристрої й нікуди не надсилаються. Браузер не вміє стежити за місцем, коли застосунок закритий, тому нагадування приходить, якщо застосунок відкритий (або згорнутий, але не вивантажений) і ви поруч, або коли ви натиснете «Перевірити зараз». В APK спрацює так само, лише після оновлення застосунку до нової версії.",
  plEmpty: "Місць поки немає", plAdd: "Додати місце", plNamePh: "Назва (наприклад, магазин)", plTextPh: "Що нагадати", plHere: "Взяти моє місце", plHereOk: "Місце взято", plRadius: "Радіус",
  plSave: "Зберегти", plCancel: "Скасувати", plCheck: "Перевірити зараз", plNothing: "Поруч немає місць із нагадуваннями", plSaved: "Місце збережено", plLimit: "Можна до {n} місць", plDelete: "Видалити",
  plDenied: "Немає доступу до місцезнаходження. Дозвольте його в налаштуваннях браузера", plUnavail: "Не вдалося визначити місцезнаходження", plTimeout: "Місцезнаходження визначається надто довго. Спробуйте надворі або біля вікна",
  plVague: "Місце визначено неточно ({m} м). Підійдіть ближче до вікна або вийдіть надвір", plNeedPlace: "Спершу візьміть місце й напишіть, що нагадати", plNotSupported: "Цей браузер не вміє визначати місцезнаходження",
  plNear: "Поруч: {name}", plAuto: "Поки застосунок відкритий, перевіряю місце раз на кілька хвилин", plOn: "Нагадування увімкнено", plOff: "Нагадування вимкнено", plM: "{m} м", plKm: "{km} км",
};

const de: Strings = {
  dictAiTitle: "Diktieren mit KI", dictAiConsent: "Dieser Browser hat kein eingebautes Diktieren. Deine Stimme kann mit Google Gemini transkribiert werden: Eine kurze Aufnahme wird einmal dorthin gesendet und nicht gespeichert. Tagebucheinträge, Name und E-Mail werden nie gesendet. Aufnahme zur Transkription senden?",
  dictRec: "Aufnahme läuft… tippe erneut zum Transkribieren", dictWork: "Transkribiere…", dictFail: "Transkription fehlgeschlagen. Versuche es erneut", dictEmpty: "Keine Sprache erkannt",
  dictMic: "Kein Zugriff auf das Mikrofon. Erlaube ihn in den Browser-Einstellungen",
  plTitle: "Erinnerungen am Ort", plSub: "Zum Beispiel „Brot kaufen“, wenn du in der Nähe des Ladens bist",
  plNote: "Orte werden nur auf diesem Gerät gespeichert und nirgendwohin gesendet. Ein Browser kann deinen Standort bei geschlossener App nicht verfolgen. Die Erinnerung kommt daher, wenn die App offen ist (oder minimiert, aber nicht beendet) und du in der Nähe bist, oder wenn du „Jetzt prüfen“ tippst. Die APK funktioniert genauso, sobald sie auf die neue Version aktualisiert ist.",
  plEmpty: "Noch keine Orte", plAdd: "Ort hinzufügen", plNamePh: "Name (z. B. der Laden)", plTextPh: "Woran erinnern", plHere: "Meinen Standort nehmen", plHereOk: "Standort übernommen", plRadius: "Radius",
  plSave: "Speichern", plCancel: "Abbrechen", plCheck: "Jetzt prüfen", plNothing: "Keine Erinnerungsorte in der Nähe", plSaved: "Ort gespeichert", plLimit: "Bis zu {n} Orte", plDelete: "Löschen",
  plDenied: "Kein Standortzugriff. Erlaube ihn in den Browser-Einstellungen", plUnavail: "Standort konnte nicht ermittelt werden", plTimeout: "Die Ortung dauert zu lange. Versuche es draußen oder am Fenster",
  plVague: "Standort ungenau ({m} m). Geh näher ans Fenster oder nach draußen", plNeedPlace: "Nimm zuerst deinen Standort und schreibe, woran erinnert werden soll", plNotSupported: "Dieser Browser kann den Standort nicht ermitteln",
  plNear: "In der Nähe: {name}", plAuto: "Solange die App offen ist, prüfe ich alle paar Minuten den Standort", plOn: "Erinnerung an", plOff: "Erinnerung aus", plM: "{m} m", plKm: "{km} km",
};

const fr: Strings = {
  dictAiTitle: "Dictée par IA", dictAiConsent: "Ce navigateur n’a pas de dictée intégrée. Ta voix peut être transcrite par Google Gemini : un court enregistrement y est envoyé une fois pour être transcrit et n’est pas conservé. Les notes du journal, le nom et l’e-mail ne sont jamais envoyés. Envoyer l’enregistrement pour transcription ?",
  dictRec: "Enregistrement… touche à nouveau pour transcrire", dictWork: "Transcription…", dictFail: "Transcription impossible. Réessaie", dictEmpty: "Aucune parole reconnue",
  dictMic: "Pas d’accès au micro. Autorise-le dans les réglages du navigateur",
  plTitle: "Rappels par lieu", plSub: "Par exemple « acheter du pain » quand tu es près du magasin",
  plNote: "Les lieux sont stockés uniquement sur cet appareil et ne sont envoyés nulle part. Un navigateur ne peut pas suivre ta position quand l’appli est fermée : le rappel apparaît donc quand l’appli est ouverte (ou réduite mais pas déchargée) et que tu es à proximité, ou quand tu touches « Vérifier maintenant ». L’APK fonctionne pareil, une fois mise à jour vers la nouvelle version.",
  plEmpty: "Aucun lieu pour l’instant", plAdd: "Ajouter un lieu", plNamePh: "Nom (par ex. le magasin)", plTextPh: "Quoi rappeler", plHere: "Prendre ma position", plHereOk: "Position prise", plRadius: "Rayon",
  plSave: "Enregistrer", plCancel: "Annuler", plCheck: "Vérifier maintenant", plNothing: "Aucun lieu de rappel à proximité", plSaved: "Lieu enregistré", plLimit: "Jusqu’à {n} lieux", plDelete: "Supprimer",
  plDenied: "Pas d’accès à la position. Autorise-le dans les réglages du navigateur", plUnavail: "Impossible d’obtenir ta position", plTimeout: "La localisation prend trop de temps. Essaie dehors ou près d’une fenêtre",
  plVague: "Position imprécise ({m} m). Rapproche-toi d’une fenêtre ou sors", plNeedPlace: "Prends d’abord ta position et écris quoi rappeler", plNotSupported: "Ce navigateur ne peut pas obtenir la position",
  plNear: "À proximité : {name}", plAuto: "Tant que l’appli est ouverte, je vérifie la position toutes les quelques minutes", plOn: "Rappel activé", plOff: "Rappel désactivé", plM: "{m} m", plKm: "{km} km",
};

const es: Strings = {
  dictAiTitle: "Dictado con IA", dictAiConsent: "Este navegador no tiene dictado integrado. Tu voz se puede transcribir con Google Gemini: una grabación corta se envía allí una vez para transcribirla y no se guarda. Nunca se envían entradas del diario, nombre ni correo. ¿Enviar la grabación para transcribirla?",
  dictRec: "Grabando… toca de nuevo para transcribir", dictWork: "Transcribiendo…", dictFail: "No se pudo transcribir. Inténtalo de nuevo", dictEmpty: "No se reconoció voz",
  dictMic: "Sin acceso al micrófono. Permítelo en los ajustes del navegador",
  plTitle: "Recordatorios por lugar", plSub: "Por ejemplo, «comprar pan» cuando estés cerca de la tienda",
  plNote: "Los lugares se guardan solo en este dispositivo y no se envían a ninguna parte. Un navegador no puede seguir tu ubicación con la app cerrada, así que el recordatorio aparece cuando la app está abierta (o minimizada pero no descargada) y estás cerca, o al tocar «Comprobar ahora». El APK funciona igual, una vez actualizado a la nueva versión.",
  plEmpty: "Aún no hay lugares", plAdd: "Añadir lugar", plNamePh: "Nombre (por ejemplo, la tienda)", plTextPh: "Qué recordar", plHere: "Usar mi ubicación", plHereOk: "Ubicación tomada", plRadius: "Radio",
  plSave: "Guardar", plCancel: "Cancelar", plCheck: "Comprobar ahora", plNothing: "No hay lugares con recordatorio cerca", plSaved: "Lugar guardado", plLimit: "Hasta {n} lugares", plDelete: "Eliminar",
  plDenied: "Sin acceso a la ubicación. Permítelo en los ajustes del navegador", plUnavail: "No se pudo obtener tu ubicación", plTimeout: "La ubicación tarda demasiado. Prueba en la calle o junto a una ventana",
  plVague: "Ubicación imprecisa ({m} m). Acércate a una ventana o sal a la calle", plNeedPlace: "Primero toma tu ubicación y escribe qué recordar", plNotSupported: "Este navegador no puede obtener la ubicación",
  plNear: "Cerca: {name}", plAuto: "Mientras la app está abierta, compruebo la ubicación cada pocos minutos", plOn: "Recordatorio activado", plOff: "Recordatorio desactivado", plM: "{m} m", plKm: "{km} km",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type VoiceKey = keyof Strings;
export const makeVoice = (lang: Lang) => (k: VoiceKey, vars?: Record<string, string | number>): string => {
  let s = (ALL[lang] ?? en)[k];
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.split(`{${a}}`).join(String(b));
  return s;
};
