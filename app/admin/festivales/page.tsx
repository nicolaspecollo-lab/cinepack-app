"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

/**
 * Distribución en festivales. Ruta NO listada en el nav de AdminShell:
 * se entra solo por URL directa (/admin/festivales). Herramienta interna,
 * por eso el texto va en español fijo y no pasa por next-intl.
 */

type Clase = "A" | "B" | "C";

type Fila = {
  id: string;
  proyecto: string;
  festival: string;
  pais: string | null;
  clase: Clase;
  plataforma: string | null;
  fee: string | null;
  anios_activo: string | null;
  deadline: string | null;
  categoria: string | null;
  estado: string;
  fecha_registro: string | null;
  resultado: string | null;
  nota: string | null;
};

const CLASES: { clase: Clase; titulo: string; desc: string }[] = [
  { clase: "A", titulo: "Clase A — Oscar-qualifying", desc: "Ganar aquí da elegibilidad directa a los Premios de la Academia. Fees altas: reservar para 3-5 apuestas selectivas." },
  { clase: "B", titulo: "Clase B — No calificador, +10 años", desc: "Prestigio real construido con décadas de historia, aunque no den elegibilidad al Oscar." },
  { clase: "C", titulo: "Clase C — No calificador, joven/indie", desc: "Menos de 10 años o sin trayectoria consolidada. Volumen y exposición de bajo riesgo." },
];

const ESTADOS = ["pendiente", "registrado", "aceptado", "rechazado", "seleccionado", "cerrado", "descartado"] as const;

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  registrado: "Registrado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  seleccionado: "Seleccionado",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

const ESTADO_TONO: Record<string, string> = {
  pendiente: "warn",
  registrado: "ok",
  aceptado: "ok",
  seleccionado: "ok",
  rechazado: "pend",
  cerrado: "pend",
  descartado: "muted",
};

const VACIO = {
  festival: "",
  pais: "",
  clase: "C" as Clase,
  plataforma: "",
  fee: "",
  anios_activo: "",
  deadline: "",
  categoria: "",
  estado: "pendiente",
  nota: "",
};

