import type { TempUnit } from "./types";

export type ThemeName = "dark" | "light";

export const ACCENTS = [
  { id: "red", label: "Red", color: "#ed1c24" },
  { id: "gold", label: "Gold", color: "#e0a106" },
  { id: "orange", label: "Orange", color: "#ff6a00" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "violet", label: "Violet", color: "#a855f7" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export type AppSettings = {
  intervalMs: number;
  unit: TempUnit;
  theme: ThemeName;
  accent: AccentId;
  elevateSensor: boolean;
  elevateApp: boolean;
};

const KEY = "mithraic-monitor-settings";

const DEFAULTS: AppSettings = {
  intervalMs: 1000,
  unit: "C",
  theme: "dark",
  accent: "red",
  elevateSensor: false,
  elevateApp: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const accent = ACCENTS.some((item) => item.id === parsed.accent) ? parsed.accent : DEFAULTS.accent;
    const theme = parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : DEFAULTS.theme;
    const unit = parsed.unit === "F" ? "F" : "C";
    const intervalMs = parsed.intervalMs === 500 || parsed.intervalMs === 2000 ? parsed.intervalMs : 1000;
    return {
      ...DEFAULTS,
      ...parsed,
      accent: accent ?? DEFAULTS.accent,
      theme,
      unit,
      intervalMs,
      elevateSensor: Boolean(parsed.elevateSensor),
      elevateApp: Boolean(parsed.elevateApp),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function applyAppearance(theme: ThemeName, accent: AccentId) {
  const color = ACCENTS.find((item) => item.id === accent)?.color ?? ACCENTS[0].color;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty("--accent", color);
}
