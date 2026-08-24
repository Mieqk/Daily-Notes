import { useState, useEffect } from "react";

export function useStored<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function useNow(intervalMs: number) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function hashPin(pin: string) {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `${hash}-${pin.length}`;
}

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function readingMinutes(text: string) {
  return Math.max(1, Math.round(countWords(text) / 200));
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function buildMarkdown(
  notes: Record<string, string>,
  tasks: Record<string, Task[]>,
  moods: Record<string, number>,
  tags: Record<string, string[]>,
  lang: string
) {
  const lines: string[] = [];
  const dates = Object.keys(notes).sort();
  
  for (const date of dates) {
    const content = notes[date] || "";
    const dayTasks = tasks[date] || [];
    const mood = moods[date];
    const dayTags = tags[date] || [];
    
    lines.push(`# ${date}`);
    if (mood !== undefined) lines.push(`**Mood:** ${mood}/4`);
    if (dayTags.length > 0) lines.push(`**Tags:** ${dayTags.map(t => `#${t}`).join(" ")}`);
    lines.push("");
    lines.push(content);
    
    if (dayTasks.length > 0) {
      lines.push("");
      lines.push("**Tasks:**");
      for (const task of dayTasks) {
        lines.push(`- [${task.done ? "x" : " "}] ${task.text}`);
      }
    }
    
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const FONT_STACKS: Record<string, string> = {
  body: "inherit",
  serif: "Georgia, 'Lora', serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface SleepData {
  hours: number;
  quality: number;
  bedtime: string;
  waketime: string;
  awakenings: number;
  note: string;
}

export type WritingFontId = "body" | "serif" | "mono";
export type BgId = "dots" | "grid" | "paper" | "space" | "lines" | "hex" | "waves";
export type Tab = "daily" | "stats" | "notes" | "sleep" | "settings";
