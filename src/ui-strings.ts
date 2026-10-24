import type { Lang } from "./i18n";

/** Строки входа, установки PWA и статуса синхронизации (вне основного словаря i18n). */
const ru = {
  syncOff: "Синхронизация не настроена", enterEmail: "Введите email", enterPassword: "Введите пароль",
  pwShort: "Пароль должен быть не менее 6 символов", badCreds: "Неверный email или пароль",
  confirmEmail: "Подтвердите email перед входом", resetSent: "Инструкции по сбросу пароля отправлены на почту!",
  emailTaken: "Этот email уже зарегистрирован", badEmail: "Некорректный email",
  checkMail: "Проверьте почту для подтверждения регистрации!", titleReset: "Восстановление доступа",
  titleLogin: "С возвращением!", titleSignup: "Создайте аккаунт", theme: "Тема оформления",
  password: "Пароль", hidePw: "Скрыть пароль", showPw: "Показать пароль", remember: "Запомнить меня",
  forgot: "Забыли пароль?", loading: "Загрузка...", sendInstr: "Отправить инструкции", signIn: "Войти",
  signUp: "Зарегистрироваться", google: "Войти через Google", backToLogin: "Назад ко входу",
  noAccount: "Нет аккаунта?", haveAccount: "Уже есть аккаунт?", create: "Создать", or: "или",
  continueLocal: "Продолжить без аккаунта", localNote: "Данные будут храниться локально в этом браузере",
  syncing: "Синхронизация...", synced: "Синхронизировано", syncError: "Ошибка", local: "Локально",
  loadFail: "Не удалось загрузить данные с сервера", installTitle: "Установить Daily Note",
  installSub: "Быстрый доступ к вашему дневнику", install: "Установить", close: "Закрыть",
  newPwTitle: "Новый пароль", newPwSave: "Сохранить пароль", pwUpdated: "Пароль обновлён", storageFull: "Память браузера заполнена: фото или данные не сохранились. Удалите лишние фото.",
};
type Strings = typeof ru;

const en: Strings = {
  syncOff: "Sync is not configured", enterEmail: "Enter your email", enterPassword: "Enter your password",
  pwShort: "Password must be at least 6 characters", badCreds: "Wrong email or password",
  confirmEmail: "Confirm your email before signing in", resetSent: "Password reset instructions sent to your email!",
  emailTaken: "This email is already registered", badEmail: "Invalid email",
  checkMail: "Check your email to confirm registration!", titleReset: "Account recovery",
  titleLogin: "Welcome back!", titleSignup: "Create an account", theme: "Theme",
  password: "Password", hidePw: "Hide password", showPw: "Show password", remember: "Remember me",
  forgot: "Forgot password?", loading: "Loading...", sendInstr: "Send instructions", signIn: "Sign in",
  signUp: "Sign up", google: "Sign in with Google", backToLogin: "Back to sign in",
  noAccount: "No account?", haveAccount: "Already have an account?", create: "Create", or: "or",
  continueLocal: "Continue without an account", localNote: "Data will be stored locally in this browser",
  syncing: "Syncing...", synced: "Synced", syncError: "Error", local: "Local",
  loadFail: "Could not load data from the server", installTitle: "Install Daily Note",
  installSub: "Quick access to your diary", install: "Install", close: "Close",
  newPwTitle: "New password", newPwSave: "Save password", pwUpdated: "Password updated", storageFull: "Browser storage is full: a photo or data was not saved. Remove some photos.",
};

const be: Strings = {
  syncOff: "Сінхранізацыя не наладжана", enterEmail: "Увядзіце email", enterPassword: "Увядзіце пароль",
  pwShort: "Пароль павінен быць не карацейшы за 6 сімвалаў", badCreds: "Няправільны email або пароль",
  confirmEmail: "Пацвердзіце email перад уваходам", resetSent: "Інструкцыі па скідзе пароля адпраўлены на пошту!",
  emailTaken: "Гэты email ужо зарэгістраваны", badEmail: "Некарэктны email",
  checkMail: "Праверце пошту для пацверджання рэгістрацыі!", titleReset: "Аднаўленне доступу",
  titleLogin: "З вяртаннем!", titleSignup: "Стварыце акаўнт", theme: "Тэма афармлення",
  password: "Пароль", hidePw: "Схаваць пароль", showPw: "Паказаць пароль", remember: "Запомніць мяне",
  forgot: "Забылі пароль?", loading: "Загрузка...", sendInstr: "Адправіць інструкцыі", signIn: "Увайсці",
  signUp: "Зарэгістравацца", google: "Увайсці праз Google", backToLogin: "Назад да ўваходу",
  noAccount: "Няма акаўнта?", haveAccount: "Ужо ёсць акаўнт?", create: "Стварыць", or: "або",
  continueLocal: "Працягнуць без акаўнта", localNote: "Даныя будуць захоўвацца лакальна ў гэтым браўзеры",
  syncing: "Сінхранізацыя...", synced: "Сінхранізавана", syncError: "Памылка", local: "Лакальна",
  loadFail: "Не ўдалося загрузіць даныя з сервера", installTitle: "Усталяваць Daily Note",
  installSub: "Хуткі доступ да вашага дзённіка", install: "Усталяваць", close: "Закрыць",
  newPwTitle: "Новы пароль", newPwSave: "Захаваць пароль", pwUpdated: "Пароль абноўлены", storageFull: "Памяць браўзера запоўнена: фота або даныя не захаваліся. Выдаліце лішнія фота.",
};