export default function AdminFestivales() {
  const { checking, isAdmin } = useAdminGuard();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [proyecto, setProyecto] = useState<string>("127");
  const [nuevo, setNuevo] = useState({ ...VACIO });
  const [guardando, setGuardando] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("festival_submissions")
      .select("*")
      .order("clase")
      .order("festival");
    if (error) throw error;
    setFilas((data ?? []) as Fila[]);
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin]);

  const proyectos = useMemo(() => {
    const set = new Set((filas ?? []).map((f) => f.proyecto));
    set.add("127");
    return [...set].sort();
  }, [filas]);

  const delProyecto = useMemo(
    () => (filas ?? []).filter((f) => f.proyecto === proyecto),
    [filas, proyecto]
  );

  const cuenta = useMemo(() => {
    const esRegistrado = (f: Fila) => ["registrado", "aceptado", "seleccionado"].includes(f.estado);
    const por = (c: Clase) => delProyecto.filter((f) => f.clase === c);
    return {
      total: delProyecto.length,
      registrados: delProyecto.filter(esRegistrado).length,
      A: { total: por("A").length, reg: por("A").filter(esRegistrado).length },
      B: { total: por("B").length, reg: por("B").filter(esRegistrado).length },
      C: { total: por("C").length, reg: por("C").filter(esRegistrado).length },
    };
  }, [delProyecto]);

  async function cambiarEstado(id: string, estado: string) {
    const supabase = createClient();
    const patch: Record<string, unknown> = { estado, updated_at: new Date().toISOString() };
    if (estado === "registrado") patch.fecha_registro = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("festival_submissions").update(patch).eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    setFilas((prev) =>
      prev
        ? prev.map((f) =>
            f.id === id
              ? { ...f, estado, fecha_registro: (patch.fecha_registro as string) ?? f.fecha_registro }
              : f
          )
        : prev
    );
  }

  async function borrar(id: string, festival: string) {
    if (!confirm(`¿Quitar "${festival}" de la lista?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("festival_submissions").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    setFilas((prev) => (prev ? prev.filter((f) => f.id !== id) : prev));
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.festival.trim()) return;
    setGuardando(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("festival_submissions")
      .insert({
        proyecto,
        festival: nuevo.festival.trim(),
        pais: nuevo.pais.trim() || null,
        clase: nuevo.clase,
        plataforma: nuevo.plataforma.trim() || null,
        fee: nuevo.fee.trim() || null,
        anios_activo: nuevo.anios_activo.trim() || null,
        deadline: nuevo.deadline || null,
        categoria: nuevo.categoria.trim() || null,
        estado: nuevo.estado,
        fecha_registro: nuevo.estado === "registrado" ? new Date().toISOString().slice(0, 10) : null,
        nota: nuevo.nota.trim() || null,
      })
      .select()
      .single();
    setGuardando(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setFilas((prev) => [...(prev ?? []), data as Fila]);
    setNuevo({ ...VACIO, clase: nuevo.clase });
  }

  if (checking) return null;

  const registrados = delProyecto
    .filter((f) => ["registrado", "aceptado", "seleccionado"].includes(f.estado))
    .sort((a, b) => (b.fecha_registro ?? "").localeCompare(a.fecha_registro ?? ""));

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}

      <div className="cp-admin-section">
        <h3>Distribución en festivales</h3>
        <p style={{ color: "var(--muted)", fontSize: "12.5px", marginBottom: "16px" }}>
          Clase A = Oscar-qualifying · Clase B = no calificador con más de 10 años ·
          Clase C = no calificador, joven o indie.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px" }}>
          <span style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>
            Proyecto
          </span>
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            style={{ padding: "7px 10px", background: "var(--panel)", color: "inherit", border: "1px solid var(--line)", fontSize: "12.5px" }}
          >
            {proyectos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cp-admin-kpis">
        <div className="cp-admin-kpi">
          <span className="num">
            {cuenta.registrados}/{cuenta.total}
          </span>
          <span className="label">Registrados / en radar</span>
        </div>
        {(["A", "B", "C"] as Clase[]).map((c) => (
          <div className="cp-admin-kpi" key={c}>
            <span className="num">
              {cuenta[c].reg}/{cuenta[c].total}
            </span>
            <span className="label">Clase {c}</span>
          </div>
        ))}
      </div>

      <div className="cp-admin-section">
        <h3>Estado de envío</h3>
        {registrados.length === 0 ? (
          <div className="cp-admin-empty">Todavía no hay inscripciones registradas en este proyecto.</div>
        ) : (
          <table className="cp-admin-table">
            <thead>
              <tr>
                <th>Clase</th>
                <th>Festival</th>
                <th>País</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {registrados.map((f) => (
                <tr key={f.id}>
                  <td>
                    <strong>{f.clase}</strong>
                  </td>
                  <td style={{ fontWeight: 600 }}>{f.festival}</td>
                  <td style={{ color: "var(--muted)" }}>{f.pais ?? "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{f.categoria ?? "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{f.fecha_registro ?? "—"}</td>
                  <td>
                    <span className={`cp-admin-badge ${ESTADO_TONO[f.estado] ?? "muted"}`}>
                      {ESTADO_LABEL[f.estado] ?? f.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {CLASES.map(({ clase, titulo, desc }) => {
        const grupo = delProyecto.filter((f) => f.clase === clase);
        return (
          <div className="cp-admin-section" key={clase}>
            <h3>{titulo}</h3>
            <p style={{ color: "var(--muted)", fontSize: "12.5px", marginBottom: "16px" }}>{desc}</p>
            {grupo.length === 0 ? (
              <div className="cp-admin-empty">Sin festivales en esta clase.</div>
            ) : (
              <table className="cp-admin-table">
                <thead>
                  <tr>
                    <th>Festival</th>
                    <th>País</th>
                    <th>Plataforma</th>
                    <th>Fee</th>
                    <th>Años</th>
                    <th>Deadline</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{f.festival}</div>
                        {f.nota && (
                          <div style={{ color: "var(--muted)", fontSize: "11.5px", marginTop: "2px" }}>{f.nota}</div>
                        )}
                      </td>
                      <td style={{ color: "var(--muted)" }}>{f.pais ?? "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{f.plataforma ?? "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{f.fee ?? "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{f.anios_activo ?? "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{f.deadline ?? "—"}</td>
                      <td>
                        <select
                          value={f.estado}
                          onChange={(e) => cambiarEstado(f.id, e.target.value)}
                          className={`cp-admin-badge ${ESTADO_TONO[f.estado] ?? "muted"}`}
                          style={{ border: "1px solid var(--line)", cursor: "pointer" }}
                          aria-label={`Estado de ${f.festival}`}
                        >
                          {ESTADOS.map((s) => (
                            <option key={s} value={s}>
                              {ESTADO_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => borrar(f.id, f.festival)}
                          style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "14px" }}
                          aria-label={`Quitar ${f.festival}`}
                          title="Quitar de la lista"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <div className="cp-admin-section">
        <h3>Añadir festival</h3>
        <form
          onSubmit={agregar}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "14px", alignItems: "end" }}
        >
          <Campo label="Nombre del festival" required>
            <input value={nuevo.festival} onChange={(e) => setNuevo({ ...nuevo, festival: e.target.value })} required />
          </Campo>
          <Campo label="País">
            <input value={nuevo.pais} onChange={(e) => setNuevo({ ...nuevo, pais: e.target.value })} />
          </Campo>
          <Campo label="Clase">
            <select value={nuevo.clase} onChange={(e) => setNuevo({ ...nuevo, clase: e.target.value as Clase })}>
              <option value="A">A — Oscar-qualifying</option>
              <option value="B">B — No calificador, +10 años</option>
              <option value="C">C — No calificador, joven/indie</option>
            </select>
          </Campo>
          <Campo label="Plataforma">
            <input
              value={nuevo.plataforma}
              onChange={(e) => setNuevo({ ...nuevo, plataforma: e.target.value })}
              placeholder="FilmFreeway / Festhome"
            />
          </Campo>
          <Campo label="Fee">
            <input value={nuevo.fee} onChange={(e) => setNuevo({ ...nuevo, fee: e.target.value })} placeholder="Gratis / $45" />
          </Campo>
          <Campo label="Años activo">
            <input value={nuevo.anios_activo} onChange={(e) => setNuevo({ ...nuevo, anios_activo: e.target.value })} placeholder="~20" />
          </Campo>
          <Campo label="Deadline">
            <input type="date" value={nuevo.deadline} onChange={(e) => setNuevo({ ...nuevo, deadline: e.target.value })} />
          </Campo>
          <Campo label="Categoría inscrita">
            <input
              value={nuevo.categoria}
              onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
              placeholder="Estreno Mundial"
            />
          </Campo>
          <Campo label="Estado">
            <select value={nuevo.estado} onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_LABEL[s]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Nota">
            <input value={nuevo.nota} onChange={(e) => setNuevo({ ...nuevo, nota: e.target.value })} />
          </Campo>
          <button
            type="submit"
            disabled={guardando || !nuevo.festival.trim()}
            style={{
              padding: "9px 18px",
              border: "1px solid var(--line)",
              background: "var(--acc,var(--lime))",
              color: "#14151A",
              fontWeight: 700,
              fontSize: "11.5px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: guardando ? "default" : "pointer",
              opacity: guardando || !nuevo.festival.trim() ? 0.5 : 1,
            }}
          >
            {guardando ? "Guardando…" : "Añadir"}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          marginBottom: "6px",
        }}
      >
        {label}
        {required && " *"}
      </span>
      <span className="cp-festival-campo">{children}</span>
      <style jsx>{`
        .cp-festival-campo :global(input),
        .cp-festival-campo :global(select) {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--line);
          background: var(--panel);
          color: inherit;
          font-size: 12.5px;
          font-family: inherit;
          appearance: none;
        }
      `}</style>
    </label>
  );
}
