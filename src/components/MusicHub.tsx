import type { Lang } from "../i18n";
import MusicPlaylist from "./MusicPlaylist";

/** Раздел «Музыка» во вкладке «Друзья»: свой плейлист доступен без захода в профиль. */
export default function MusicHub({ userId, lang }: { userId: string; lang: Lang }) {
  return (
    <div className="animate-rise mx-auto w-full max-w-2xl">
      <MusicPlaylist viewerId={userId} profileId={userId} lang={lang} />
    </div>
  );
}
