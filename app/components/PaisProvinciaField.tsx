"use client";

import { useTranslations } from "next-intl";
import { PAISES, provinciasDe } from "../lib/geo";

// Selects dependientes (no redactables) en vez de texto libre: evita
// inconsistencias de datos para las estadísticas del panel admin.
export default function PaisProvinciaField({
  label,
  pais,
  provincia,
  onChangePais,
  onChangeProvincia,
  required = false,
}: {
  label: string;
  pais: string;
  provincia: string;
  onChangePais: (v: string) => void;
  onChangeProvincia: (v: string) => void;
  required?: boolean;
}) {
  const t = useTranslations("common");
  const provincias = provinciasDe(pais);

  return (
    <div className="afield afield-span2">
      <span>{label}</span>
      <div className="afield-select-row">
        <select
          required={required}
          value={pais}
          onChange={(e) => {
            onChangePais(e.target.value);
            onChangeProvincia("");
          }}
          className="afield-select"
        >
          <option value="">{t("countryPh")}</option>
          {PAISES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          required={required}
          value={provincia}
          onChange={(e) => onChangeProvincia(e.target.value)}
          disabled={!pais}
          className="afield-select"
          style={{ opacity: pais ? 1 : 0.6 }}
        >
          <option value="">{pais ? t("provincePh") : t("chooseCountryFirst")}</option>
          {provincias.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
