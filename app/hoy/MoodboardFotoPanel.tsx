"use client";

import { useTranslations } from "next-intl";
import { ERROR_SIN_PROYECTO, useMoodboardFotoFilas } from "./useMoodboardFotoFilas";

type Props = {
  fullName: string;
  editable: boolean;
};

export default function MoodboardFotoPanel({ fullName, editable }: Props) {
  const t = useTranslations("moodboardFoto");
  const { referencias, loading, error } = useMoodboardFotoFilas(fullName);

  return (
    <>
      {error && <p className="amsg err">{error === ERROR_SIN_PROYECTO ? t("noProject") : error}</p>}

      {loading ? (
        <p className="amsg">{t("loading")}</p>
      ) : referencias.length === 0 ? (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
        </div>
      ) : null}
    </>
  );
}