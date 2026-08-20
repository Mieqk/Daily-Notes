import { useEffect, useRef, useState } from "react";
import type { Lang } from "./i18n";
import { MOODS, localeOf } from "./i18n";
import type { Task, SleepData } from "./types";

export type { Task, SleepData };
export type Tab = "daily" | "stats" | "notes" | "settings";
export type BgId = "dots" | "grid" | "paper" | "space" | "lines" | "hex" | "waves";
export type WritingFontId = "body" | "serif" | "mono" | "hand1" | "hand2";

export const FONT_STACKS: Record<WritingFontId, string> = {
  body: "'Golos Text', 'Segoe UI', system-ui, sans-serif",
  serif: "'Lora', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
  hand1: "'Caveat', 'Comic Sans MS', cursive",
  hand2: "'Pacifico', 'Brush Script MT', cursive",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

/* ============ dates ============ */

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const todayISO = () => toISO(new Date());

export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const shiftISO = (iso: string, days: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

/* ============ text helpers ============ */

export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const readingMinutes = (s: string) => Math.max(1, Math.round(countWords(s) / 180));

/* ============ PIN ============ */

export const hashPin = (pin: string): string => {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h + pin.charCodeAt(i)) >>> 0;
  return "p" + h.toString(36) + pin.length.toString(36);
};

/* ============ photos ============ */

export const fileToDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * k);
      const h = Math.round(img.height * k);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });

/* ============ export ============ */

export const downloadText = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
};

export const buildMarkdown = (
  notes: Record<string, string>,
  tasks: Record<string, Task[]>,
  moods: Record<string, number>,
  tags: Record<string, string[]>,
  lang: Lang
): string => {
  const locale = localeOf(lang);
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines: string[] = ["# Daily Notes — export", ""];
  const keys = Object.keys(notes)
    .filter((k) => (notes[k] ?? "").trim())
    .sort((a, b) => b.localeCompare(a));
  for (const iso of keys) {
    lines.push(`## ${fmt.format(fromISO(iso))}`);
    if (moods[iso] !== undefined) {
      lines.push(`- ${lang === "ru" ? "Настроение" : "Mood"}: ${MOODS[lang][moods[iso]]}`);
    }
    const dayTags = tags[iso] ?? [];
    if (dayTags.length) lines.push(`- ${lang === "ru" ? "Теги" : "Tags"}: ${dayTags.map((x) => `#${x}`).join(" ")}`);
    const dayTasks = tasks[iso] ?? [];
    if (dayTasks.length) {
      lines.push("");
      for (const task of dayTasks) lines.push(`- [${task.done ? "x" : " "}] ${task.text}`);
    }
    lines.push("");
    lines.push((notes[iso] ?? "").trim());
    lines.push("", "---", "");
  }
  return lines.join("\n");
};
