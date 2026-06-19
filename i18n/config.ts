// Configuración de idiomas de CINE PACK (i18n).
// Arquitectura lista para 9 idiomas desde el día 1; solo es/en/ca están
// activos (con archivo de mensajes) por ahora. Para activar otro idioma:
// crear messages/<locale>.json y añadir el código a ACTIVE_LOCALES — sin tocar código.

export const DEFAULT_LOCALE = "es" as const;

// Todos los idiomas contemplados por la arquitectura.
export const LOCALES = ["es", "en", "ca", "fr", "it", "de", "pt", "gl", "eu"] as const;

// Idiomas que el selector ofrece al usuario (los que ya tienen traducción).
export const ACTIVE_LOCALES = ["es", "en", "ca"] as const;

export type Locale = (typeof LOCALES)[number];

// Nombre de cada idioma en su propia lengua (para el selector).
export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
  ca: "Català",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  pt: "Português",
  gl: "Galego",
  eu: "Euskara",
};

// Nombre de la cookie donde se persiste la preferencia.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
