"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

type Archivo = {
  path: string;
  nombre: string;
  size: number;
  created_at: string | null;
};

function timeAgo(iso: string | null, t: ReturnType<typeof useTranslations>) {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t("timeNow");
  if (mins < 60) return t("timeMinsAgo", { n: mins });
  const h = Math.floor(mins / 60);
  if (h < 24) return t("timeHoursAgo", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("timeYesterday") : t("timeDaysAgo", { n: d });
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

// Supabase Storage no admite tildes ni espacios en las keys.
// Sanitiza cada segmento de la ruta sin tocar el nombre que se muestra en la UI.
function safeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes/diacríticos
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

export default function ArchivosPanel({ departamento }: { departamento: string }) {
  const t = useTranslations("archivos");
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [carpetaLoading, setCarpetaLoading] = useState(false);
  const [carpetaError, setCarpetaError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewFile, setPreviewFile] = useState<Archivo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const projectId = typeof window !== "undefined" ? localStorage.getItem("cinepack-proyecto-id") : null;

  function storagePath() {
    const segs = [projectId ?? "", safeKey(departamento), "archivos", ...pathStack.map(safeKey)];
    return segs.join("/");
  }

  function parentPath() {
    return pathStack.join("/");
  }

  async function loadCarpetas() {
    if (!projectId) return [];
    const supabase = createClient();
    const { data } = await supabase
      .from("archivos_carpetas")
      .select("nombre")
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .eq("parent_path", parentPath())
      .order("nombre");
    return (data ?? []).map((r) => r.nombre as string);
  }

  async function loadArchivos() {
    if (!projectId) return [];
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).list(storagePath(), { limit: 500 });
    if (!data) return [];
    return data
      .filter((i) => i.id !== null)
      .map((i) => ({
        path: `${storagePath()}/${i.name}`,
        nombre: i.name.replace(/^\d+-/, ""),
        size: (i.metadata as { size?: number })?.size ?? 0,
        created_at: i.created_at ?? null,
      }))
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }

  async function load() {
    setLoading(true);
    const [c, a] = await Promise.all([loadCarpetas(), loadArchivos()]);
    setCarpetas(c);
    setArchivos(a);
    setLoading(false);
    generarMiniaturas(a);
  }

  useEffect(() => { load(); }, [departamento, pathStack.join("/")]); // eslint-disable-line

  // Las imágenes usan directamente la signed URL como miniatura (el navegador
  // la escala). Los PDF se renderizan a una imagen pequeña con pdfjs porque
  // el bucket "documentos" es privado: no existe URL pública servible.
  async function renderPdfThumbnail(path: string, scale: number): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).download(path);
    if (!data) return null;
    const arrayBuffer = await data.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const canvas = document.createElement("canvas");
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;
    return canvas.toDataURL("image/png");
  }

  async function generarMiniaturas(files: Archivo[]) {
    const imagenes = files.filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.nombre));
    const pdfs = files.filter((f) => /\.(pdf)$/i.test(f.nombre));

    if (imagenes.length > 0) {
      const supabase = createClient();
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(imagenes.map((f) => f.path), 3600);
      if (data) {
        setThumbs((prev) => {
          const next = { ...prev };
          data.forEach((d, i) => {
            if (d.signedUrl) next[imagenes[i].path] = d.signedUrl;
          });
          return next;
        });
      }
    }

    for (const f of pdfs) {
      try {
        const url = await renderPdfThumbnail(f.path, 0.5);
        if (url) setThumbs((prev) => ({ ...prev, [f.path]: url }));
      } catch (err) {
        console.error("Error al generar miniatura de PDF:", err);
      }
    }
  }

  async function crearCarpeta() {
    const nombre = nuevaCarpeta.trim().replace(/[^a-zA-Z0-9\-_ áéíóúÁÉÍÓÚñÑ]/g, "").trim();
    if (!nombre || !projectId) return;
    setCarpetaLoading(true);
    setCarpetaError(null);
    const supabase = createClient();
    const { error } = await supabase.from("archivos_carpetas").insert({
      project_id: projectId,
      departamento,
      parent_path: parentPath(),
      nombre,
    });
    setCarpetaLoading(false);
    if (error) {
      setCarpetaError(error.code === "23505" ? t("folderExists") : error.message);
      return;
    }
    setNuevaCarpeta("");
    setCreandoCarpeta(false);
    load();
  }

  async function eliminarCarpeta(nombre: string) {
    if (!confirm(t("confirmDeleteFolder", { name: nombre }))) return;
    if (!projectId) return;
    const supabase = createClient();
    // Eliminar carpeta de DB
    await supabase.from("archivos_carpetas")
      .delete()
      .eq("project_id", projectId)
      .eq("departamento", departamento)
      .eq("parent_path", parentPath())
      .eq("nombre", nombre);
    // Eliminar archivos del Storage
    const basePath = `${storagePath()}/${safeKey(nombre)}`;
    const { data: files } = await supabase.storage.from(BUCKET).list(basePath, { limit: 500 });
    if (files && files.length > 0) {
      await supabase.storage.from(BUCKET).remove(files.map((f) => `${basePath}/${f.name}`));
    }
    load();
  }

  async function subirArchivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!projectId) { setUploadError(t("noActiveProject")); return; }
    const supabase = createClient();
    setUploading(true);
    setUploadError(null);
    let ok = 0;
    let firstError = "";
    for (const file of Array.from(files)) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${storagePath()}/${Date.now()}-${safeKey(file.name)}`, file);
      if (error) { if (!firstError) firstError = error.message; }
      else ok++;
    }
    if (fileRef.current) fileRef.current.value = "";
    await load();
    if (firstError) setUploadError(`${firstError} (subidos: ${ok}/${files.length})`);
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
    if (!confirm(t("confirmDeleteFile"))) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
    setArchivos((prev) => prev.filter((f) => f.path !== path));
  }

  async function abrirPreview(archivo: Archivo) {
    setPreviewFile(archivo);
    setPreviewUrl(null);
    setPreviewLoading(true);

    const isImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(archivo.nombre);
    const isPdf = /\.(pdf)$/i.test(archivo.nombre);

    try {
      if (isImagen) {
        // El bucket "documentos" es privado: necesita signed URL, no pública.
        const supabase = createClient();
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.path, 3600);
        if (data) setPreviewUrl(data.signedUrl);
      } else if (isPdf) {
        // Renderiza a mayor escala que la miniatura para verse bien en el modal.
        const url = await renderPdfThumbnail(archivo.path, 1.5);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error("Error al generar preview:", err);
    }

    setPreviewLoading(false);
  }

  const breadcrumb = [t("rootLabel"), ...pathStack];
  const isRoot = pathStack.length === 0;
  const isEmpty = carpetas.length === 0 && archivos.length === 0;

  const formCarpeta = creandoCarpeta ? (
    <span className="arc-nueva-row">
      <input
        autoFocus
        className="arc-nueva-input"
        value={nuevaCarpeta}
        onChange={(e) => setNuevaCarpeta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") crearCarpeta();
          if (e.key === "Escape") { setCreandoCarpeta(false); setCarpetaError(null); }
        }}
        placeholder={t("newFolderPlaceholder")}
      />
      <button className="arc-btn" onClick={crearCarpeta} disabled={carpetaLoading}>
        {carpetaLoading ? t("creating") : t("create")}
      </button>
      <button className="arc-btn" onClick={() => { setCreandoCarpeta(false); setCarpetaError(null); }}>✕</button>
    </span>
  ) : (
    <button className="arc-btn-outline" onClick={() => { setCreandoCarpeta(true); setCarpetaError(null); }}>
      {t("newFolder")}
    </button>
  );

  return (
    <div className="arc-wrap">
      <div className="arc-head">
        <div className="arc-breadcrumb">
          {breadcrumb.map((seg, i) => (
            <span key={i} className="arc-bc-seg">
              {i > 0 && <span className="arc-bc-sep">›</span>}
              {i < breadcrumb.length - 1 ? (
                <button className="arc-bc-btn" onClick={() => setPathStack(pathStack.slice(0, i))}>
                  {seg}
                </button>
              ) : (
                <span className="arc-bc-current">{seg}</span>
              )}
            </span>
          ))}
        </div>

        <div className="arc-head-actions">
          {formCarpeta}
          {!isRoot && (
            <label className={`arc-btn-acc${uploading ? " disabled" : ""}`} style={{ cursor: uploading ? "wait" : "pointer" }}>
              {uploading ? t("uploading") : t("uploadFile")}
              <input ref={fileRef} type="file" multiple style={{ display: "none" }}
                onChange={(e) => subirArchivos(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      {carpetaError && <div className="arc-error">⚠ {carpetaError}</div>}
      {uploadError && <div className="arc-error">⚠ {t("uploadErrorPrefix")}{uploadError}</div>}

      {loading ? (
        <div className="soon-box"><span className="hex"></span><h4>{t("loading")}</h4></div>
      ) : (
        <>
          {carpetas.length > 0 && (
            <div className="arc-folder-grid">
              {carpetas.map((c) => (
                <button key={c} className="arc-folder-card" onClick={() => setPathStack([...pathStack, c])}>
                  <span className="arc-folder-icon">📁</span>
                  <span className="arc-folder-name">{c}</span>
                </button>
              ))}
            </div>
          )}

          {archivos.length > 0 && (
            <div className="arc-files-grid">
              {archivos.map((f, i) => {
                const isImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.nombre);
                const isPdf = /\.(pdf)$/i.test(f.nombre);
                const conPreview = isImagen || isPdf;
                return (
                  <div key={i} className="arc-file-card" style={{ position: "relative" }}>
                    {conPreview ? (
                      <button
                        className="arc-file-thumb"
                        onClick={() => abrirPreview(f)}
                        style={{
                          width: "100%",
                          height: "120px",
                          background: "var(--hl3)",
                          border: "1px solid var(--line)",
                          borderRadius: "4px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          overflow: "hidden",
                        }}
                      >
                        {thumbs[f.path] ? (
                          <img
                            src={thumbs[f.path]}
                            alt={f.nombre}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: "48px" }}>{fileIcon(f.nombre)}</span>
                        )}
                      </button>
                    ) : (
                      <span className="arc-file-icon">{fileIcon(f.nombre)}</span>
                    )}
                    <span className="arc-file-name">{f.nombre}</span>
                    <span className="arc-file-meta">{fmtBytes(f.size)} · {timeAgo(f.created_at, t)}</span>
                    <div className="arc-file-actions">
                      <button className="arc-btn" onClick={() => descargar(f.path, f.nombre)}>⬇</button>
                      <button className="arc-btn arc-btn-del" onClick={() => eliminar(f.path)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isRoot && isEmpty && (
            <div className="arc-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); subirArchivos(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}>
              <span className="hex" style={{ width: 28, height: 24 }} />
              <p>{t("dropHere")}</p>
            </div>
          )}

          {isRoot && isEmpty && (
            <div className="arc-dropzone" style={{ cursor: "default" }}>
              <span className="hex" style={{ width: 28, height: 24 }} />
              <p>{t("createFolderToStart")}</p>
            </div>
          )}
        </>
      )}

      {/* Modal de preview */}
      {previewFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
            cursor: previewLoading ? "wait" : "pointer",
          }}
          onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
        >
          <div
            style={{
              background: "var(--bg)",
              borderRadius: "8px",
              padding: "20px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
              cursor: "default",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", color: "var(--muted)" }}>{previewFile.nombre}</span>
              <button
                onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                ✕
              </button>
            </div>
            {previewLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                {t("loadingPreview")}
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt={previewFile.nombre} style={{ maxWidth: "100%", maxHeight: "calc(90vh - 60px)", borderRadius: "4px" }} />
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                {t("noPreview")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
