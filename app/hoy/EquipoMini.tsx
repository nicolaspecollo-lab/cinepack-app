"use client";

import { useEquipo } from "./useEquipo";

export default function EquipoMini({ departamento }: { departamento: string }) {
  const { miembros, loading } = useEquipo(departamento);

  if (loading || miembros.length === 0) return null;

  return (
    <div className="cp-team-mini">
      {miembros.map((m) => (
        <div className="cp-team-mini-row" key={m.user_id}>
          {m.avatar_url ? (
            <img src={m.avatar_url} alt="" className="cp-team-mini-avatar" />
          ) : (
            <span className="cp-team-mini-avatar cp-team-mini-avatar-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </span>
          )}
          <span>
            <b>{m.full_name}</b> · {m.cargo ?? "Sin cargo"}
          </span>
        </div>
      ))}
    </div>
  );
}
