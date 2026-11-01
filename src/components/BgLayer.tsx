import type { CSSProperties } from "react";
import { MASKS, isCustomBg, resolveBg } from "../bg";
import type { CustomBg, CustomBgOpts } from "../bg";
import type { BgId } from "../store";

interface Props {
  id: BgId;
  customs: CustomBg[];
  opts: CustomBgOpts;
  /** Плитка предпросмотра в настройках: без анимации. */
  preview?: boolean;
}

/** Слой с тайлом-маской: форма из SVG, цвет из темы. */
function M({ k, color = "var(--ink-faint)", op = 0.3, cls = "", style }: { k: keyof typeof MASKS; color?: string; op?: number; cls?: string; style?: CSSProperties }) {
  const m = MASKS[k];
  return (
    <i
      className={`bgx-m ${cls}`}
      style={{ background: color, opacity: op, "--m": m.url, "--mw": `${m.w}px`, "--mh": `${m.h}px`, ...style } as CSSProperties}
    />
  );
}

/** Рисует выбранный фон. Всё на CSS/SVG, анимации выключаются при prefers-reduced-motion и в превью. */
export default function BgLayer({ id, customs, opts, preview }: Props) {
  const bg = resolveBg(id, customs);
  const wrap = `bgx bgx-${isCustomBg(bg) ? "custom" : bg}${preview ? " bgx-static" : ""}`;

  if (isCustomBg(bg)) {
    const item = customs.find((c) => `custom:${c.id}` === bg);
    return (
      <div className={wrap} aria-hidden="true">
        <i
          style={{
            backgroundImage: item ? `url(${item.data})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: opts.blur ? `blur(${preview ? Math.round(opts.blur / 3) : opts.blur}px)` : undefined,
            transform: opts.blur ? "scale(1.08)" : undefined,
          }}
        />
        <i style={{ background: `color-mix(in srgb, var(--bg) ${opts.dim}%, transparent)` }} />
      </div>
    );
  }

  let body;
  switch (bg) {
    case "dots": body = <i className="bg-dots" style={{ opacity: 0.7 }} />; break;
    case "grid": body = <i className="bg-grid" style={{ opacity: 0.7 }} />; break;
    case "paper": body = <><i className="bgx-paper" /><i className="bgx-paper-margin" /></>; break;
    case "space": body = <><i className="bgx-space" /><i className="bgx-stars bgx-stars-a" /></>; break;
    case "lines": body = <M k="lines" op={0.3} cls="bgx-tile" />; break;
    case "hex": body = <M k="hex" op={0.3} cls="bgx-tile" />; break;
    case "waves": body = <M k="waves" op={0.3} cls="bgx-tile" />; break;
    case "geometry": body = <M k="geometry" color="var(--accent)" op={0.28} cls="bgx-tile" />; break;
    case "aurora": body = <><i className="bgx-aurora bgx-aurora-a" /><i className="bgx-aurora bgx-aurora-b" /><i className="bgx-aurora bgx-aurora-c" /></>; break;
    case "stars": body = <><i className="bgx-night" /><i className="bgx-stars bgx-stars-a" /><i className="bgx-stars bgx-stars-b" /></>; break;
    case "rain": body = <><i className="bgx-sky" /><M k="rainA" op={0.35} cls="bgx-fall bgx-rain-a" /><M k="rainB" op={0.22} cls="bgx-fall bgx-rain-b" /></>; break;
    case "snow": body = <><i className="bgx-sky" /><M k="snowA" color="var(--ink)" op={0.35} cls="bgx-fall bgx-snow-a" /><M k="snowB" color="var(--ink)" op={0.3} cls="bgx-fall bgx-snow-b" /></>; break;
    case "leaves": body = <><M k="leaves" color="#c9892f" op={0.32} cls="bgx-fall bgx-leaves-a" /><M k="leaves" color="#8a5a1f" op={0.22} cls="bgx-fall bgx-leaves-b" /></>; break;
    case "sakura": body = <><M k="petals" color="#f2a7c3" op={0.55} cls="bgx-fall bgx-petals-a" /><M k="petals" color="#f7c6d9" op={0.45} cls="bgx-fall bgx-petals-b" /></>; break;
    case "mountains": body = <><i className="bgx-sky" /><M k="hillsFar" color="var(--accent)" op={0.18} cls="bgx-bottom" /><M k="hillsNear" color="var(--ink-faint)" op={0.3} cls="bgx-bottom bgx-bottom-near" /></>; break;
    case "ocean": body = <><i className="bgx-sky" /><M k="oceanA" color="var(--accent)" op={0.2} cls="bgx-sea bgx-sea-a" /><M k="oceanB" color="var(--accent)" op={0.3} cls="bgx-sea bgx-sea-b" /></>; break;
    case "city": body = <><i className="bgx-night" /><i className="bgx-glow" /><M k="city" color="var(--ink-faint)" op={0.42} cls="bgx-bottom bgx-city" /></>; break;
    case "neon": body = <><i className="bgx-night" /><i className="bgx-neon" /><i className="bgx-neon-sun" /></>; break;
    case "grain": body = <i className="bgx-grain noise" />; break;
    case "marble": body = <M k="marble" color="var(--ink-faint)" op={0.4} cls="bgx-tile bgx-marble" />; break;
    case "sand": body = <><i className="bgx-sand-base" /><M k="sand" color="#a0824a" op={0.45} cls="bgx-tile bgx-sand-grain" /></>; break;
    case "fog": body = <><i className="bgx-fog bgx-fog-a" /><i className="bgx-fog bgx-fog-b" /><i className="bgx-fog bgx-fog-c" /></>; break;
    default: body = <i className="bg-dots" style={{ opacity: 0.7 }} />;
  }
  return <div className={wrap} aria-hidden="true">{body}</div>;
}
