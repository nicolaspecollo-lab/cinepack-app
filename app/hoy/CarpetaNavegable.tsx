"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";

type Entrada =
  | { kind: "carpeta"; nombre: string }
  | { kind: "archivo"; nombre: string; size: number };

const OCULTOS = new Set([".emptyFolderPlaceholder", ".keep"]);
const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const limpio = (n: string) => n.replace(/^\d+-/, "");

// Explorador de archivos con carpetas anidables sobre Supabase Storage.
// `base` es el prefijo raíz (ej. `${proyecto}/_convocatorias/${evento}/entregas`).
export default function CarpetaNavegable({ base, editable }: { base: string; editable: boolean }) {
  const t = useTranslations("ciclo");
  const [ruta, setRuta] = useState<string[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const prefix = useMemo(() => [base, ...ruta].join("/"), [base, ruta]);

  const cargar = useCallback(async () => {
    setCargando(true); setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documentos").list(prefix, { limit: 500, sortBy: { column: "name", order: "asc" } });
    if (error) { setErr(error.message); setCargando(false); return; }
    const carpetas: Entrada[] = [];
    const archivos: Entrada[] = [];
    for (const o of data ?? []) {
      if (OCULTOS.has(o.name)) continue;
      if (o.id === null) carpetas.push({ kind: "carpeta", nombre: o.name });
      else archivos.push({ kind: "archivo", nombre: o.name, size: (o.metadata?.size as number) ?? 0 });
    }
    setEntradas([...carpetas, ...archivos]);
    setCargando(false);
  }, [prefix]);

  useEffect(() => { cargar(); }, [cargar]);

  async function subir(file: File) {
    setSubiendo(true); setErr(null);
    const supabase = createClient();
    const { error } = await supabase.storage.from("documentos").upload(`${prefix}/${Date.now()}-${safeKey(file.name)}`, file);
    setSubiendo(false);
    if (error) { setErr(error.message); return; }
    cargar();
  }

  async function crearCarpeta() {
    const nombre = window.prompt(t("folderNamePrompt"));
    if (!nombre || !nombre.trim()) return;
    const supabase = createClient();
    const blob = new Blob([""], { type: "text/plain" });
    const { error } = await supabase.storage.from("documentos").upload(`${prefix}/${safeKey(nombre.trim())}/.keep`, blob);
    if (error) { setErr(error.message); return; }
    cargar();
  }

  async function abrir(nombre: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from("documentos").createSignedUrl(`${prefix}/${nombre}`, 60);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function borrarArchivo(nombre: string) {
    if (!window.confirm(t("confirmDeleteFile"))) return;
    const supabase = createClient();
    await supabase.storage.from("documentos").remove([`${prefix}/${nombre}`]);
    cargar();
  }

  async function borrarCarpeta(nombre: string) {
    if (!window.confirm(t("confirmDeleteFolder"))) return;
    const supabase = createClient();
    const raiz = `${prefix}/${nombre}`;
    const paths: string[] = [];
    async function recorrer(p: string) {
      const { data } = await supabase.storage.from("documentos").list(p, { limit: 500 });
      for (const o of data ?? []) {
        if (o.id === null) await recorrer(`${p}/${o.name}`);
        else paths.push(`${p}/${o.name}`);
      }
    }
    await recorrer(raiz);
    if (paths.length) await supabase.storage.from("documentos").remove(paths);
    cargar();
  }

  return (
    <div className="cn-wrap">
      <div className="cn-bar">
        <div className="cn-crumbs">
          <button className="cn-crumb" onClick={() => setRuta([])}>{t("root")}</button>
          {ruta.map((seg, i) => (
            <span key={i} className="cn-crumb-seg">
              <span className="cn-crumb-sep">/</span>
              <button className="cn-crumb" onClick={() => setRuta(ruta.slice(0, i + 1))}>{seg}</button>
            </span>
          ))}
        </div>
        {editable && (
          <div className="cn-actions">
            <button className="cp-btn" onClick={crearCarpeta}>+ {t("newFolder")}</button>
            <label className="cp-btn cp-btn-acc cn-up">
              {subiendo ? t("uploading") : t("upload")}
              <input type="file" style={{ display: "none" }} disabled={subiendo} onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
            </label>
          </div>
        )}
      </div>

      {err && <div className="cn-err">⚠ {err}</div>}

      {cargando ? (
        <p className="cn-empty">{t("loading")}</p>
      ) : entradas.length === 0 ? (
        <div className="cn-vacia"><span className="hex" /><p>{t("emptyFolder")}</p></div>
      ) : (
        <div className="cn-grid">
          {entradas.map((e) => e.kind === "carpeta" ? (
            <div key={`c-${e.nombre}`} className="cn-item cn-folder">
              <button className="cn-open" onClick={() => setRuta([...ruta, e.nombre])} title={e.nombre}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></svg>
                <span className="cn-name">{e.nombre}</span>
              </button>
              {editable && <button className="cn-del" onClick={() => borrarCarpeta(e.nombre)} title={t("delete")}>✕</button>}
            </div>
          ) : (
            <div key={`a-${e.nombre}`} className="cn-item">
              <button className="cn-open" onClick={() => abrir(e.nombre)} title={limpio(e.nombre)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>
                <span className="cn-name">{limpio(e.nombre)}</span>
                <span className="cn-meta">{bytes(e.size)}</span>
              </button>
              {editable && <button className="cn-del" onClick={() => borrarArchivo(e.nombre)} title={t("delete")}>✕</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
