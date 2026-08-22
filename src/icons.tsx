interface IconProps {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const CalendarIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    <path d="M7.5 13.5h3M7.5 16.5h6" />
  </svg>
);

export const StatsIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8.5 16v-5M13 16V7.5M17.5 16v-3" strokeWidth={2.2} />
  </svg>
);

export const NotebookIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6 3.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" />
    <path d="M8.5 3.5v17M12 8.5h4M12 12h4" />
  </svg>
);

export const GearIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8l1.2 2.4 2.6-.7 1 2.5 2.7.3-.3 2.7 2.2 1.6-1.5 2.2 1 2.5-2.5 1-.1 2.7-2.7-.2-1.6 2.2-2.3-1.5-2.5.8-.9-2.6-2.7-.5.3-2.7-2.2-1.6 1.6-2.2-1-2.5 2.5-1 .1-2.7 2.7.2L9.6 3.4l2.4-.6Z" />
  </svg>
);

export const PaletteIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.8 2-1.7 0-.8-.5-1.3-.5-2 0-1 .8-1.8 2-1.8h1.8c1.8 0 3.2-1.3 3.2-3.2C20.5 6.6 16.7 3.5 12 3.5Z" />
    <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const GlobeIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.1 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.1-3.9-8.5s1.3-6.2 3.9-8.5Z" />
  </svg>
);

export const ChevronIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6 9.5l6 6 6-6" />
  </svg>
);

export const CheckIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.4}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const PlusIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4.5 6.5h15M9.5 6V4.5A1.5 1.5 0 0 1 11 3h2a1.5 1.5 0 0 1 1.5 1.5V6M6.5 6.5l.8 12A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1M10 10.5v6M14 10.5v6" />
  </svg>
);

export const ArrowLeftIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </svg>
);

export const ArrowRightIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </svg>
);

export const SearchIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);

export const FlameIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3.5c.6 2.8-.8 4.4-2.2 6C8.3 11.2 7 12.9 7 15.2A5 5 0 0 0 12 20a5 5 0 0 0 5-4.8c0-3.3-2.3-4.6-2.6-7.4-1.3.7-2 1.9-2 3.4-1-1.2-1.2-3.5-.4-5.2.4-.9 0-1.7 0-2.5Z" />
  </svg>
);

export const AlertIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 4L2.8 19.5h18.4L12 4Z" />
    <path d="M12 10v4.2M12 16.8v.4" strokeWidth={2.2} />
  </svg>
);

export const PenIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19 4 20Z" />
    <path d="M14.5 6l3.5 3.5" />
  </svg>
);

export const MicIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="9.2" y="3.5" width="5.6" height="10" rx="2.8" />
    <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6" />
  </svg>
);

export const ImageIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M5 17.5l4.5-4.5 3 3 3-3 3.5 3.5" />
  </svg>
);

export const TagIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12.5 3.5H5.5a2 2 0 0 0-2 2v7l8.8 8.8a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12.5 3.5Z" />
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const DownloadIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 17v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V17" />
  </svg>
);

export const PrinterIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M7 8V3.5h10V8M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17" />
    <rect x="7" y="14" width="10" height="6.5" rx="1" />
  </svg>
);

export const LockIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="5.5" y="10.5" width="13" height="10" rx="2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const BellIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3.5a5.8 5.8 0 0 1 5.8 5.8c0 4.6 1.4 5.9 1.4 5.9H4.8s1.4-1.3 1.4-5.9A5.8 5.8 0 0 1 12 3.5Z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </svg>
);

export const BriefcaseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
  </svg>
);

export const LeafIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 19C5 9 11 4.5 19.5 4.5c0 9.5-5 14.5-13 14.5" />
    <path d="M5 19c2-5 5-8.5 9.5-10.5" />
  </svg>
);

export const BrushIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M20 4.5s-7.6 5.4-10.4 8.2a2.4 2.4 0 0 0 3.4 3.4C15.8 13.3 20 4.5 20 4.5Z" />
    <path d="M8.5 14.5c-2.2 0-3.9 1.7-4 5 2.3 0 5.5.3 6.6-2.4" />
  </svg>
);

export const BackspaceIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M8.5 5.5h10A2 2 0 0 1 20.5 7.5v9a2 2 0 0 1-2 2h-10L3 12l5.5-6.5Z" />
    <path d="M11.5 9.5l5 5M16.5 9.5l-5 5" />
  </svg>
);

export function MoodVisual({
  level,
  emoji,
  className = "h-6 w-6",
}: {
  level: number;
  emoji?: string;
  className?: string;
}) {
  if (emoji) {
    return (
      <span className={`${className} inline-flex items-center justify-center leading-none`}>
        <span style={{ fontSize: "1em" }}>{emoji}</span>
      </span>
    );
  }
  return <MoodFace level={level} className={className} />;
}

export function MoodFace({
  level,
  className = "h-6 w-6",
}: {
  level: number;
  className?: string;
}) {
  const mouths = [
    "M8.2 16.3 Q12 12.7 15.8 16.3",
    "M8.2 15.5 Q12 13.5 15.8 15.5",
    "M8.4 14.9 L15.6 14.9",
    "M8.2 14 Q12 16.9 15.8 14",
    "M7.8 13.4 Q12 18.4 16.2 13.4",
  ];
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="9" cy="9.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.8" r="1" fill="currentColor" stroke="none" />
      <path d={mouths[Math.max(0, Math.min(4, level))]} />
    </svg>
  );
}

export const SleepIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M8 3.5v17M16 3.5v17" />
    <path d="M4 8a8 8 0 0 1 16 0" />
    <path d="M6 12a6 6 0 0 1 12 0" />
    <path d="M8 16a4 4 0 0 1 8 0" />
  </svg>
);

export const UserIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
  </svg>
);

export const LogOutIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const LoginIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10,17 15,12 10,7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

export const Eye = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOff = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
