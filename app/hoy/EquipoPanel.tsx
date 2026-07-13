"use client";

import { useTranslations } from "next-intl";
import { useEquipoProyecto } from "./useEquipoProyecto";
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

export default function EquipoPanel({ departamento }: { departamento: string }) {
  const t = useTranslations("equipo");
  const { grupos, loading } = useEquipoProyecto();

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