const uk: Strings = {
  syncOff: "Синхронізацію не налаштовано", enterEmail: "Введіть email", enterPassword: "Введіть пароль",
  pwShort: "Пароль має бути не коротшим за 6 символів", badCreds: "Невірний email або пароль",
  confirmEmail: "Підтвердьте email перед входом", resetSent: "Інструкції зі скидання пароля надіслано на пошту!",
  emailTaken: "Цей email уже зареєстровано", badEmail: "Некоректний email",
  checkMail: "Перевірте пошту для підтвердження реєстрації!", titleReset: "Відновлення доступу",
  titleLogin: "З поверненням!", titleSignup: "Створіть акаунт", theme: "Тема оформлення",
  password: "Пароль", hidePw: "Сховати пароль", showPw: "Показати пароль", remember: "Запам’ятати мене",
  forgot: "Забули пароль?", loading: "Завантаження...", sendInstr: "Надіслати інструкції", signIn: "Увійти",
  signUp: "Зареєструватися", google: "Увійти через Google", backToLogin: "Назад до входу",
  noAccount: "Немає акаунта?", haveAccount: "Вже є акаунт?", create: "Створити", or: "або",
  continueLocal: "Продовжити без акаунта", localNote: "Дані зберігатимуться локально в цьому браузері",
  syncing: "Синхронізація...", synced: "Синхронізовано", syncError: "Помилка", local: "Локально",
  loadFail: "Не вдалося завантажити дані із сервера", installTitle: "Встановити Daily Note",
  installSub: "Швидкий доступ до вашого щоденника", install: "Встановити", close: "Закрити",
  newPwTitle: "Новий пароль", newPwSave: "Зберегти пароль", pwUpdated: "Пароль оновлено", storageFull: "Пам’ять браузера заповнена: фото або дані не збереглися. Видаліть зайві фото.",
};

const de: Strings = {
  syncOff: "Synchronisierung nicht eingerichtet", enterEmail: "E-Mail eingeben", enterPassword: "Passwort eingeben",
  pwShort: "Das Passwort muss mindestens 6 Zeichen lang sein", badCreds: "Falsche E-Mail oder falsches Passwort",
  confirmEmail: "Bestätige deine E-Mail vor der Anmeldung", resetSent: "Anleitung zum Zurücksetzen wurde per E-Mail gesendet!",
  emailTaken: "Diese E-Mail ist bereits registriert", badEmail: "Ungültige E-Mail",
  checkMail: "Prüfe deine E-Mails, um die Registrierung zu bestätigen!", titleReset: "Zugang wiederherstellen",
  titleLogin: "Willkommen zurück!", titleSignup: "Konto erstellen", theme: "Farbschema",
  password: "Passwort", hidePw: "Passwort verbergen", showPw: "Passwort anzeigen", remember: "Angemeldet bleiben",
  forgot: "Passwort vergessen?", loading: "Laden...", sendInstr: "Anleitung senden", signIn: "Anmelden",
  signUp: "Registrieren", google: "Mit Google anmelden", backToLogin: "Zurück zur Anmeldung",
  noAccount: "Kein Konto?", haveAccount: "Schon ein Konto?", create: "Erstellen", or: "oder",
  continueLocal: "Ohne Konto fortfahren", localNote: "Daten werden lokal in diesem Browser gespeichert",
  syncing: "Synchronisiere...", synced: "Synchronisiert", syncError: "Fehler", local: "Lokal",
  loadFail: "Daten konnten nicht vom Server geladen werden", installTitle: "Daily Note installieren",
  installSub: "Schneller Zugriff auf dein Tagebuch", install: "Installieren", close: "Schließen",
  newPwTitle: "Neues Passwort", newPwSave: "Passwort speichern", pwUpdated: "Passwort aktualisiert", storageFull: "Browser-Speicher voll: Foto oder Daten wurden nicht gespeichert. Entferne einige Fotos.",
};

