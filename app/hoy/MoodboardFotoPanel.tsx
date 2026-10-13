"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import MoodboardFotoFicha from "./MoodboardFotoFicha";
import MoodboardFotoGaleria from "./MoodboardFotoGaleria";
import { ERROR_SIN_PROYECTO, useMoodboardFotoFilas } from "./useMoodboardFotoFilas";
import { useUrlsImagenes } from "./useUrlsImagenes";

type Props = { fullName: string; editable: boolean };

export default function MoodboardFotoPanel({ fullName, editable }: Props) {
  const t = useTranslations("moodboardFoto");
  const { referencias, loading, error, crear } = useMoodboardFotoFilas(fullName);
  const [fichaAbierta, setFichaAbierta] = useState(false);

  const rutas = useMemo(() => referencias.map((r) => r.datos.ruta), [referencias]);
  const urls = useUrlsImagenes(rutas);

  const botonAnadir = (
    <button className="cp-btn cp-btn-acc" onClick={() => setFichaAbierta(true)}>
      {t("addReference")}
    </button>
  );

  return (
    <>
      {editable && referencias.length > 0 && (
        <div className="mb-barra mb-barra-foto">{botonAnadir}</div>
      )}

      {error && <p className="amsg err">{error === ERROR_SIN_PROYECTO ? t("noProject") : error}</p>}

      {loading ? (
        <p className="amsg">{t("loading")}</p>
      ) : referencias.length === 0 ? (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>{t("emptyTitle")}</h4>
          <p>{editable ? t("emptyHint") : t("readOnlyEmpty")}</p>
          {editable && botonAnadir}
        </div>
      ) : (
        <MoodboardFotoGaleria referencias={referencias} urls={urls} />
      )}

      {fichaAbierta && (
        <MoodboardFotoFicha
          onCerrar={() => setFichaAbierta(false)}
          onGuardar={crear}
          textoSinProyecto={t("noProject")}
        />
      )}
    </>
  );
}