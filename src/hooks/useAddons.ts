import { mergeById, useSyncedStored } from "../lib/fitnessSync";
import { sanitizePlugins, sanitizeTemplates } from "../addons";
import type { DayTemplate, Plugin, PluginData } from "../addons";

/** Отметки плагинов «дата -> плагин -> значение»: при первом объединении локальное побеждает, недостающее берём из облака. */
const mergePluginData = (local: PluginData, remote: PluginData): PluginData => {
  const out: PluginData = { ...remote };
  for (const [d, vals] of Object.entries(local)) out[d] = { ...(remote[d] ?? {}), ...vals };
  return out;
};

export function useDayTemplates() {
  const [raw, set] = useSyncedStored<DayTemplate[]>("dayTemplates", [], mergeById<DayTemplate>());
  return [sanitizeTemplates(raw), set] as const;
}

export function usePlugins() {
  const [raw, set] = useSyncedStored<Plugin[]>("plugins", [], mergeById<Plugin>());
  return [sanitizePlugins(raw), set] as const;
}

export function usePluginData() {
  const [raw, set] = useSyncedStored<PluginData>("pluginData", {}, mergePluginData);
  return [raw && typeof raw === "object" ? raw : {}, set] as const;
}