const fr: Strings = {
  syncOff: "La synchronisation n’est pas configurée", enterEmail: "Saisis ton e-mail", enterPassword: "Saisis ton mot de passe",
  pwShort: "Le mot de passe doit contenir au moins 6 caractères", badCreds: "E-mail ou mot de passe incorrect",
  confirmEmail: "Confirme ton e-mail avant de te connecter", resetSent: "Les instructions de réinitialisation ont été envoyées par e-mail !",
  emailTaken: "Cet e-mail est déjà enregistré", badEmail: "E-mail invalide",
  checkMail: "Vérifie ta boîte mail pour confirmer l’inscription !", titleReset: "Récupération du compte",
  titleLogin: "Content de te revoir !", titleSignup: "Crée un compte", theme: "Thème",
  password: "Mot de passe", hidePw: "Masquer le mot de passe", showPw: "Afficher le mot de passe", remember: "Se souvenir de moi",
  forgot: "Mot de passe oublié ?", loading: "Chargement...", sendInstr: "Envoyer les instructions", signIn: "Se connecter",
  signUp: "S’inscrire", google: "Se connecter avec Google", backToLogin: "Retour à la connexion",
  noAccount: "Pas de compte ?", haveAccount: "Déjà un compte ?", create: "Créer", or: "ou",
  continueLocal: "Continuer sans compte", localNote: "Les données seront stockées localement dans ce navigateur",
  syncing: "Synchronisation...", synced: "Synchronisé", syncError: "Erreur", local: "Local",
  loadFail: "Impossible de charger les données du serveur", installTitle: "Installer Daily Note",
  installSub: "Accès rapide à ton journal", install: "Installer", close: "Fermer",
  newPwTitle: "Nouveau mot de passe", newPwSave: "Enregistrer le mot de passe", pwUpdated: "Mot de passe mis à jour", storageFull: "Stockage du navigateur plein : une photo ou des données n’ont pas été enregistrées. Supprime des photos.",
};

const es: Strings = {
  syncOff: "La sincronización no está configurada", enterEmail: "Introduce tu correo", enterPassword: "Introduce tu contraseña",
  pwShort: "La contraseña debe tener al menos 6 caracteres", badCreds: "Correo o contraseña incorrectos",
  confirmEmail: "Confirma tu correo antes de iniciar sesión", resetSent: "¡Te enviamos las instrucciones para restablecer la contraseña!",
  emailTaken: "Este correo ya está registrado", badEmail: "Correo no válido",
  checkMail: "¡Revisa tu correo para confirmar el registro!", titleReset: "Recuperar acceso",
  titleLogin: "¡Bienvenido de nuevo!", titleSignup: "Crea una cuenta", theme: "Tema",
  password: "Contraseña", hidePw: "Ocultar contraseña", showPw: "Mostrar contraseña", remember: "Recordarme",
  forgot: "¿Olvidaste tu contraseña?", loading: "Cargando...", sendInstr: "Enviar instrucciones", signIn: "Iniciar sesión",
  signUp: "Registrarse", google: "Iniciar sesión con Google", backToLogin: "Volver al inicio de sesión",
  noAccount: "¿No tienes cuenta?", haveAccount: "¿Ya tienes cuenta?", create: "Crear", or: "o",
  continueLocal: "Continuar sin cuenta", localNote: "Los datos se guardarán localmente en este navegador",
  syncing: "Sincronizando...", synced: "Sincronizado", syncError: "Error", local: "Local",
  loadFail: "No se pudieron cargar los datos del servidor", installTitle: "Instalar Daily Note",
  installSub: "Acceso rápido a tu diario", install: "Instalar", close: "Cerrar",
  newPwTitle: "Nueva contraseña", newPwSave: "Guardar contraseña", pwUpdated: "Contraseña actualizada", storageFull: "Almacenamiento del navegador lleno: no se guardó una foto o datos. Elimina algunas fotos.",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };

export type UIKey = keyof Strings;
export const makeUI = (lang: Lang) => (k: UIKey): string => (ALL[lang] ?? ALL.en)[k];
