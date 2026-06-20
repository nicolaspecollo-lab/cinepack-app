"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/actions";
import { ACTIVE_LOCALES, type Locale } from "@/i18n/config";

// Selector de idioma flotante para pantallas sin menú (login/registro).
// Muestra los tres códigos "ES / EN / CA"; el idioma activo va en negrita.
// Cada código es clicable para cambiar directamente a ese idioma.
export default function LocaleToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="cp-theme-toggle cp-locale-codes" aria-label="Cambiar idioma">
      {ACTIVE_LOCALES.map((l, i) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center" }}>
          {i > 0 && <span className="cp-locale-sep">/</span>}
          <button
            type="button"
            className={`cp-locale-code ${l === locale ? "active" : ""}`}
            onClick={() => choose(l)}
            disabled={pending}
            title={`Cambiar a ${l.toUpperCase()}`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
