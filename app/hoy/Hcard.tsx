"use client";

import Icon from "../components/Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

// Tarjeta de herramienta — sello hexagonal con el ícono del tipo (100%
// embebido en la cabecera, no recortado), panal de fondo del color de
// departamento con degradado hacia abajo, contenido (descripción + footer)
// expandido a la derecha. Usada por HerramientasPanel.tsx (Departamento/
// Exclusivas/Personal) y GeneralesPanel.tsx (Generales) para no duplicar
// el shell visual en los 3 lugares.
export default function Hcard({
  icon,
  title,
  desc,
  footer,
  locked,
  soonLabel,
  personal,
  badgeCount,
  footerSplit,
  onClick,
}: {
  icon: IconName;
  title: string;
  desc?: string;
  footer?: React.ReactNode;
  locked?: boolean;
  soonLabel?: string;
  personal?: boolean;
  badgeCount?: number;
  footerSplit?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`hcard${locked ? " hcard-locked" : ""}${personal ? " hcard-personal" : ""}`}
      onClick={locked ? undefined : onClick}
      aria-disabled={locked}
    >
      <div className="hcard-hexbg" />
      <div className="hcard-fade" />
      {!!badgeCount && <span className="wtab-badge hcard-notif">{badgeCount}</span>}
      <div className="hcard-body">
        <div className="hcard-head">
          <span className="hcard-seal"><Icon name={icon} size={14} /></span>
          <span className="hcard-title">{title}</span>
        </div>
        {desc && <div className="hcard-desc">{desc}</div>}
        {footer && <div className={`hcard-footer${footerSplit ? " hcard-footer-split" : ""}`}>{footer}</div>}
      </div>
      {soonLabel && (
        <div className="hcard-soon">
          <span>{soonLabel}</span>
        </div>
      )}
    </button>
  );
}
