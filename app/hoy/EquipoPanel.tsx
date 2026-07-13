"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEquipoProyecto, type GrupoDepartamento } from "./useEquipoProyecto";
import { ACCENTS } from "../constants";
import Icon from "../components/Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

const ICON_POR_DEPTO: Record<string, IconName> = {
  "Ejecutivo": "briefcase",
  "Dirección": "film",
  "Producción": "list",
  "Fotografía": "camera",
  "Arte": "palette",
  "Guion": "file-text",
  "Casting": "users",
  "Reparto": "id-card",
  "Making of": "image",
  "Sonido": "sound",
  "Postproducción": "sliders",
  "RRHH": "users",
  "Sostenibilidad": "leaf",
  "Marketing": "megaphone",
  "Difusión": "message",
  "Distribución": "map-pin",
};

const HEXBG = (color: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='104' viewBox='0 0 120 104'%3E%3Cpolygon points='30,0 90,0 120,52 90,104 30,104 0,52' fill='none' stroke='${color}' stroke-width='2'/%3E%3C/svg%3E`;

// Valores hex reales de la paleta oficial (Biblia §10.5 / cp-theme.css) — un
// PDF no puede leer variables CSS (var(--lime) etc.), necesita el hex directo.
// Si la paleta cambia, actualizar acá también.
const DEPTO_HEX: Record<string, string> = {
  "Dirección": "#9EEE6A",
  "Producción": "#19CBE6",
  "Ejecutivo": "#C98AF2",
  "Casting": "#EE9962",
  "Making of": "#5BEDD6",
  "Sonido": "#E6B019",
  "Postproducción": "#F07A7A",
  "RRHH": "#66C3EE",
  "Sostenibilidad": "#52EC64",
  "Marketing": "#E8A330",
  "Difusión": "#5F70ED",
  "Distribución": "#F18E80",
  "Reparto": "#F4F4F6",
  "Fotografía": "#1F7DE2",
  "Guion": "#F5E26A",
  "Arte": "#F37FB5",
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Dibuja un hexágono relleno (mismo ángulo que el .hex de marca) en (x,y),
// centrado, ancho w / alto h.
function dibujarHexagono(doc: import("jspdf").jsPDF, x: number, y: number, w: number, h: number, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  doc.lines(
    [
      [w * 0.5, 0],
      [w * 0.25, h * 0.5],
      [-w * 0.25, h * 0.5],
      [-w * 0.5, 0],
      [-w * 0.25, -h * 0.5],
    ],
    x0 + w * 0.25,
    y0,
    [1, 1],
    "F",
    true
  );
}

export default function EquipoPanel({ departamento }: { departamento: string }) {
  const t = useTranslations("equipo");
  const { grupos, loading } = useEquipoProyecto();
  const [exportando, setExportando] = useState(false);

  async function exportarPDF() {
    setExportando(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const nombreProyecto = localStorage.getItem("cinepack-proyecto") ?? "";
      const marginLeft = 16;
      const marginRight = 194;
      const pageBottom = 280;
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(t("pdfTitle", { proyecto: nombreProyecto }), marginLeft, y);
      y += 10;

      (grupos as GrupoDepartamento[]).forEach((g) => {
        const color = DEPTO_HEX[g.departamento] ?? "#9EEE6A";
        const bandHeight = 9;
        if (y + bandHeight + g.miembros.length * 7 + 6 > pageBottom) {
          doc.addPage();
          y = 20;
        }

        const [r, gg, b] = hexToRgb(color);
        doc.setFillColor(r, gg, b);
        doc.rect(marginLeft, y, marginRight - marginLeft, bandHeight, "F");
        dibujarHexagono(doc, marginLeft + 6, y + bandHeight / 2, 6, 5.2, color);
        doc.setTextColor(13, 13, 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(g.departamento.toUpperCase(), marginLeft + 13, y + bandHeight / 2 + 1.3);
        doc.setFontSize(9);
        doc.text(
          t("memberCount", { n: g.miembros.length }),
          marginRight - 4,
          y + bandHeight / 2 + 1.1,
          { align: "right" }
        );
        y += bandHeight + 4;

        doc.setTextColor(20, 20, 24);
        g.miembros.forEach((m) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(m.full_name, marginLeft + 2, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.text(m.cargo ?? t("noRole"), marginLeft + 78, y);
          if (m.telefono) doc.text(m.telefono, marginRight, y, { align: "right" });
          y += 6.5;
        });
        y += 4;
      });

      const nombreArchivo = (nombreProyecto || "equipo").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      doc.save(`${nombreArchivo}-equipo.pdf`);
    } finally {
      setExportando(false);
    }
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("loading")}</h4>
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>{t("noMembersTitle")}</h4>
        <p>{t("noMembersDesc")}</p>
      </div>
    );
  }

  return (
    <div className="cp-equipo-secciones">
      <div className="cp-equipo-toolbar">
        <button type="button" className="btn" onClick={exportarPDF} disabled={exportando}>
          {exportando ? t("exportingPdf") : t("exportPdf")}
        </button>
      </div>
      {grupos.map((g) => {
        const color = `var(--${ACCENTS[g.departamento] ?? "lime"})`;
        return (
          <div className="cp-equipo-depto" key={g.departamento} style={{ "--depto-color": color, "--acc": color } as React.CSSProperties}>
            <div className="cp-equipo-depto-hexbg" style={{ maskImage: `url("${HEXBG("white")}")`, WebkitMaskImage: `url("${HEXBG("white")}")` }} />
            <div className="cp-equipo-depto-fade" />
            <div className="cp-equipo-depto-body">
              <div className="cp-equipo-depto-head">
                <span className="cp-equipo-depto-seal"><Icon name={ICON_POR_DEPTO[g.departamento] ?? "users"} size={13} /></span>
                <span className="cp-equipo-depto-nombre">{g.departamento}</span>
                {g.departamento === departamento && <span className="hp-mine">{t("yourDept")}</span>}
                <span className="cp-equipo-depto-count">{t("memberCount", { n: g.miembros.length })}</span>
              </div>
              <ul className="cp-equipo-depto-lista">
                {g.miembros.map((m) => (
                  <li key={m.user_id}>
                    <span className="cp-equipo-depto-rol">{m.cargo ?? t("noRole")}</span>
                    <span className="cp-equipo-depto-persona">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="cp-equipo-depto-avatar" />
                      ) : (
                        <span className="cp-equipo-depto-avatar cp-equipo-depto-avatar-iniciales">
                          {m.full_name.trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {m.full_name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
