import type { Lang } from "./i18n";

/** Строки подключения Spotify. */
const ru = {
  integrations: "Интеграции", integrationsSub: "Подключайте сервисы, чтобы они работали вместе с Daily Notes", needLogin: "Войдите в аккаунт, чтобы подключить Spotify", spSub: "Музыка и «сейчас играет»", statusOn: "Подключено", statusOff: "Не подключено",
  title: "Spotify", hint: "Подключите Spotify, и друзья будут видеть в профиле, что вы слушаете. Плейлисты можно добавить в свой плейлист.",
  connect: "Подключить Spotify", connected: "Spotify подключён", disconnect: "Отключить",
  sync: "Показывать, что я сейчас слушаю", syncNote: "Работает, пока приложение открыто.",
  import: "Добавить из Spotify", liked: "Понравившиеся треки", pick: "Выберите плейлист", loading: "Загружаем…",
  imported: "Добавлено треков: {n}", noneNew: "Новых треков нет", noPlaylists: "Плейлистов не нашлось",
  failed: "Не получилось. Попробуйте ещё раз", denied: "Spotify не пускает. Попросите владельца приложения добавить вас в список пользователей",
  toastOk: "Spotify подключён", toastErr: "Не удалось подключить Spotify",
};
type Strings = typeof ru;

const en: Strings = {
  integrations: "Integrations", integrationsSub: "Connect services to work together with Daily Notes", needLogin: "Sign in to connect Spotify", spSub: "Music and \"now playing\"", statusOn: "Connected", statusOff: "Not connected",
  title: "Spotify", hint: "Connect Spotify and friends will see what you're listening to on your profile. You can also add playlists to your own.",
  connect: "Connect Spotify", connected: "Spotify connected", disconnect: "Disconnect",
  sync: "Show what I'm listening to", syncNote: "Works while the app is open.",
  import: "Add from Spotify", liked: "Liked songs", pick: "Pick a playlist", loading: "Loading…",
  imported: "Tracks added: {n}", noneNew: "No new tracks", noPlaylists: "No playlists found",
  failed: "Something went wrong. Please try again", denied: "Spotify refused access. Ask the app owner to add you to the users list",
  toastOk: "Spotify connected", toastErr: "Couldn't connect Spotify",
};

const be: Strings = {
  integrations: "Інтэграцыі", integrationsSub: "Падключайце сэрвісы, каб яны працавалі разам з Daily Notes", needLogin: "Увайдзіце ў акаўнт, каб падключыць Spotify", spSub: "Музыка і «зараз іграе»", statusOn: "Падключана", statusOff: "Не падключана",
  title: "Spotify", hint: "Падключыце Spotify, і сябры будуць бачыць у профілі, што вы слухаеце. Плэйлісты можна дадаць у свой плэйліст.",
  connect: "Падключыць Spotify", connected: "Spotify падключаны", disconnect: "Адключыць",
  sync: "Паказваць, што я зараз слухаю", syncNote: "Працуе, пакуль праграма адкрытая.",
  import: "Дадаць са Spotify", liked: "Улюбёныя трэкі", pick: "Абярыце плэйліст", loading: "Загружаем…",
  imported: "Дададзена трэкаў: {n}", noneNew: "Новых трэкаў няма", noPlaylists: "Плэйлістаў не знайшлося",
  failed: "Не атрымалася. Паспрабуйце яшчэ раз", denied: "Spotify не пускае. Папрасіце ўладальніка праграмы дадаць вас у спіс карыстальнікаў",
  toastOk: "Spotify падключаны", toastErr: "Не ўдалося падключыць Spotify",
};

const uk: Strings = {
  integrations: "Інтеграції", integrationsSub: "Підключайте сервіси, щоб вони працювали разом із Daily Notes", needLogin: "Увійдіть в акаунт, щоб підключити Spotify", spSub: "Музика і «зараз грає»", statusOn: "Підключено", statusOff: "Не підключено",
  title: "Spotify", hint: "Підключіть Spotify, і друзі бачитимуть у профілі, що ви слухаєте. Плейлисти можна додати у свій плейлист.",
  connect: "Підключити Spotify", connected: "Spotify підключено", disconnect: "Відключити",
  sync: "Показувати, що я зараз слухаю", syncNote: "Працює, поки застосунок відкритий.",
  import: "Додати зі Spotify", liked: "Улюблені треки", pick: "Оберіть плейлист", loading: "Завантажуємо…",
  imported: "Додано треків: {n}", noneNew: "Нових треків немає", noPlaylists: "Плейлистів не знайшлося",
  failed: "Не вдалося. Спробуйте ще раз", denied: "Spotify не пускає. Попросіть власника застосунку додати вас до списку користувачів",
  toastOk: "Spotify підключено", toastErr: "Не вдалося підключити Spotify",
};

