"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Archivo = {
  path: string;
  nombre: string;
  size: number;
  created_at: string | null;
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

export default function ArchivosPanel({ departamento }: { departamento: string }) {
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [carpetaActual, setCarpetaActual] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const BUCKET = "documentos";

  function basePath(projectId: string) {
    return `${projectId}/${departamento}/archivos`;
  }

  async function loadCarpetas() {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) { setLoading(false); return; }
    const supabase = createClient();

    const { data } = await supabase.storage.from(BUCKET).list(basePath(projectId), { limit: 200 });
    if (!data) { setLoading(false); return; }

    const found = new Set<string>(["General"]);
    const directosRaiz: Archivo[] = [];

    for (const item of data) {
      if (item.id === null) {
        found.add(item.name);
      } else {
        directosRaiz.push({
          path: `${basePath(projectId)}/${item.name}`,
          nombre: item.name.replace(/^\d+-/, ""),
          size: (item.metadata as { size?: number })?.size ?? 0,
          created_at: item.created_at ?? null,
        });
      }
    }

    // contar archivos por carpeta
    const cnt: Record<string, number> = { General: directosRaiz.length };
    for (const carpeta of found) {
      if (carpeta === "General") continue;
      const { data: sub } = await supabase.storage
        .from(BUCKET)
        .list(`${basePath(projectId)}/${carpeta}`, { limit: 200 });
      cnt[carpeta] = (sub ?? []).filter((i) => i.id !== null).length;
    }

    setCarpetas([...found]);
    setConteos(cnt);
    setLoading(false);
  }

  async function loadArchivos(carpeta: string) {
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();

    const subPath = carpeta === "General"
      ? basePath(projectId)
      : `${basePath(projectId)}/${carpeta}`;

    const { data } = await supabase.storage.from(BUCKET).list(subPath, { limit: 200 });
    if (!data) return;

    const found: Archivo[] = data
      .filter((i) => i.id !== null)
      .map((i) => ({
        path: `${subPath}/${i.name}`,
        nombre: i.name.replace(/^\d+-/, ""),
        size: (i.metadata as { size?: number })?.size ?? 0,
        created_at: i.created_at ?? null,
      }))
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

    setArchivos(found);
  }

  useEffect(() => { loadCarpetas(); }, [departamento]); // eslint-disable-line

  function abrirCarpeta(c: string) {
    setCarpetaActual(c);
    loadArchivos(c);
  }

  function volver() {
    setCarpetaActual(null);
    setArchivos([]);
    loadCarpetas();
  }

  async function crearCarpeta() {
    const nombre = nuevaCarpeta.trim().replace(/[^a-zA-Z0-9\-_ ]/g, "");
    if (!nombre) return;
    setCarpetas((prev) => [...new Set([...prev, nombre])]);
    setConteos((prev) => ({ ...prev, [nombre]: 0 }));
    setNuevaCarpeta("");
    setCreandoCarpeta(false);
  }

  async function subirArchivos(files: FileList | null) {
    if (!files || files.length === 0 || !carpetaActual) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) return;
    const supabase = createClient();
    setUploading(true);
    const subPath = carpetaActual === "General"
      ? basePath(projectId)
      : `${basePath(projectId)}/${carpetaActual}`;
    for (const file of Array.from(files)) {
      await supabase.storage.from(BUCKET).upload(`${subPath}/${Date.now()}-${file.name}`, file);
    }
    await loadArchivos(carpetaActual);
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

  if (loading) {
    return (
      <div className="soon-box">
        <span className="hex"></span>
        <h4>Cargando archivos…</h4>
      </div>
    );
  }

  // ── Vista interior de carpeta ──────────────────────────────────────────
  if (carpetaActual !== null) {
    return (
      <div className="arc-wrap">
        <div className="arc-head">
          <button className="arc-back" onClick={volver}>← Carpetas</button>
          <span className="arc-head-title">
            <span className="hex" style={{ width: 10, height: 9 }} />
            {carpetaActual}
          </span>
          <div className="arc-head-actions">
            {creandoCarpeta ? (
              <span className="arc-nueva-row">
                <input
                  autoFocus
                  className="arc-nueva-input"
                  value={nuevaCarpeta}
                  onChange={(e) => setNuevaCarpeta(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") crearCarpeta(); if (e.key === "Escape") setCreandoCarpeta(false); }}
                  placeholder="Nombre de carpeta…"
                />
                <button className="arc-btn" onClick={crearCarpeta}>Crear</button>
                <button className="arc-btn" onClick={() => setCreandoCarpeta(false)}>✕</button>
              </span>
            ) : (
              <button className="arc-btn-outline" onClick={() => setCreandoCarpeta(true)}>+ Nueva carpeta</button>
            )}
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
          </div>
        </div>

        {archivos.length === 0 ? (
          <div
            className="arc-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); subirArchivos(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
          >
            <span className="hex" style={{ width: 28, height: 24 }} />
            <p>Arrastrá archivos acá o hacé clic para subir</p>
            <p className="arc-drop-sub">Carpeta: <b>{carpetaActual}</b></p>
          </div>
        ) : (
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
      </div>
    );
  }

  // ── Vista home: grid de carpetas ───────────────────────────────────────
  return (
    <div className="arc-wrap">
      <div className="arc-head">
        <span className="arc-head-title" style={{ fontWeight: 700 }}>Carpetas</span>
        <div className="arc-head-actions">
          {creandoCarpeta ? (
            <span className="arc-nueva-row">
              <input
                autoFocus
                className="arc-nueva-input"
                value={nuevaCarpeta}
                onChange={(e) => setNuevaCarpeta(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") crearCarpeta(); if (e.key === "Escape") setCreandoCarpeta(false); }}
                placeholder="Nombre de carpeta…"
              />
              <button className="arc-btn" onClick={crearCarpeta}>Crear</button>
              <button className="arc-btn" onClick={() => setCreandoCarpeta(false)}>✕</button>
            </span>
          ) : (
            <button className="arc-btn-outline" onClick={() => setCreandoCarpeta(true)}>+ Nueva carpeta</button>
          )}
        </div>
      </div>

      <div className="arc-folder-grid">
        {carpetas.map((c) => (
          <button key={c} className="arc-folder-card" onClick={() => abrirCarpeta(c)}>
            <span className="arc-folder-icon">📁</span>
            <span className="arc-folder-name">{c}</span>
            <span className="arc-folder-count">
              {conteos[c] ?? 0} {(conteos[c] ?? 0) === 1 ? "archivo" : "archivos"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
