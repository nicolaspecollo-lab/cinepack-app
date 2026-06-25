"use client";

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
  const provincias = provinciasDe(pais);

  return (
    <div className="afield afield-span2">
      <span>{label}</span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <select
          required={required}
          value={pais}
          onChange={(e) => {
            onChangePais(e.target.value);
            onChangeProvincia("");
          }}
          style={{ flex: 1, minWidth: "160px", padding: "10px 12px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "14px" }}
        >
          <option value="">País…</option>
          {PAISES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          required={required}
          value={provincia}
          onChange={(e) => onChangeProvincia(e.target.value)}
          disabled={!pais}
          style={{ flex: 1, minWidth: "160px", padding: "10px 12px", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", borderRadius: "4px", fontSize: "14px", opacity: pais ? 1 : 0.6 }}
        >
          <option value="">{pais ? "Provincia…" : "Elegí un país primero"}</option>
          {provincias.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
