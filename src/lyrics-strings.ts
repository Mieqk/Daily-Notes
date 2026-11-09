import type { Lang } from "./i18n";

/** Строки панели «Текст песни». */
const ru = { lyrics: "Текст", loading: "Ищем текст…", none: "Текст этой песни не нашли", plainOnly: "Текст без привязки ко времени", previewNote: "В 30-секундном превью строки не подсвечиваются. Включите полный трек.", source: "Тексты: LRCLIB", hide: "Скрыть текст" };
type S = typeof ru;
const en: S = { lyrics: "Lyrics", loading: "Looking for lyrics…", none: "Couldn't find lyrics for this song", plainOnly: "Lyrics without timing", previewNote: "Lines aren't highlighted in the 30-second preview. Play the full track.", source: "Lyrics: LRCLIB", hide: "Hide lyrics" };
const be: S = { lyrics: "Тэкст", loading: "Шукаем тэкст…", none: "Тэкст гэтай песні не знайшлі", plainOnly: "Тэкст без прывязкі да часу", previewNote: "У 30-секунднай прэвʼю радкі не падсвечваюцца. Уключыце поўны трэк.", source: "Тэксты: LRCLIB", hide: "Схаваць тэкст" };
const uk: S = { lyrics: "Текст", loading: "Шукаємо текст…", none: "Текст цієї пісні не знайшли", plainOnly: "Текст без прив’язки до часу", previewNote: "У 30-секундному превʼю рядки не підсвічуються. Увімкніть повний трек.", source: "Тексти: LRCLIB", hide: "Сховати текст" };
const de: S = { lyrics: "Text", loading: "Suche Songtext…", none: "Für diesen Song wurde kein Text gefunden", plainOnly: "Text ohne Zeitmarken", previewNote: "In der 30-Sekunden-Vorschau werden Zeilen nicht hervorgehoben. Spiele den ganzen Titel.", source: "Texte: LRCLIB", hide: "Text ausblenden" };
const fr: S = { lyrics: "Paroles", loading: "Recherche des paroles…", none: "Paroles introuvables pour ce titre", plainOnly: "Paroles sans synchronisation", previewNote: "Les lignes ne sont pas surlignées dans l’aperçu de 30 secondes. Lancez le titre complet.", source: "Paroles : LRCLIB", hide: "Masquer les paroles" };
const es: S = { lyrics: "Letra", loading: "Buscando la letra…", none: "No encontramos la letra de esta canción", plainOnly: "Letra sin sincronizar", previewNote: "En la vista previa de 30 segundos las líneas no se resaltan. Reproduce la canción completa.", source: "Letras: LRCLIB", hide: "Ocultar letra" };

const ALL: Record<Lang, S> = { ru, en, be, uk, de, fr, es };
export const makeLyrics = (lang: Lang) => (k: keyof S): string => (ALL[lang] ?? ALL.ru)[k];
