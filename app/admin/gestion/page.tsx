"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGuard } from "../useAdminGuard";
import AdminShell from "../AdminShell";

type Plan = { id: string; name: string; price: number; features: string[]; active: boolean };

type Transaccion = {
  id: string;
  usuario: string;
  plan: string;
  importe: number;
  estado: "pagado" | "pendiente" | "fallido";
  fecha: string;
};

// TODO: conectar a la pasarela de pago (Stripe u otra) cuando esté decidida.
// Hasta entonces, estos son datos de ejemplo para tener la UI lista.
const RESUMEN_MOCK = {
  ingresosMesActual: 0,
  ingresosMesAnterior: 0,
  suscripcionesActivas: 0,
  suscripcionesCanceladasEsteMes: 0,
};

// TODO: conectar a la pasarela de pago — reemplazar por transacciones reales.
const TRANSACCIONES_MOCK: Transaccion[] = [];

const ESTADO_BADGE: Record<Transaccion["estado"], string> = {
  pagado: "ok",
  pendiente: "warn",
  fallido: "pend",
};

export default function AdminGestion() {
  const { checking, isAdmin } = useAdminGuard();
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevoFeatures, setNuevoFeatures] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | Transaccion["estado"]>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, name, price, features, active")
      .order("created_at", { ascending: true });
    if (error) throw error;
    setPlanes((data ?? []).map((p) => ({ ...p, features: (p.features as string[]) ?? [] })));
  }

  useEffect(() => {
    if (!isAdmin) return;
    load().catch((e) => setErr(e.message));
  }, [isAdmin]);

  async function togglePlan(p: Plan) {
    setBusy(p.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("subscription_plans").update({ active: !p.active }).eq("id", p.id);
      if (error) throw error;
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function agregarPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoPrecio.trim()) return;
    setBusy("nuevo");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("subscription_plans").insert({
        name: nuevoNombre.trim(),
        price: Number(nuevoPrecio),
        features: nuevoFeatures.split(",").map((f) => f.trim()).filter(Boolean),
      });
      if (error) throw error;
      setNuevoNombre("");
      setNuevoPrecio("");
      setNuevoFeatures("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const transacciones = useMemo(() => {
    return TRANSACCIONES_MOCK.filter((t) => {
      if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false;
      if (desde && t.fecha < desde) return false;
      if (hasta && t.fecha > hasta) return false;
      return true;
    });
  }, [filtroEstado, desde, hasta]);

  function exportarCSV() {
    const filas = [
      ["Usuario", "Plan", "Importe", "Estado", "Fecha"],
      ...transacciones.map((t) => [t.usuario, t.plan, t.importe.toFixed(2), t.estado, t.fecha]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checking) return null;

  return (
    <AdminShell>
      {err && <div className="cp-admin-err">{err}</div>}

      <div className="cp-admin-kpis">
        <div className="cp-admin-kpi">
          <span className="num">{RESUMEN_MOCK.ingresosMesActual.toLocaleString("es-ES")} €</span>
          <span className="label">Ingresos del mes actual</span>
        </div>
        <div className="cp-admin-kpi">
          <span className="num">{RESUMEN_MOCK.ingresosMesAnterior.toLocaleString("es-ES")} €</span>
          <span className="label">Ingresos del mes anterior</span>
        </div>
        <div className="cp-admin-kpi">
          <span className="num">{RESUMEN_MOCK.suscripcionesActivas}</span>
          <span className="label">Suscripciones activas</span>
        </div>
        <div className="cp-admin-kpi">
          <span className="num">{RESUMEN_MOCK.suscripcionesCanceladasEsteMes}</span>
          <span className="label">Canceladas este mes</span>
        </div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "12px", margin: "-6px 0 16px" }}>
        Datos de ejemplo — se conectan a la pasarela de pago cuando esté decidida.
      </p>

      <div className="cp-admin-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Transacciones ({transacciones.length})</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }}
            >
              <option value="todos">Todos los estados</option>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="fallido">Fallido</option>
            </select>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }} />
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }} />
            <button className="btn" onClick={exportarCSV} disabled={transacciones.length === 0}>Exportar CSV</button>
          </div>
        </div>

        {transacciones.length === 0 ? (
          <div className="cp-admin-empty">
            Sin transacciones todavía — esta sección se llena automáticamente cuando se conecte la pasarela de pago.
          </div>
        ) : (
          <table className="cp-admin-table">
            <thead>
              <tr><th>Usuario</th><th>Plan</th><th>Importe</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {transacciones.map((t) => (
                <tr key={t.id}>
                  <td>{t.usuario}</td>
                  <td>{t.plan}</td>
                  <td>{t.importe.toFixed(2)} €</td>
                  <td><span className={`cp-admin-badge ${ESTADO_BADGE[t.estado]}`}>{t.estado}</span></td>
                  <td>{new Date(t.fecha).toLocaleDateString("es-ES")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cp-admin-section">
        <h3>Planes</h3>
        <p style={{ color: "var(--muted)", fontSize: "12.5px", marginBottom: "16px" }}>
          Habilitar/deshabilitar es solo un flag en la base — todavía no hay pasarela de pago conectada,
          así que no cobra nada automáticamente.
        </p>

        {planes === null && !err && <div className="cp-admin-empty">Cargando…</div>}
        {planes?.length === 0 && <div className="cp-admin-empty">Sin planes configurados todavía.</div>}

        {planes && planes.length > 0 && (
          <table className="cp-admin-table" style={{ marginBottom: "16px" }}>
            <thead>
              <tr><th>Nombre</th><th>Precio</th><th>Features</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {planes.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.price.toFixed(2)} €</td>
                  <td>{p.features.join(", ") || "—"}</td>
                  <td><span className={`cp-admin-badge ${p.active ? "ok" : "pend"}`}>{p.active ? "habilitado" : "deshabilitado"}</span></td>
                  <td>
                    <button className="btn" disabled={busy === p.id} onClick={() => togglePlan(p)}>
                      {p.active ? "Deshabilitar" : "Habilitar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={agregarPlan} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Nombre del plan"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px" }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio"
            value={nuevoPrecio}
            onChange={(e) => setNuevoPrecio(e.target.value)}
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px", width: "100px" }}
          />
          <input
            type="text"
            placeholder="Features separadas por coma"
            value={nuevoFeatures}
            onChange={(e) => setNuevoFeatures(e.target.value)}
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontSize: "12.5px", minWidth: "220px" }}
          />
          <button type="submit" className="btn" disabled={busy === "nuevo"}>+ Agregar plan</button>
        </form>
      </div>
    </AdminShell>
  );
}
