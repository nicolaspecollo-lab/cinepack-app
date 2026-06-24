"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Fila = {
  id: string;
  content: string;
  resuelto: boolean;
  created_at: string;
  user_id: string | null;
  profiles: { full_name: string | null } | null;
};

export default function AdminFeedback() {
  const { checking, isAdmin } = useAdminGuard();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"abierto" | "todos">("abierto");

  async function load() {
    const supabase = createClient();
    let query = supabase
      .from("sugerencias")
      .select("id, content, resuelto, created_at, user_id, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (filtro === "abierto") query = query.eq("resuelto", false);
    const { data, error } = await query;
    if (error) throw error;
    setFilas((data ?? []) as unknown as Fila[]);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin, filtro]);

  async function resolver(id: string) {
    const supabase = createClient();
    await supabase.from("sugerencias").update({ resuelto: true }).eq("id", id);
    load().catch((e) => setErr(e.message));
  }

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}
      <div className="cp-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0 }}>Sugerencias / feedback de usuarios</h3>
          <div className="cons-filters" style={{ padding: 0 }}>
            <button className={`cfilter ${filtro === "abierto" ? "active" : ""}`} onClick={() => setFiltro("abierto")}>Pendientes</button>
            <button className={`cfilter ${filtro === "todos" ? "active" : ""}`} onClick={() => setFiltro("todos")}>Todos</button>
          </div>
        </div>
        {filas === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {filas?.length === 0 && <div className="cp-admin-empty">Sin feedback {filtro === "abierto" ? "pendiente" : "todavía"}.</div>}
        {filas?.map((f) => (
          <div key={f.id} className="cons" style={{ marginBottom: "10px" }}>
            <div className="cons-top">
              <div>
                <span className="cons-meta">{f.profiles?.full_name ?? "Usuario"} · {new Date(f.created_at).toLocaleString("es-ES")}</span>
              </div>
              <span className={`cp-admin-badge ${!f.resuelto ? "warn" : "ok"}`}>{f.resuelto ? "resuelto" : "pendiente"}</span>
            </div>
            <div className="cons-text">{f.content}</div>
            {!f.resuelto && (
              <div className="cons-actions">
                <button className="btn acc" onClick={() => resolver(f.id)}>Marcar como resuelto</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