const de: Strings = {
  integrations: "Integrationen", integrationsSub: "Verbinde Dienste, damit sie mit Daily Notes zusammenarbeiten", needLogin: "Melde dich an, um Spotify zu verbinden", spSub: "Musik und „Gerade läuft“", statusOn: "Verbunden", statusOff: "Nicht verbunden",
  title: "Spotify", hint: "Verbinde Spotify, und Freunde sehen in deinem Profil, was du hörst. Playlists kannst du in deine eigene übernehmen.",
  connect: "Spotify verbinden", connected: "Spotify verbunden", disconnect: "Trennen",
  sync: "Anzeigen, was ich gerade höre", syncNote: "Funktioniert, solange die App geöffnet ist.",
  import: "Aus Spotify hinzufügen", liked: "Lieblingssongs", pick: "Playlist wählen", loading: "Wird geladen…",
  imported: "Titel hinzugefügt: {n}", noneNew: "Keine neuen Titel", noPlaylists: "Keine Playlists gefunden",
  failed: "Das hat nicht geklappt. Bitte erneut versuchen", denied: "Spotify verweigert den Zugriff. Bitte den App-Besitzer, dich zur Nutzerliste hinzuzufügen",
  toastOk: "Spotify verbunden", toastErr: "Spotify konnte nicht verbunden werden",
};

const fr: Strings = {
  integrations: "Intégrations", integrationsSub: "Connectez des services pour qu'ils fonctionnent avec Daily Notes", needLogin: "Connectez-vous pour relier Spotify", spSub: "Musique et « en cours d'écoute »", statusOn: "Connecté", statusOff: "Non connecté",
  title: "Spotify", hint: "Connectez Spotify et vos amis verront sur votre profil ce que vous écoutez. Vous pouvez aussi ajouter des playlists à la vôtre.",
  connect: "Connecter Spotify", connected: "Spotify connecté", disconnect: "Déconnecter",
  sync: "Afficher ce que j'écoute", syncNote: "Fonctionne tant que l'application est ouverte.",
  import: "Ajouter depuis Spotify", liked: "Titres likés", pick: "Choisissez une playlist", loading: "Chargement…",
  imported: "Titres ajoutés : {n}", noneNew: "Aucun nouveau titre", noPlaylists: "Aucune playlist trouvée",
  failed: "Échec. Réessayez", denied: "Spotify refuse l'accès. Demandez au propriétaire de l'appli de vous ajouter à la liste des utilisateurs",
  toastOk: "Spotify connecté", toastErr: "Impossible de connecter Spotify",
};

const es: Strings = {
  integrations: "Integraciones", integrationsSub: "Conecta servicios para que funcionen con Daily Notes", needLogin: "Inicia sesión para conectar Spotify", spSub: "Música y «escuchando ahora»", statusOn: "Conectado", statusOff: "No conectado",
  title: "Spotify", hint: "Conecta Spotify y tus amigos verán en tu perfil lo que escuchas. También puedes añadir listas a la tuya.",
  connect: "Conectar Spotify", connected: "Spotify conectado", disconnect: "Desconectar",
  sync: "Mostrar lo que escucho", syncNote: "Funciona mientras la app está abierta.",
  import: "Añadir desde Spotify", liked: "Canciones favoritas", pick: "Elige una lista", loading: "Cargando…",
  imported: "Canciones añadidas: {n}", noneNew: "No hay canciones nuevas", noPlaylists: "No se encontraron listas",
  failed: "No se pudo. Inténtalo de nuevo", denied: "Spotify rechazó el acceso. Pide al dueño de la app que te añada a la lista de usuarios",
  toastOk: "Spotify conectado", toastErr: "No se pudo conectar Spotify",
};

const ALL: Record<Lang, Strings> = { ru, en, be, uk, de, fr, es };
export type SpotifyKey = keyof Strings;
export const makeSpotify = (lang: Lang) => (k: SpotifyKey): string => (ALL[lang] ?? en)[k];
