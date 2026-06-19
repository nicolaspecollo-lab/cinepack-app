import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

// next-intl SIN i18n routing: el locale NO va en la URL, se lee de la cookie.
// Esto evita middleware propio (no choca con proxy.ts/Supabase) y deja todas
// las rutas actuales intactas.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  // Carga los mensajes del idioma elegido; si aún no tiene archivo (fr/it/de/
  // pt/gl/eu), cae al español para no romper nada.
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return { locale, messages };
});
