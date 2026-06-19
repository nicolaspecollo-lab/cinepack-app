"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deptTools, archivoColumnasDe, GENERAL_ORDEN_RODAJE, GENERAL_PLAN_RODAJE, type Herramienta, type Columna } from "../herramientas";

type FilaArchivo = {
  herramienta: Herramienta;
  col: Columna;
  path: string;
  contexto: string;
  autor: string | null;
  fecha: string;
};

type DirectoArchivo = {
  path: string;
  nombre: string;
  carpeta: string;
  size: number;
  created_at: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return "—";
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

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function contextoDe(fila: { datos: Record<string, string> }, herramienta: Herramienta, col: Columna): string {
  const cols = [...(herramienta.columnas ?? []), ...(herramienta.campos ?? [])];
  const principal = cols.find((c) => c.key !== col.key && (c.tipo === undefined || c.tipo === "texto"));
  if (principal && fila.datos[principal.key]) return fila.datos[principal.key];
  return herramienta.nombre;
}

export default function ArchivosPanel({ departamento }: { departamento: string }) {
  const [archivos, setArchivos] = useState<FilaArchivo[]>([]);
  const [directos, setDirectos] = useState<DirectoArchivo[]>([]);
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [carpetaActual, setCarpetaActual] = useState("General");
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [mostrarNuevaCarpeta, setMostrarNuevaCarpeta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [seccion, setSeccion] = useState<"directos" | "herramientas">("directos");
  const fileRef = useRef<HTMLInputElement>(null);

  const BUCKET = "documentos";

  function basePath(projectId: string) {
    return `${projectId}/${departamento}/archivos`;
  }

  async function load() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setLoading(false); return; }
    const supabase = createClient();

    // 1. Directos — listar desde Storage
    const { data: storageData } = await supabase.storage.from(BUCKET).list(`${basePath(projectId)}`, { limit: 200 });
    if (storageData) {
      // storageData puede tener carpetas (type=folder) y archivos directos (raíz)
      const carpetasSet = new Set<string>(["General"]);
      const encontrados: DirectoArchivo[] = [];

      for (const item of storageData) {
        if (item.id === null) {
          // Es una carpeta (prefijo)
          carpetasSet.add(item.name);
        } else {
          encontrados.push({
            path: `${basePath(projectId)}/${item.name}`,
            nombre: item.name.replace(/^\d+-/, ""),
            carpeta: "General",
            size: (item.metadata as { size?: number })?.size ?? 0,
            created_at: item.created_at ?? null,
          });
        }
      }

      // Listar archivos dentro de carpetas
      for (const carpeta of carpetasSet) {
        if (carpeta === "General") continue;
        const { data: subData } = await supabase.storage.from(BUCKET).list(`${basePath(projectId)}/${carpeta}`, { limit: 100 });
        if (subData) {
          for (const item of subData) {
            if (item.id === null) continue;
            encontrados.push({
              path: `${basePath(projectId)}/${carpeta}/${item.name}`,
              nombre: item.name.replace(/^\d+-/, ""),
              carpeta,
              size: (item.metadata as { size?: number })?.size ?? 0,
              created_at: item.created_at ?? null,
            });
          }
        }
      }

      setCarpetas([...carpetasSet]);
      setDirectos(encontrados.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")));
    }

    // 2. Desde herramientas
    const herramientas = [...deptTools(departamento), GENERAL_PLAN_RODAJE, GENERAL_ORDEN_RODAJE];
    const porId = new Map(herramientas.map((h) => [h.id, h]));
    const conArchivos = herramientas.filter((h) => archivoColumnasDe(h).length > 0);

    if (conArchivos.length > 0) {
      const { data } = await supabase
        .from("herramienta_filas")
        .select("herramienta_id, datos, autor_nombre, editor_nombre, created_at, updated_at")
        .eq("project_id", projectId)
        .in("herramienta_id", conArchivos.map((h) => h.id));

      const out: FilaArchivo[] = [];
      for (const row of data ?? []) {
        const herramienta = porId.get(row.herramienta_id);
        if (!herramienta) continue;
        for (const col of archivoColumnasDe(herramienta)) {
          const path = row.datos?.[col.key];
          if (!path) continue;
          out.push({
            herramienta,
            col,
            path,
            contexto: contextoDe({ datos: row.datos }, herramienta, col),
            autor: row.editor_nombre ?? row.autor_nombre,
            fecha: row.updated_at,
          });
        }
      }
      out.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setArchivos(out);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, [departamento]); // eslint-disable-line react-hooks/exhaustive-deps

  async function subirArchivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    setUploading(true);
    for (const file of Array.from(files)) {
      const carpeta = carpetaActual === "General" ? "" : `${carpetaActual}/`;
      const p = `${basePath(projectId)}/${carpeta}${Date.now()}-${file.name}`;
      await supabase.storage.from(BUCKET).upload(p, file);
    }
    await load();
    setUploading(false);
  }

  async function crearCarpeta() {
    const nombre = nuevaCarpeta.trim().replace(/[^a-zA-Z0-9-_ ]/g, "");
    if (!nombre) return;
    setCarpetas((prev) => [...new Set([...prev, nombre])]);
    setCarpetaActual(nombre);
    setNuevaCarpeta("");
    setMostrarNuevaCarpeta(false);
  }

  async function eliminarDirecto(path: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
    setDirectos((prev) => prev.filter((f) => f.path !== path));
  }

  async function descargar(path: string, nombre?: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
    if (!data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = nombre ?? path.split("/").pop() ?? "archivo";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  const directosFiltrados = directos.filter((f) => {
    const q = filtro.toLowerCase();
    return !q || f.nombre.toLowerCase().includes(q) || f.carpeta.toLowerCase().includes(q);
  });

  const herramientasFiltradas = archivos.filter((a) => {
    const q = filtro.toLowerCase();
    return !q || a.herramienta.nombre.toLowerCase().includes(q) || a.col.label.toLowerCase().includes(q) || a.contexto.toLowerCase().includes(q) || (a.path.split("/").pop() ?? "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando archivos…</h4>
      </div>
    );
  }

  return (
    <div className="hp-open">
      <div className="hp-open-head" style={{ flexWrap: "wrap", gap: "10px" }}>
        <h3><span className="hex"></span> Archivos de {departamento}</h3>
        <label className={`btn acc ${uploading ? "disabled" : ""}`} style={{ cursor: uploading ? "wait" : "pointer", marginLeft: "auto" }}>
          {uploading ? "Subiendo…" : "⬆ Subir archivo"}
          <input
            ref={fileRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => subirArchivos(e.target.files)}
          />
        </label>
      </div>

      {/* Carpetas */}
      <div className="hp-archivos-carpetas">
        <span className="hp-archivos-label">Carpeta:</span>
        {carpetas.map((c) => (
          <button
            key={c}
            className={`hp-archivos-carpeta ${carpetaActual === c ? "active" : ""}`}
            onClick={() => setCarpetaActual(c)}
          >
            📁 {c}
          </button>
        ))}
        {mostrarNuevaCarpeta ? (
          <span className="hp-archivos-nueva">
            <input
              autoFocus
              value={nuevaCarpeta}
              onChange={(e) => setNuevaCarpeta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") crearCarpeta(); if (e.key === "Escape") setMostrarNuevaCarpeta(false); }}
              placeholder="Nombre de carpeta…"
            />
            <button className="btn" onClick={crearCarpeta}>Crear</button>
            <button className="btn" onClick={() => setMostrarNuevaCarpeta(false)}>✕</button>
          </span>
        ) : (
          <button className="btn" onClick={() => setMostrarNuevaCarpeta(true)}>+ Carpeta</button>
        )}
      </div>

      {/* Filtro + tabs */}
      <div className="hp-actions" style={{ paddingTop: 0, flexWrap: "wrap", gap: "8px" }}>
        <input
          className="hp-cell-input"
          style={{ minWidth: 220 }}
          placeholder="Buscar por nombre, herramienta…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <div className="dsubtabs" style={{ marginBottom: 0 }}>
          <button className={`dsubtab ${seccion === "directos" ? "active" : ""}`} onClick={() => setSeccion("directos")}>
            Mis archivos {directos.length > 0 && `(${directos.length})`}
          </button>
          <button className={`dsubtab ${seccion === "herramientas" ? "active" : ""}`} onClick={() => setSeccion("herramientas")}>
            En herramientas {archivos.length > 0 && `(${archivos.length})`}
          </button>
        </div>
      </div>

      {/* DROP ZONE (si no hay archivos directos) */}
      {seccion === "directos" && (
        <>
          {directosFiltrados.length === 0 ? (
            <div
              className="hp-archivos-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); subirArchivos(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
            >
              <span className="hex"></span>
              <p>Arrastrá archivos acá o hacé clic para seleccionar</p>
              <p style={{ fontSize: "11px", color: "var(--muted)" }}>Se guardarán en la carpeta "{carpetaActual}"</p>
            </div>
          ) : (
            <>
              <div
                className="hp-archivos-dropzone hp-archivos-dropzone-mini"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); subirArchivos(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
              >
                Arrastrá más archivos aquí · Carpeta: <b>{carpetaActual}</b>
              </div>
              <div className="hp-archivos-grid">
                {directosFiltrados
                  .filter((f) => f.carpeta === carpetaActual || carpetaActual === "General" && f.carpeta === "General")
                  .map((f, i) => (
                    <div key={i} className="hp-archivos-card">
                      <span className="hp-archivos-icon">{f.nombre.match(/\.(pdf)$/i) ? "📄" : f.nombre.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "🖼️" : f.nombre.match(/\.(mp4|mov|avi)$/i) ? "🎬" : "📎"}</span>
                      <span className="hp-archivos-nombre">{f.nombre}</span>
                      <span className="hp-archivos-meta">{fmtBytes(f.size)} · {timeAgo(f.created_at)}</span>
                      <div className="hp-archivos-actions">
                        <button className="btn" onClick={() => descargar(f.path, f.nombre)}>⬇</button>
                        <button className="btn hp-del" onClick={() => eliminarDirecto(f.path)}>✕</button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ARCHIVOS DE HERRAMIENTAS */}
      {seccion === "herramientas" && (
        <>
          {herramientasFiltradas.length === 0 ? (
            <div className="soon-box" style={{ marginTop: 0 }}>
              <span className="hex"></span>
              <h4>Sin archivos en herramientas</h4>
              <p>Los archivos subidos en columnas de tipo "archivo" de las herramientas de {departamento} aparecerán acá.</p>
            </div>
          ) : (
            <div className="hp-table-wrap">
              <table className="hp-table">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Herramienta</th>
                    <th>Campo</th>
                    <th>Contexto</th>
                    <th>Subido por</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {herramientasFiltradas.map((a, i) => (
                    <tr key={i}>
                      <td>📎 {a.path.split("/").pop()?.replace(/^\d+-/, "")}</td>
                      <td>{a.herramienta.nombre}</td>
                      <td>{a.col.label}</td>
                      <td>{a.contexto}</td>
                      <td>{a.autor ?? "—"} · {timeAgo(a.fecha)}</td>
                      <td><button className="btn" onClick={() => descargar(a.path)}>Descargar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
