"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/actions";
import { ACTIVE_LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";

// Selector de idioma flotante para pantallas sin menú (login/registro).
// Mismo patrón visual que ThemeToggle: un botón "pill" con hex + etiqueta que
// cicla entre los idiomas activos (es → en → ca → es).
export default function LocaleToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cycle() {
    const idx = ACTIVE_LOCALES.indexOf(locale as (typeof ACTIVE_LOCALES)[number]);
    const next = ACTIVE_LOCALES[(idx + 1) % ACTIVE_LOCALES.length];
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="cp-theme-toggle"
      onClick={cycle}
      disabled={pending}
      title="Cambiar idioma · Change language · Canvia d'idioma"
      aria-label="Cambiar idioma"
    >
      <span className="hex"></span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
      <span className="cp-theme-toggle-label">{LOCALE_NAMES[locale] ?? locale}</span>
    </button>
  );
}
