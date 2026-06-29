"use client";

import { useTranslations } from "next-intl";

export default function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "dark" | "light";
  onToggle: () => void;
}) {
  const t = useTranslations("common");
  return (
    <button
      type="button"
      className="cp-theme-toggle"
      onClick={onToggle}
      title={theme === "dark" ? t("switchToLight") : t("switchToDark")}
      aria-label={t("changeTheme")}
    >
      <span className="hex"></span>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      )}
      <span className="cp-theme-toggle-label">{theme === "dark" ? t("dark") : t("light")}</span>
    </button>
  );
}
