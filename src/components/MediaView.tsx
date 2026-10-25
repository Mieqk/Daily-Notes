import type { MediaType } from "../lib/media";

/** Показывает вложение: фото (по нажатию открывается целиком), видео или аудио. url ещё нет — заглушка. */
export default function MediaView({ url, type, className = "" }: { url?: string; type: MediaType; className?: string }) {
  if (!url) return <div className={`grid h-28 w-40 place-items-center rounded-lg bg-[var(--panel)] text-[12px] text-[var(--ink-faint)] ${className}`}>…</div>;
  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={className}>
        <img src={url} alt="" loading="lazy" className="block max-h-64 w-full rounded-lg object-cover" />
      </a>
    );
  }
  if (type === "video") {
    return <video src={url} controls playsInline preload="metadata" onClick={(e) => e.stopPropagation()} className={`block max-h-64 w-full rounded-lg bg-black ${className}`} />;
  }
  return <audio src={url} controls preload="metadata" onClick={(e) => e.stopPropagation()} className={`block h-10 w-full min-w-[12rem] ${className}`} />;
}
