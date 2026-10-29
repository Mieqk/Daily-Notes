import type { Lang } from "./i18n";

/** Строки личных заметок и своих ников для друзей: их видит только владелец. */
const ru = {
  edit: "Заметка и ник",
  title: "Только для вас",
  privateHint: "Друг этого не увидит",
  nickLabel: "Свой ник",
  nickPh: "Как вы его зовёте",
  noteLabel: "Заметка",
  notePh: "Например: любит чай, день рождения 5 мая",
  save: "Сохранить",
  clear: "Сбросить ник",
  saved: "Сохранено",
  failed: "Не получилось сохранить. Проверьте, что применена миграция 20261110",
  realName: "Настоящее имя: {name}",
};
type Strings = Record<keyof typeof ru, string>;

const en: Strings = {
  edit: "Note & nickname", title: "Only for you", privateHint: "Your friend won't see this",
  nickLabel: "Your nickname", nickPh: "What you call them", noteLabel: "Note",
  notePh: "E.g. loves tea, birthday on May 5", save: "Save", clear: "Reset nickname", saved: "Saved",
  failed: "Could not save. Make sure migration 20261110 is applied", realName: "Real name: {name}",
};
const be: Strings = {
  edit: "Нататка і мянушка", title: "Толькі для вас", privateHint: "Сябар гэтага не ўбачыць",
  nickLabel: "Ваша мянушка", nickPh: "Як вы яго завяце", noteLabel: "Нататка",
  notePh: "Напрыклад: любіць гарбату, дзень нараджэння 5 мая", save: "Захаваць", clear: "Скінуць мянушку", saved: "Захавана",
  failed: "Не атрымалася захаваць. Праверце, што ўжыта міграцыя 20261110", realName: "Сапраўднае імя: {name}",
};
const uk: Strings = {
  edit: "Нотатка і нік", title: "Лише для вас", privateHint: "Друг цього не побачить",
  nickLabel: "Ваш нік", nickPh: "Як ви його називаєте", noteLabel: "Нотатка",
  notePh: "Наприклад: любить чай, день народження 5 травня", save: "Зберегти", clear: "Скинути нік", saved: "Збережено",
  failed: "Не вдалося зберегти. Перевірте, що застосовано міграцію 20261110", realName: "Справжнє ім'я: {name}",
};
const de: Strings = {
  edit: "Notiz & Spitzname", title: "Nur für dich", privateHint: "Dein Freund sieht das nicht",
  nickLabel: "Dein Spitzname", nickPh: "Wie du ihn nennst", noteLabel: "Notiz",
  notePh: "Z. B. mag Tee, Geburtstag am 5. Mai", save: "Speichern", clear: "Spitzname zurücksetzen", saved: "Gespeichert",
  failed: "Speichern fehlgeschlagen. Ist die Migration 20261110 angewendet?", realName: "Echter Name: {name}",
};
const fr: Strings = {
  edit: "Note et surnom", title: "Rien que pour vous", privateHint: "Votre ami ne le verra pas",
  nickLabel: "Votre surnom", nickPh: "Comment vous l'appelez", noteLabel: "Note",
  notePh: "Ex. : aime le thé, anniversaire le 5 mai", save: "Enregistrer", clear: "Réinitialiser le surnom", saved: "Enregistré",
  failed: "Échec de l'enregistrement. La migration 20261110 est-elle appliquée ?", realName: "Vrai nom : {name}",
};
const es: Strings = {
  edit: "Nota y apodo", title: "Solo para ti", privateHint: "Tu amigo no lo verá",
  nickLabel: "Tu apodo", nickPh: "Cómo lo llamas", noteLabel: "Nota",
  notePh: "Ej.: le gusta el té, cumple el 5 de mayo", save: "Guardar", clear: "Restablecer apodo", saved: "Guardado",
  failed: "No se pudo guardar. ¿Está aplicada la migración 20261110?", realName: "Nombre real: {name}",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type FriendNoteKey = keyof Strings;
export const makeFriendNotes = (lang: Lang) => (k: FriendNoteKey): string => (ALL[lang] ?? en)[k];
