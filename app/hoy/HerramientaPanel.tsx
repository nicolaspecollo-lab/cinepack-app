"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Herramienta, Columna } from "../herramientas";
import GestionAccesosPanel from "./GestionAccesosPanel";

type Intervencion = { accion: string; usuario: string; fecha: string };
type Visionado = { usuario: string; fecha: string };

type Fila = {
  id: string;
  datos: Record<string, string>;
  orden: number;
  registro: Intervencion[];
  visionado_por: Visionado[];
  autor_nombre: string | null;
  editor_nombre: string | null;
  updated_at: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export default function HerramientaPanel({
  departamento,
  herramienta,
  fullName,
  editable = true,
}: {
  departamento: string;
  herramienta: Herramienta;
  fullName: string;
  editable?: boolean;
}) {
  if (herramienta.tipo === "accesos") {
    return <GestionAccesosPanel departamento={departamento} />;
  }
  return (
    <HerramientaData
      departamento={departamento}
      herramienta={herramienta}
      fullName={fullName}
      editable={editable}
    />
  );
}

function HerramientaData({
  departamento,
  herramienta,
  fullName,
  editable,
}: {
  departamento: string;
  herramienta: Herramienta;
  fullName: string;
  editable: boolean;
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [meta, setMeta] = useState<Fila | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const esMulti = herramienta.tipo === "tabla" || herramienta.tipo === "galeria";
  const esSingle = herramienta.tipo === "nota" || herramienta.tipo === "checklist" || herramienta.tipo === "ficha";

  const load = useCallback(async () => {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError("No hay proyecto activo (localStorage cinepack-proyecto-id). Volvé a iniciar sesión.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .select("*")
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .eq("herramienta_id", herramienta.id)
      .order("orden", { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Fila[];
    if (esMulti) {
      setMeta(rows.find((r) => r.orden === -1) ?? null);
      setFilas(rows.filter((r) => r.orden !== -1));
    } else {
      setFilas(rows);
    }
    setLoading(false);
  }, [departamento, herramienta.id, esMulti]);

  useEffect(() => {
    load();
  }, [load]);

  async function crearFila(datosIniciales: Record<string, string>, ordenForzado?: number) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError("No hay proyecto activo (localStorage cinepack-proyecto-id). Volvé a iniciar sesión.");
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orden = ordenForzado ?? (filas.length ? Math.max(...filas.map((f) => f.orden)) + 1 : 0);
    const registro: Intervencion[] = [{ accion: "crea", usuario: fullName, fecha: new Date().toISOString() }];
    const { data, error: err } = await supabase
      .from("herramienta_filas")
      .insert({
        project_id: projectId,
        departamento,
        herramienta_id: herramienta.id,
        datos: datosIniciales,
        orden,
        registro,
        visionado_por: [],
        created_by: user?.id ?? null,
        autor_nombre: fullName,
        editor_nombre: fullName,
      })
      .select("*")
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (!data) return;
    if (orden === -1) setMeta(data as Fila);
    else setFilas((prev) => [...prev, data as Fila]);
    return data as Fila;
  }

  async function guardarFila(id: string, datos: Record<string, string>) {
    const fila = filas.find((f) => f.id === id) ?? (meta?.id === id ? meta : undefined);
    if (!fila) return;
    const registro = [...(fila.registro ?? []), { accion: "edita", usuario: fullName, fecha: new Date().toISOString() }].slice(-30);
    const updated_at = new Date().toISOString();
    if (meta?.id === id) {
      setMeta((m) => (m ? { ...m, datos, registro, editor_nombre: fullName, updated_at } : m));
    } else {
      setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, datos, registro, editor_nombre: fullName, updated_at } : f)));
    }
    const supabase = createClient();
    const { error: err } = await supabase
      .from("herramienta_filas")
      .update({ datos, registro, editor_nombre: fullName, updated_at })
      .eq("id", id);
    if (err) setError(err.message);
  }

  async function borrarFila(id: string) {
    setFilas((prev) => prev.filter((f) => f.id !== id));
    const supabase = createClient();
    const { error: err } = await supabase.from("herramienta_filas").delete().eq("id", id);
    if (err) setError(err.message);
  }

  async function visionar(id: string) {
    const fila = filas.find((f) => f.id === id);
    if (!fila) return;
    const yaVisto = (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
    const visionado_por = yaVisto
      ? (fila.visionado_por ?? []).filter((v) => v.usuario !== fullName)
      : [...(fila.visionado_por ?? []), { usuario: fullName, fecha: new Date().toISOString() }];
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, visionado_por } : f)));
    const supabase = createClient();
    const { error: err } = await supabase.from("herramienta_filas").update({ visionado_por }).eq("id", id);
    if (err) setError(err.message);
  }

  // Single-instance tools: ensure one fila exists, lazily.
  async function asegurarSingle(): Promise<Fila> {
    if (filas.length > 0) return filas[0];
    const inicial: Record<string, string> =
      herramienta.tipo === "nota" ? { texto: "" } :
      herramienta.tipo === "checklist" ? { items: "[]" } :
      {};
    const f = await crearFila(inicial);
    return f as Fila;
  }

  function slugCampo(label: string) {
    const base = label
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "")
      .slice(0, 24) || "campo";
    return `x_${base}_${Date.now().toString(36).slice(-4)}`;
  }

  // Columnas/campos extra definidas por el usuario (libres, se guardan en datos._extra)
  async function agregarColumnaExtra(label: string) {
    const actuales: Columna[] = JSON.parse(meta?.datos?._extra ?? "[]");
    const next = [...actuales, { key: slugCampo(label), label } as Columna];
    if (meta) await guardarFila(meta.id, { ...meta.datos, _extra: JSON.stringify(next) });
    else await crearFila({ _extra: JSON.stringify(next) }, -1);
  }

  async function agregarCampoExtra(label: string) {
    const f = filas[0] ?? (await asegurarSingle());
    if (!f) return;
    const actuales: Columna[] = JSON.parse(f.datos?._extra ?? "[]");
    const next = [...actuales, { key: slugCampo(label), label } as Columna];
    await guardarFila(f.id, { ...f.datos, _extra: JSON.stringify(next) });
  }

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando {herramienta.nombre.toLowerCase()}…</h4>
      </div>
    );
  }

  const extraCols: Columna[] = meta?.datos?._extra ? JSON.parse(meta.datos._extra) : [];
  const extraCampos: Columna[] = filas[0]?.datos?._extra ? JSON.parse(filas[0].datos._extra) : [];

  return (
    <div className="hp">
      {error && (
        <div className="hp-error">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {herramienta.hint && <p className="hp-hint">{herramienta.hint}</p>}

      {herramienta.tipo === "tabla" && (
        <TablaTool
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          fullName={fullName}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
          onVisionar={visionar}
          onAgregarColumna={agregarColumnaExtra}
        />
      )}

      {herramienta.tipo === "galeria" && (
        <GaleriaTool
          columnas={[...(herramienta.columnas ?? []), ...extraCols]}
          filas={filas}
          editable={editable}
          fullName={fullName}
          onCrear={() => crearFila({})}
          onGuardar={guardarFila}
          onBorrar={borrarFila}
          onVisionar={visionar}
          onAgregarColumna={agregarColumnaExtra}
        />
      )}

      {herramienta.tipo === "ficha" && (
        <FichaTool
          campos={[...(herramienta.campos ?? []), ...extraCampos]}
          fila={filas[0]}
          editable={editable}
          fullName={fullName}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
          onVisionar={visionar}
          onAgregarCampo={agregarCampoExtra}
        />
      )}

      {herramienta.tipo === "nota" && (
        <NotaTool
          fila={filas[0]}
          editable={editable}
          fullName={fullName}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
          onVisionar={visionar}
        />
      )}

      {herramienta.tipo === "checklist" && (
        <ChecklistTool
          fila={filas[0]}
          editable={editable}
          fullName={fullName}
          asegurar={asegurarSingle}
          onGuardar={guardarFila}
          onVisionar={visionar}
        />
      )}

      {esMulti && filas.length === 0 && (
        <div className="soon-box" style={{ marginTop: 0 }}>
          <span className="hex"></span>
          <h4>Aún no hay registros</h4>
          <p>{editable ? "Agregá la primera fila para empezar." : "Cuando el departamento cargue datos, aparecerán aquí."}</p>
        </div>
      )}

      {esSingle && filas[0] && <Firma fila={filas[0]} />}
    </div>
  );
}

// ---- Celda editable ----
function Celda({
  col,
  valor,
  editable,
  onChange,
  onCommit,
}: {
  col: Columna;
  valor: string;
  editable: boolean;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  if (col.tipo === "estado") {
    return (
      <select
        className="hp-cell-select"
        value={valor}
        disabled={!editable}
        onChange={(e) => { onChange(e.target.value); }}
        onBlur={onCommit}
      >
        <option value="">—</option>
        {(col.opciones ?? []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (col.tipo === "largo") {
    return (
      <textarea
        className="hp-cell-area"
        value={valor}
        readOnly={!editable}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
      />
    );
  }
  return (
    <input
      className="hp-cell-input"
      type={col.tipo === "num" || col.tipo === "money" ? "number" : col.tipo === "fecha" ? "date" : "text"}
      value={valor}
      readOnly={!editable}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
    />
  );
}

// ---- Tabla con registro de intervenciones ----
function TablaTool({
  columnas,
  filas,
  editable,
  fullName,
  onCrear,
  onGuardar,
  onBorrar,
  onVisionar,
  onAgregarColumna,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  fullName: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>) => void;
  onBorrar: (id: string) => void;
  onVisionar: (id: string) => void;
  onAgregarColumna: (label: string) => void;
}) {
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [abierta, setAbierta] = useState<string | null>(null);

  function val(f: Fila, key: string) {
    return draft[f.id]?.[key] ?? f.datos?.[key] ?? "";
  }
  function setVal(f: Fila, key: string, v: string) {
    setDraft((d) => ({ ...d, [f.id]: { ...f.datos, ...d[f.id], [key]: v } }));
  }
  function commit(f: Fila) {
    if (draft[f.id]) {
      onGuardar(f.id, { ...f.datos, ...draft[f.id] });
      setDraft((d) => { const n = { ...d }; delete n[f.id]; return n; });
    }
  }
  function pedirColumna() {
    const label = window.prompt("Título de la nueva columna:");
    if (label && label.trim()) onAgregarColumna(label.trim());
  }

  if (filas.length === 0) {
    return editable ? (
      <div className="hp-actions">
        <button className="btn acc" onClick={onCrear}>+ Agregar fila</button>
        <button className="btn" onClick={pedirColumna}>+ Agregar columna</button>
      </div>
    ) : null;
  }

  return (
    <>
      <div className="hp-table-wrap">
        <table className="hp-table">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th className="hp-th-reg">Registro</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const visto = (f.visionado_por ?? []).length > 0;
              const yoVi = (f.visionado_por ?? []).some((v) => v.usuario === fullName);
              return (
                <RowGroup key={f.id} abierta={abierta === f.id}>
                  <tr>
                    {columnas.map((c) => (
                      <td key={c.key} className={c.tipo === "largo" ? "hp-td-largo" : ""}>
                        <Celda
                          col={c}
                          valor={val(f, c.key)}
                          editable={editable}
                          onChange={(v) => setVal(f, c.key, v)}
                          onCommit={() => commit(f)}
                        />
                      </td>
                    ))}
                    <td className="hp-td-reg">
                      <button
                        className={`hp-reg-btn ${visto ? "visto" : ""}`}
                        onClick={() => setAbierta(abierta === f.id ? null : f.id)}
                        title="Ver registro de intervenciones"
                      >
                        <span className="hex"></span>
                        {visto ? `${(f.visionado_por ?? []).length} ✓` : "ver"}
                      </button>
                    </td>
                    {editable && (
                      <td>
                        <button className="hp-del" onClick={() => onBorrar(f.id)} title="Eliminar fila">✕</button>
                      </td>
                    )}
                  </tr>
                  {abierta === f.id && (
                    <tr className="hp-detail-row">
                      <td colSpan={columnas.length + (editable ? 2 : 1)}>
                        <RegistroDetalle
                          fila={f}
                          yoVi={yoVi}
                          onVisionar={() => onVisionar(f.id)}
                        />
                      </td>
                    </tr>
                  )}
                </RowGroup>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable && (
        <div className="hp-actions">
          <button className="btn acc" onClick={onCrear}>+ Agregar fila</button>
          <button className="btn" onClick={pedirColumna}>+ Agregar columna</button>
        </div>
      )}
    </>
  );
}

function RowGroup({ children }: { children: React.ReactNode; abierta: boolean }) {
  return <>{children}</>;
}

function RegistroDetalle({
  fila,
  yoVi,
  onVisionar,
}: {
  fila: Fila;
  yoVi: boolean;
  onVisionar: () => void;
}) {
  const reg = [...(fila.registro ?? [])].reverse().slice(0, 8);
  const vis = fila.visionado_por ?? [];
  return (
    <div className="hp-detail">
      <div className="hp-detail-col">
        <h6><span className="hex"></span> Registro de intervenciones</h6>
        {reg.length === 0 && <p className="hp-empty">Sin intervenciones.</p>}
        <ul className="hp-timeline">
          {reg.map((r, i) => (
            <li key={i}>
              <b>{r.accion === "crea" ? "Creó" : "Editó"}</b> {r.usuario} · {timeAgo(r.fecha)}
            </li>
          ))}
        </ul>
      </div>
      <div className="hp-detail-col">
        <h6><span className="hex"></span> Visionado por</h6>
        {vis.length === 0 && <p className="hp-empty">Nadie aún.</p>}
        <div className="hp-vis-chips">
          {vis.map((v, i) => (
            <span className="hp-vis-chip" key={i}>{v.usuario}</span>
          ))}
        </div>
        <button className={`btn ${yoVi ? "" : "acc"}`} style={{ marginTop: 8 }} onClick={onVisionar}>
          {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
        </button>
      </div>
    </div>
  );
}

// ---- Galería ----
function GaleriaTool({
  columnas,
  filas,
  editable,
  fullName,
  onCrear,
  onGuardar,
  onBorrar,
  onVisionar,
  onAgregarColumna,
}: {
  columnas: Columna[];
  filas: Fila[];
  editable: boolean;
  fullName: string;
  onCrear: () => void;
  onGuardar: (id: string, datos: Record<string, string>) => void;
  onBorrar: (id: string) => void;
  onVisionar: (id: string) => void;
  onAgregarColumna: (label: string) => void;
}) {
  function set(f: Fila, key: string, v: string) {
    onGuardar(f.id, { ...f.datos, [key]: v });
  }
  function pedirColumna() {
    const label = window.prompt("Título del nuevo campo:");
    if (label && label.trim()) onAgregarColumna(label.trim());
  }
  return (
    <>
      <div className="hp-galeria">
        {filas.map((f) => {
          const yoVi = (f.visionado_por ?? []).some((v) => v.usuario === fullName);
          const url = f.datos?.img ?? "";
          return (
            <div className="hp-gcard" key={f.id}>
              <div className="hp-gimg">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" />
                ) : (
                  <span className="hp-gimg-empty"><span className="hex"></span></span>
                )}
              </div>
              {editable && (
                <input
                  className="hp-cell-input"
                  placeholder="URL de imagen…"
                  defaultValue={url}
                  onBlur={(e) => set(f, "img", e.target.value)}
                />
              )}
              {columnas.map((c) => (
                <label className="hp-gfield" key={c.key}>
                  <span>{c.label}</span>
                  {c.tipo === "largo" ? (
                    <textarea defaultValue={f.datos?.[c.key] ?? ""} readOnly={!editable} rows={2} onBlur={(e) => set(f, c.key, e.target.value)} />
                  ) : (
                    <input defaultValue={f.datos?.[c.key] ?? ""} readOnly={!editable} onBlur={(e) => set(f, c.key, e.target.value)} />
                  )}
                </label>
              ))}
              <div className="hp-gfoot">
                <button className={`hp-vis-mini ${yoVi ? "visto" : ""}`} onClick={() => onVisionar(f.id)}>
                  {yoVi ? "Visionado ✓" : "Visionar"}
                </button>
                {editable && <button className="hp-del" onClick={() => onBorrar(f.id)}>✕</button>}
              </div>
            </div>
          );
        })}
      </div>
      {editable && (
        <div className="hp-actions">
          <button className="btn acc" onClick={onCrear}>+ Agregar tarjeta</button>
          <button className="btn" onClick={pedirColumna}>+ Agregar campo</button>
        </div>
      )}
    </>
  );
}

// ---- Ficha ----
function FichaTool({
  campos,
  fila,
  editable,
  fullName,
  asegurar,
  onGuardar,
  onVisionar,
  onAgregarCampo,
}: {
  campos: Columna[];
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>) => void;
  onVisionar: (id: string) => void;
  onAgregarCampo: (label: string) => void;
}) {
  async function set(key: string, v: string) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, [key]: v });
  }
  function pedirCampo() {
    const label = window.prompt("Título del nuevo campo:");
    if (label && label.trim()) onAgregarCampo(label.trim());
  }
  const yoVi = !!fila && (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
  return (
    <div className="hp-ficha">
      {campos.map((c) => (
        <label className="hp-ficha-field" key={c.key}>
          <span>{c.label}</span>
          {c.tipo === "largo" ? (
            <textarea defaultValue={fila?.datos?.[c.key] ?? ""} readOnly={!editable} rows={3} onBlur={(e) => set(c.key, e.target.value)} />
          ) : c.tipo === "estado" ? (
            <select defaultValue={fila?.datos?.[c.key] ?? ""} disabled={!editable} onChange={(e) => set(c.key, e.target.value)}>
              <option value="">—</option>
              {(c.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={c.tipo === "fecha" ? "date" : "text"}
              defaultValue={fila?.datos?.[c.key] ?? ""}
              readOnly={!editable}
              onBlur={(e) => set(c.key, e.target.value)}
            />
          )}
        </label>
      ))}
      {editable && (
        <div className="hp-ficha-add">
          <button className="btn" onClick={pedirCampo}>+ Agregar campo</button>
        </div>
      )}
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Nota ----
function NotaTool({
  fila,
  editable,
  fullName,
  asegurar,
  onGuardar,
  onVisionar,
}: {
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>) => void;
  onVisionar: (id: string) => void;
}) {
  const [texto, setTexto] = useState(fila?.datos?.texto ?? "");
  useEffect(() => { setTexto(fila?.datos?.texto ?? ""); }, [fila?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function commit() {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, texto });
  }
  const yoVi = !!fila && (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
  return (
    <div className="hp-nota-wrap">
      <textarea
        className="hp-nota"
        value={texto}
        readOnly={!editable}
        rows={12}
        placeholder="Escribí aquí…"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={commit}
      />
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Checklist ----
type Item = { texto: string; hecho: boolean };
function ChecklistTool({
  fila,
  editable,
  fullName,
  asegurar,
  onGuardar,
  onVisionar,
}: {
  fila: Fila | undefined;
  editable: boolean;
  fullName: string;
  asegurar: () => Promise<Fila>;
  onGuardar: (id: string, datos: Record<string, string>) => void;
  onVisionar: (id: string) => void;
}) {
  const items: Item[] = (() => {
    try { return JSON.parse(fila?.datos?.items ?? "[]"); } catch { return []; }
  })();
  const [nuevo, setNuevo] = useState("");

  async function persist(next: Item[]) {
    const f = fila ?? (await asegurar());
    onGuardar(f.id, { ...f.datos, items: JSON.stringify(next) });
  }
  const yoVi = !!fila && (fila.visionado_por ?? []).some((v) => v.usuario === fullName);
  const hechas = items.filter((i) => i.hecho).length;

  return (
    <div className="hp-checklist">
      {items.length > 0 && (
        <div className="hp-check-progress">
          <div className="hp-check-bar"><span style={{ width: `${(hechas / items.length) * 100}%` }}></span></div>
          <span>{hechas}/{items.length}</span>
        </div>
      )}
      {items.map((it, idx) => (
        <label key={idx} className={`hp-check-row ${it.hecho ? "done" : ""}`}>
          <input
            type="checkbox"
            checked={it.hecho}
            disabled={!editable}
            onChange={() => persist(items.map((x, i) => (i === idx ? { ...x, hecho: !x.hecho } : x)))}
          />
          <span>{it.texto}</span>
          {editable && <button className="hp-del" onClick={() => persist(items.filter((_, i) => i !== idx))}>✕</button>}
        </label>
      ))}
      {editable && (
        <div className="hp-check-add">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nuevo.trim()) { e.preventDefault(); persist([...items, { texto: nuevo.trim(), hecho: false }]); setNuevo(""); } }}
            placeholder="Nuevo punto…"
          />
          <button className="btn" onClick={() => { if (nuevo.trim()) { persist([...items, { texto: nuevo.trim(), hecho: false }]); setNuevo(""); } }}>Añadir</button>
        </div>
      )}
      {fila && (
        <div className="hp-single-foot">
          <Firma fila={fila} />
          <button className={`btn ${yoVi ? "" : "acc"}`} onClick={() => onVisionar(fila.id)}>
            {yoVi ? "Quitar mi visionado" : "Marcar como visionado"}
          </button>
        </div>
      )}
    </div>
  );
}

function Firma({ fila }: { fila: Fila }) {
  const vis = fila.visionado_por ?? [];
  return (
    <span className="hp-firma">
      ✎ {fila.editor_nombre ?? fila.autor_nombre ?? "—"} · {timeAgo(fila.updated_at)}
      {vis.length > 0 && <> · 👁 {vis.map((v) => v.usuario).join(", ")}</>}
    </span>
  );
}
