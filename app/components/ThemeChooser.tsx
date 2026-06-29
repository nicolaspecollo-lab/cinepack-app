"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function ThemeChooser({ onChoose }: { onChoose: (theme: "dark" | "light") => void }) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cinepack-theme")) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(theme: "dark" | "light") {
    localStorage.setItem("cinepack-theme", theme);
    setVisible(false);
    onChoose(theme);
  }

  return (
    <div className="cp-theme-chooser">
      <div className="cp-theme-chooser-card">
        <span className="hex"></span>
        <h3>{t("themeChooserTitle")}</h3>
        <p>{t("themeChooserDesc")}</p>
        <div className="cp-theme-chooser-options">
          <button type="button" className="cp-theme-option cp-theme-option-dark" onClick={() => choose("dark")}>
            <span className="cp-theme-option-preview">
              <span className="bar"></span>
              <span className="dot"></span>
            </span>
            <span>{t("darkMode")}</span>
          </button>
          <button type="button" className="cp-theme-option cp-theme-option-light" onClick={() => choose("light")}>
            <span className="cp-theme-option-preview">
              <span className="bar"></span>
              <span className="dot"></span>
            </span>
            <span>{t("lightMode")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
