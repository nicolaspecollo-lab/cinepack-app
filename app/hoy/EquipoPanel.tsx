"use client";

import { useEquipo } from "./useEquipo";

export default function EquipoPanel({ departamento }: { departamento: string }) {
  const { miembros, loading } = useEquipo(departamento);

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando equipo…</h4>
      </div>
    );
  }

  if (miembros.length === 0) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Sin integrantes todavía</h4>
        <p>Cuando se sumen personas a este departamento en el proyecto, aparecerán aquí ordenadas por jerarquía.</p>
      </div>
    );
  }

  return (
    <div className="cp-team-list">
      {miembros.map((m) => (
        <div className="cp-team-row" key={m.user_id}>
          {m.avatar_url ? (
            <img src={m.avatar_url} alt="" className="cp-team-avatar" />
          ) : (
            <span className="cp-team-avatar cp-team-avatar-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </span>
          )}
          <span className="cp-team-name">{m.full_name}</span>
          <span className="cp-team-cargo">{m.cargo ?? "Sin cargo asignado"}</span>
        </div>
      ))}
    </div>
  );
}
