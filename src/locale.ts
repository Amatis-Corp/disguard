export type Locale = "en" | "es";

export const WARN_TEMPLATES: Record<Locale, string> = {
  en: "{user}, your message was blocked: {reason}. Strikes: {strikes}.",
  es: "{user}, tu mensaje se ha bloqueado: {reason}. Strikes: {strikes}.",
};

export const LOG_LABELS: Record<Locale, {
  title: (type: string) => string;
  user: string;
  channel: string;
  severity: string;
  strikes: string;
  actions: string;
  message: string;
  none: string;
}> = {
  en: {
    title: (type) => `Disguard · ${type}`,
    user: "User",
    channel: "Channel",
    severity: "Severity",
    strikes: "Strikes",
    actions: "Actions",
    message: "Message",
    none: "none",
  },
  es: {
    title: (type) => `Disguard · ${type}`,
    user: "Usuario",
    channel: "Canal",
    severity: "Severidad",
    strikes: "Strikes",
    actions: "Acciones",
    message: "Mensaje",
    none: "ninguna",
  },
};

export function resolveWarnMessage(locale: Locale, custom: string): string {
  const trimmed = custom.trim();
  return trimmed.length > 0 ? custom : WARN_TEMPLATES[locale];
}
