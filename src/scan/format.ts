import type { I18n } from "../i18n/core";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

const NUMBER_LOCALES: Record<string, string> = {
  en: "en-US",
  "zh-cn": "zh-CN"
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

export function formatCount(count: number, locale = "en"): string {
  const key = locale.toLowerCase();
  return new Intl.NumberFormat(NUMBER_LOCALES[key] ?? "en-US").format(count);
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "?";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatDurationShort(ms: number, i18n: I18n): string {
  if (!Number.isFinite(ms) || ms < 0) return "?";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return i18n.t("format.seconds", { value: (ms / 1000).toFixed(1) });
}

export function formatPercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0 || part <= 0) {
    return "0%";
  }
  const percent = (part / total) * 100;
  if (percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

export function formatClock(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(timestamp: number, i18n: I18n): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return i18n.t("format.unknown");
  }
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
