"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "../cp-theme.css";

type Cambio = {
  user_nombre: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  created_at: string;
};

export default function PanelEjecutivo() {
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const projectId = localStorage.getItem("cinepack-proyecto-id");
      if (!projectId) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Log de cambios
      const { data: cambiosData } = await supabase
        .from("perfil_cambios")
        .select("user_nombre, campo, valor_anterior, valor_nuevo, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setCambios(cambiosData ?? []);

      // Conteos de usuarios por departamento
      const { data: members } = await supabase
        .from("project_members")
        .select("id, profiles(departamento)")
        .eq("project_id", projectId);

      const c: Record<string, number> = {};
      for (const m of members ?? []) {
        const p = m.profiles as unknown as { departamento: string } | null;
        if (p) c[p.departamento] = (c[p.departamento] ?? 0) + 1;
      }
      setConteos(c);

      setLoading(false);
    })();
  }, []);

  function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? "ayer" : `hace ${d} días`;
  }

  if (loading) {
    return <div className="soon-box"><span className="hex"></span><h4>Cargando…</h4></div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>📊 Panel del Productor Ejecutivo</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "30px" }}>
        {Object.entries(conteos).map(([depto, count]) => (
          <div key={depto} style={{ background: "var(--hl3)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "600", marginBottom: "8px" }}>
              {depto}
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--lime)" }}>{count}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>usuario{count !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--hl1)", padding: "20px", borderRadius: "6px", border: "1px solid var(--line)" }}>
        <h3 style={{ marginBottom: "12px" }}>📝 Últimos cambios de perfil</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
          {cambios.length === 0 ? (
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Sin cambios registrados</span>
          ) : (
            cambios.map((c, i) => (
              <div key={i} style={{ fontSize: "12px", color: "var(--text)", padding: "8px", background: "var(--bg)", borderRadius: "4px", borderLeft: "2px solid var(--lime)" }}>
                <span style={{ fontWeight: "600" }}>{c.user_nombre}</span> cambió <span style={{ color: "var(--cyan)" }}>{c.campo}</span>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  {c.valor_anterior} → {c.valor_nuevo} · {timeAgo(c.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
