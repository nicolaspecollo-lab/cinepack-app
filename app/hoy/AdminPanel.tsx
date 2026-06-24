"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JERARQUIA_POR_DEPARTAMENTO } from "../constants";
import { CICLO_SELECT, ETAPAS, fechasCicloDesdeFila, type FechasCiclo } from "./cicloVida";

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

  const [fechasCiclo, setFechasCiclo] = useState<FechasCiclo>({
    desarrollo: null, financiacion: null, preproduccion: null, rodaje: null, postproduccion: null, distribucion: null,
  });
  const [savingCiclo, setSavingCiclo] = useState(false);
  const [cicloMsg, setCicloMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
      .select(CICLO_SELECT)
      .eq("id", projectId)
      .single();
    if (proyecto) {
      setFechasCiclo(fechasCicloDesdeFila(proyecto));
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

  async function guardarCiclo(e: React.FormEvent) {
    e.preventDefault();
    if (!proyectoId) return;
    setSavingCiclo(true);
    setCicloMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("proyectos")
      .update({
        fase_desarrollo_inicio: fechasCiclo.desarrollo || null,
        fase_financiacion_inicio: fechasCiclo.financiacion || null,
        fase_preproduccion_inicio: fechasCiclo.preproduccion || null,
        fase_rodaje_inicio: fechasCiclo.rodaje || null,
        fase_postproduccion_inicio: fechasCiclo.postproduccion || null,
        fase_distribucion_inicio: fechasCiclo.distribucion || null,
      })
      .eq("id", proyectoId);
    setSavingCiclo(false);
    if (error) {
      setCicloMsg({ type: "err", text: error.message });
      return;
    }
    setCicloMsg({ type: "ok", text: "Ciclo de vida actualizado." });
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
    <div className="admin-wrap">
      <section className="apanel">
        <h3><span className="hex"></span>Ciclo de vida del proyecto</h3>
        <p className="asub">Definí la fecha de inicio de cada etapa. El fin de una etapa es el inicio de la siguiente; la app calcula sola la etapa actual y cuántos días lleva.</p>
        <form onSubmit={guardarCiclo} className="afields-grid">
          {ETAPAS.map((etapa) => (
            <label className="afield" key={etapa.key}>
              <span>{etapa.label}</span>
              <input
                type="date"
                value={fechasCiclo[etapa.key] ?? ""}
                onChange={(e) => setFechasCiclo((f) => ({ ...f, [etapa.key]: e.target.value || null }))}
              />
            </label>
          ))}
          <div className="afield-span2">
            {cicloMsg && <p className={`amsg ${cicloMsg.type === "err" ? "err" : "ok"}`}>{cicloMsg.text}</p>}
            <button type="submit" className="btn acc" disabled={savingCiclo}>
              {savingCiclo ? "Guardando…" : "Guardar ciclo de vida"}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>Supervisión general — miembros por departamento</h3>
        <div className="akpi-grid">
          {Object.entries(conteosDepto).map(([depto, count]) => (
            <div key={depto} className="akpi">
              <div className="akpi-label">{depto}</div>
              <div className="akpi-num">{count}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>Estadísticas de cargos</h3>
        <div className="acargo-chips">
          {Object.entries(conteosCargo).length === 0 ? (
            <span className="acargo-empty">Sin cargos asignados todavía</span>
          ) : (
            Object.entries(conteosCargo).map(([cargo, count]) => (
              <span key={cargo} className="acargo-chip">
                {cargo}<b>{count}</b>
              </span>
            ))
          )}
        </div>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>Asignar cargo compartido</h3>
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
            <button type="submit" className="btn acc" disabled={asignando || !asignarUserId || !asignarCargo}>
              {asignando ? "Asignando…" : "Asignar cargo"}
            </button>
          </div>
        </form>
      </section>

      <section className="apanel">
        <h3><span className="hex"></span>Acciones de cambios — log de ediciones recientes</h3>
        <div className="alog">
          {cambios.length === 0 ? (
            <span className="alog-empty">Sin cambios registrados</span>
          ) : (
            cambios.map((c, i) => (
              <div key={i} className="alog-item">
                <b>{c.user_nombre}</b> cambió {c.campo}
                <div className="alog-detail">
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
