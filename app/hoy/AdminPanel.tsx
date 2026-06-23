"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";

type Cambio = {
  user_nombre: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  created_at: string;
};

type Miembro = { user_id: string; full_name: string; departamento: string };

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [faseActual, setFaseActual] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [estadoMsg, setEstadoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [conteosDepto, setConteosDepto] = useState<Record<string, number>>({});
  const [conteosCargo, setConteosCargo] = useState<Record<string, number>>({});
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);

  const [asignarUserId, setAsignarUserId] = useState("");
  const [asignarDepto, setAsignarDepto] = useState("");
  const [asignarCargo, setAsignarCargo] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [asignarMsg, setAsignarMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? "ayer" : `hace ${d} días`;
  }

  async function load() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setLoading(false);
      return;
    }
    setProyectoId(projectId);
    const supabase = createClient();

    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("fase_actual, fecha_inicio, fecha_fin")
      .eq("id", projectId)
      .single();
    if (proyecto) {
      setFaseActual(proyecto.fase_actual ?? "");
      setFechaInicio(proyecto.fecha_inicio ?? "");
      setFechaFin(proyecto.fecha_fin ?? "");
    }

    const { data: members } = await supabase
      .from("project_members")
      .select("user_id, profiles(full_name, departamento)")
      .eq("project_id", projectId);
    const listaMiembros = (members ?? [])
      .map((row) => {
        const p = row.profiles as unknown as { full_name: string; departamento: string } | null;
        if (!p) return null;
        return { user_id: row.user_id as string, full_name: p.full_name, departamento: p.departamento };
      })
      .filter((m): m is Miembro => m !== null);
    setMiembros(listaMiembros);

    const cDepto: Record<string, number> = {};
    for (const m of listaMiembros) cDepto[m.departamento] = (cDepto[m.departamento] ?? 0) + 1;
    setConteosDepto(cDepto);

    const userIds = listaMiembros.map((m) => m.user_id);
    if (userIds.length > 0) {
      const { data: roles } = await supabase.from("user_roles").select("cargo").in("user_id", userIds);
      const cCargo: Record<string, number> = {};
      for (const r of roles ?? []) cCargo[r.cargo] = (cCargo[r.cargo] ?? 0) + 1;
      setConteosCargo(cCargo);
    }

    const { data: cambiosData } = await supabase
      .from("perfil_cambios")
      .select("user_nombre, campo, valor_anterior, valor_nuevo, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setCambios(cambiosData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function guardarEstado(e: React.FormEvent) {
    e.preventDefault();
    if (!proyectoId) return;
    setSavingEstado(true);
    setEstadoMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("proyectos")
      .update({
        fase_actual: faseActual || null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
      })
      .eq("id", proyectoId);
    setSavingEstado(false);
    if (error) {
      setEstadoMsg({ type: "err", text: error.message });
      return;
    }
    setEstadoMsg({ type: "ok", text: "Estado del proyecto actualizado." });
  }

  async function asignarCargoCompartido(e: React.FormEvent) {
    e.preventDefault();
    if (!asignarUserId || !asignarCargo) return;
    setAsignando(true);
    setAsignarMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("user_roles").insert({ user_id: asignarUserId, cargo: asignarCargo });
    setAsignando(false);
    if (error) {
      setAsignarMsg({ type: "err", text: error.code === "23505" ? "Ese usuario ya tiene ese cargo." : error.message });
      return;
    }
    setAsignarMsg({ type: "ok", text: "Cargo asignado correctamente." });
    setAsignarCargo("");
    await load();
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando panel…</h4>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section className="apanel">
        <h3>📅 Estado general del proyecto</h3>
        <form onSubmit={guardarEstado} className="afields-grid">
          <label className="afield">
            <span>Fase actual</span>
            <input type="text" value={faseActual} onChange={(e) => setFaseActual(e.target.value)} placeholder="Ej. Preproducción, Rodaje, Postproducción…" />
          </label>
          <label className="afield">
            <span>Fecha de inicio</span>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </label>
          <label className="afield">
            <span>Fecha de fin</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </label>
          <div className="afield-span2">
            {estadoMsg && <p className={`amsg ${estadoMsg.type === "err" ? "err" : "ok"}`}>{estadoMsg.text}</p>}
            <button type="submit" className="abtn" disabled={savingEstado} style={{ marginTop: "8px" }}>
              {savingEstado ? "Guardando…" : "Guardar estado"}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3>👥 Supervisión general — miembros por departamento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {Object.entries(conteosDepto).map(([depto, count]) => (
            <div key={depto} style={{ background: "var(--hl3)", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>
                {depto}
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--lime)" }}>{count}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="apanel">
        <h3>🎬 Estadísticas de cargos</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {Object.entries(conteosCargo).length === 0 ? (
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Sin cargos asignados todavía</span>
          ) : (
            Object.entries(conteosCargo).map(([cargo, count]) => (
              <span key={cargo} style={{ background: "var(--hl3)", padding: "6px 12px", borderRadius: "4px", border: "1px solid var(--line)", fontSize: "13px" }}>
                {cargo} <b style={{ color: "var(--cyan)" }}>{count}</b>
              </span>
            ))
          )}
        </div>
      </section>

      <section className="apanel">
        <h3>➕ Asignar cargo compartido</h3>
        <p className="asub">Suma un cargo adicional a un usuario que ya cumple más de un rol en el equipo.</p>
        <form onSubmit={asignarCargoCompartido} className="afields-grid">
          <label className="afield">
            <span>Usuario</span>
            <select value={asignarUserId} onChange={(e) => setAsignarUserId(e.target.value)}>
              <option value="">Selecciona…</option>
              {miembros.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.departamento})</option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Departamento del cargo</span>
            <select value={asignarDepto} onChange={(e) => { setAsignarDepto(e.target.value); setAsignarCargo(""); }}>
              <option value="">Selecciona…</option>
              {Object.keys(JERARQUIA_POR_DEPARTAMENTO).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Cargo</span>
            <select value={asignarCargo} onChange={(e) => setAsignarCargo(e.target.value)} disabled={!asignarDepto}>
              <option value="">Selecciona…</option>
              {(JERARQUIA_POR_DEPARTAMENTO[asignarDepto] ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="afield-span2">
            {asignarMsg && <p className={`amsg ${asignarMsg.type === "err" ? "err" : "ok"}`}>{asignarMsg.text}</p>}
            <button type="submit" className="abtn" disabled={asignando || !asignarUserId || !asignarCargo} style={{ marginTop: "8px" }}>
              {asignando ? "Asignando…" : "Asignar cargo"}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3>📝 Acciones de cambios — log de ediciones recientes</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "360px", overflowY: "auto" }}>
          {cambios.length === 0 ? (
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Sin cambios registrados</span>
          ) : (
            cambios.map((c, i) => (
              <div key={i} style={{ fontSize: "12px", padding: "8px", background: "var(--hl3)", borderRadius: "4px", borderLeft: "2px solid var(--lime)" }}>
                <span style={{ fontWeight: "600" }}>{c.user_nombre}</span> cambió <span style={{ color: "var(--cyan)" }}>{c.campo}</span>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  {c.valor_anterior} → {c.valor_nuevo} · {timeAgo(c.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
