"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import MoodboardFotoGaleria from "./MoodboardFotoGaleria";
import { ERROR_SIN_PROYECTO, useMoodboardFotoFilas } from "./useMoodboardFotoFilas";
import { useUrlsImagenes } from "./useUrlsImagenes";

type Props = {
  fullName: string;
  editable: boolean;
};

export default function MoodboardFotoPanel({ fullName, editable }: Props) {
  const t = useTranslations("moodboardFoto");
  const { referencias, loading, error } = useMoodboardFotoFilas(fullName);
  // Rutas memoizadas para que las URLs de Storage no se vuelvan a pedir en cada render.
  const rutas = useMemo(() => referencias.map((r) => r.datos.ruta), [referencias]);
  const urls = useUrlsImagenes(rutas);

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
      ) : (
        <MoodboardFotoGaleria referencias={referencias} urls={urls} />
      )}
    </>
  );
}