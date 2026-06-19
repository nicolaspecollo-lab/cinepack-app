"use server";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

// Server Action: persiste la preferencia de idioma en la cookie NEXT_LOCALE.
// El cliente la llama y luego hace router.refresh() para re-renderizar la UI
// con el nuevo idioma (no hay cambio de URL).
export async function setLocale(locale: string) {
  const value = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 año
    sameSite: "lax",
  });
}
