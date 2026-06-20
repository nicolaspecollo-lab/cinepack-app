"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Archivo = {
  path: string;
  nombre: string;
  size: number;
  created_at: string | null;
};

type Carpeta = {
  name: string;
  path: string;
};

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(nombre: string) {
  if (/\.(pdf)$/i.test(nombre)) return "📄";
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(nombre)) return "🖼️";
  if (/\.(mp4|mov|avi|mkv)$/i.test(nombre)) return "🎬";
  if (/\.(mp3|wav|aac)$/i.test(nombre)) return "🎵";
  if (/\.(doc|docx)$/i.test(nombre)) return "📝";
  if (/\.(xls|xlsx|csv)$/i.test(nombre)) return "📊";
  return "📎";
}

const BUCKET = "documentos";

export default function ArchivosPanel({ departamento }: { departamento: string }) {
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function baseRoot(projectId: string) {
    return `${projectId}/${departamento}/archivos`;
  }

  function currentFullPath(projectId: string) {
    const root = baseRoot(projectId);
    return pathStack.length === 0 ? root : `${root}/${pathStack.join("/")}`;
  }

  async function loadItems() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const fullPath = currentFullPath(projectId);

    const { data, error } = await supabase.storage.from(BUCKET).list(fullPath, { limit: 500 });
    if (error || !data) { setLoading(false); return; }

    const foundCarpetas: Carpeta[] = [];
    const foundArchivos: Archivo[] = [];

    for (const item of data) {
      if (item.name === ".keep") continue;
      if (item.id === null) {
        // prefix → folder
        foundCarpetas.push({ name: item.name, path: `${fullPath}/${item.name}` });
      } else {
        foundArchivos.push({
          path: `${fullPath}/${item.name}`,
          nombre: item.name.replace(/^\d+-/, ""),
          size: (item.metadata as { size?: number })?.size ?? 0,
          created_at: item.created_at ?? null,
        });
      }
    }

    foundArchivos.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    setCarpetas(foundCarpetas);
    setArchivos(foundArchivos);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    setCarpetas([]);
    setArchivos([]);
    loadItems();
  }, [departamento, pathStack]); // eslint-disable-line

  async function crearCarpeta() {
    const nombre = nuevaCarpeta.trim().replace(/[^a-zA-Z0-9\-_ ]/g, "");
    if (!nombre) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    const keepPath = `${currentFullPath(projectId)}/${nombre}/.keep`;
    const blob = new Blob([""], { type: "text/plain" });
    await supabase.storage.from(BUCKET).upload(keepPath, blob, { upsert: true });
    setNuevaCarpeta("");
    setCreandoCarpeta(false);
    loadItems();
  }

  async function subirArchivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    setUploading(true);
    setUploadError(null);
    const fullPath = currentFullPath(projectId);
    for (const file of Array.from(files)) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${fullPath}/${Date.now()}-${file.name}`, file);
      if (error) {
        setUploadError(error.message);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    await loadItems();
    setUploading(false);
  }

  async function descargar(path: string, nombre: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
    if (!data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = nombre;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  async function eliminar(path: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
    setArchivos((prev) => prev.filter((f) => f.path !== path));
  }

  // breadcrumb labels
  const breadcrumb = ["Archivos", ...pathStack];

  const isRoot = pathStack.length === 0;
  const isEmpty = carpetas.length === 0 && archivos.length === 0;

  return (
    <div className="arc-wrap">
      {/* Header */}
      <div className="arc-head">
        <div className="arc-breadcrumb">
          {breadcrumb.map((seg, i) => (
            <span key={i} className="arc-bc-seg">
              {i > 0 && <span className="arc-bc-sep">›</span>}
              {i < breadcrumb.length - 1 ? (
                <button
                  className="arc-bc-btn"
                  onClick={() => setPathStack(pathStack.slice(0, i))}
                >
                  {seg}
                </button>
              ) : (
                <span className="arc-bc-current">{seg}</span>
              )}
            </span>
          ))}
        </div>

        <div className="arc-head-actions">
          {creandoCarpeta ? (
            <span className="arc-nueva-row">
              <input
                autoFocus
                className="arc-nueva-input"
                value={nuevaCarpeta}
                onChange={(e) => setNuevaCarpeta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") crearCarpeta();
                  if (e.key === "Escape") setCreandoCarpeta(false);
                }}
                placeholder="Nombre de carpeta…"
              />
              <button className="arc-btn" onClick={crearCarpeta}>Crear</button>
              <button className="arc-btn" onClick={() => setCreandoCarpeta(false)}>✕</button>
            </span>
          ) : (
            <button className="arc-btn-outline" onClick={() => setCreandoCarpeta(true)}>+ Nueva carpeta</button>
          )}

          {!isRoot && (
            <label className={`arc-btn-acc${uploading ? " disabled" : ""}`} style={{ cursor: uploading ? "wait" : "pointer" }}>
              {uploading ? "Subiendo…" : "⬆ Subir archivo"}
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => subirArchivos(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="arc-error">⚠ Error al subir: {uploadError}</div>
      )}

      {loading ? (
        <div className="soon-box">
          <span className="hex"></span>
          <h4>Cargando…</h4>
        </div>
      ) : (
        <>
          {/* Carpetas */}
          {carpetas.length > 0 && (
            <div className="arc-folder-grid">
              {carpetas.map((c) => (
                <button
                  key={c.path}
                  className="arc-folder-card"
                  onClick={() => setPathStack([...pathStack, c.name])}
                >
                  <span className="arc-folder-icon">📁</span>
                  <span className="arc-folder-name">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Archivos */}
          {archivos.length > 0 && (
            <div className="arc-files-grid">
              {archivos.map((f, i) => (
                <div key={i} className="arc-file-card">
                  <span className="arc-file-icon">{fileIcon(f.nombre)}</span>
                  <span className="arc-file-name">{f.nombre}</span>
                  <span className="arc-file-meta">{fmtBytes(f.size)} · {timeAgo(f.created_at)}</span>
                  <div className="arc-file-actions">
                    <button className="arc-btn" onClick={() => descargar(f.path, f.nombre)}>⬇</button>
                    <button className="arc-btn arc-btn-del" onClick={() => eliminar(f.path)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone (solo dentro de carpeta) */}
          {!isRoot && isEmpty && (
            <div
              className="arc-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); subirArchivos(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
            >
              <span className="hex" style={{ width: 28, height: 24 }} />
              <p>Arrastrá archivos acá o hacé clic para subir</p>
            </div>
          )}

          {/* Mensaje si la raíz está vacía */}
          {isRoot && isEmpty && (
            <div className="arc-dropzone" style={{ cursor: "default" }}>
              <span className="hex" style={{ width: 28, height: 24 }} />
              <p>Creá una carpeta para empezar a subir archivos</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
