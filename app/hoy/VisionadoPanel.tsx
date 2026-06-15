"use client";

import { useState } from "react";
import DocumentosPanel from "./DocumentosPanel";
import EscenasPanel from "./EscenasPanel";
import { ACCENTS, PERMISOS_VISIONADO } from "../constants";

export default function VisionadoPanel({
  departamento,
  fullName,
}: {
  departamento: string;
  fullName: string;
}) {
  const permitidos = PERMISOS_VISIONADO[departamento] ?? [];
  const [activo, setActivo] = useState<string | null>(permitidos[0] ?? null);

  if (permitidos.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin visionado configurado</h4>
        <p>Este departamento todavía no tiene departamentos asignados para visionar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="doc-status">
        <span className="spill pub">● Visionado</span>
        <span className="txt">
          Consulta en solo lectura los documentos y escenas de los departamentos con los que{" "}
          <b>{departamento}</b> trabaja más de cerca.
        </span>
      </div>

      <div className="wtabs" style={{ padding: "0 30px 6px" }}>
        {permitidos.map((d) => (
          <button
            key={d}
            className={`wtab ${activo === d ? "active" : ""}`}
            style={activo === d ? ({ "--acc": `var(--${ACCENTS[d] ?? "lime"})` } as React.CSSProperties) : undefined}
            onClick={() => setActivo(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {activo && (
        <div style={{ "--acc": `var(--${ACCENTS[activo] ?? "lime"})` } as React.CSSProperties}>
          <div className="mbsection-title" style={{ margin: "18px 30px 12px" }}>
            Documentos de {activo}
          </div>
          <DocumentosPanel departamento={activo} fullName={fullName} readOnly />

          <div className="mbsection-title" style={{ margin: "24px 30px 12px" }}>
            Escenas — vista de {activo}
          </div>
          <div style={{ padding: "0 30px" }}>
            <EscenasPanel departamento={activo} />
          </div>
        </div>
      )}
    </>
  );
}
