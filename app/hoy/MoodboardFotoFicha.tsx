"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";
import {
  CATEGORIAS,
  MOODBOARD_FOTO_DEPARTAMENTO,
  MOODBOARD_FOTO_HERRAMIENTA_ID,
  NIVELES,
  type Categoria,
  type Nivel,
  type Referencia,
} from "./moodboardFotoFilas";
import { useEtiquetasMoodboardFoto } from "./useEtiquetasMoodboardFoto";

type Props = {
  onCerrar: () => void;
  onGuardar: (r: Referencia) => Promise<unknown>;
  textoSinProyecto: string;
};

export default function MoodboardFotoFicha({ onCerrar, onGuardar, textoSinProyecto }: Props) {
  const t = useTranslations("moodboardFoto");
  const { categorias, niveles } = useEtiquetasMoodboardFoto();
  const entradaArchivoRef = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("iluminacion");
  const [nivel, setNivel] = useState<Nivel>("general");
  const [destino, setDestino] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [queTomar, setQueTomar] = useState("");
  const [fuente, setFuente] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    if (!titulo.trim()) {
      setError(t("errTitle"));
      return;
    }
    if (!archivo) {
      setError(t("errImage"));
      return;
    }
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setError(textoSinProyecto);
      return;
    }

    setGuardando(true);
    const supabase = createClient();
    const ruta = `${projectId}/${safeKey(MOODBOARD_FOTO_DEPARTAMENTO)}/herramientas/${safeKey(MOODBOARD_FOTO_HERRAMIENTA_ID)}/_carpeta/${Date.now()}-${safeKey(archivo.name)}`;
    const { error: errSubida } = await supabase.storage.from("documentos").upload(ruta, archivo);
    if (errSubida) {
      setError(t("uploadError", { msg: errSubida.message }));
      setGuardando(false);
      return;
    }

    await onGuardar({
      titulo: titulo.trim(),
      categoria,
      nivel,
      destino: destino.trim(),
      descripcion: descripcion.trim(),
      queTomar: queTomar.trim(),
      fuente: fuente.trim(),
      etiquetas: etiquetas.split(",").map((e) => e.trim()).filter(Boolean),
      ruta,
      estado: "borrador",
      principal: false,
      comentarios: [],
    });
    setGuardando(false);
    onCerrar();
  }

  return (
    <div className="gdes-overlay" onClick={onCerrar}>
      <div className="gdes-detail" onClick={(e) => e.stopPropagation()}>
        <div className="gdes-detail-head">
          <h3><span className="hex" />{t("newReference")}</h3>
          <button type="button" className="gdes-close" onClick={onCerrar} aria-label={t("close")}>✕</button>
        </div>

        <input ref={entradaArchivoRef} type="file" accept="image/*" hidden onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        <div className="gdes-field">
          <div className="comn-dropzone" onClick={() => entradaArchivoRef.current?.click()}>
            <span className="comn-dropzone-hex">+</span>
            <span className="comn-dropzone-text">
              <b>{archivo ? archivo.name : t("dropTitle")}</b>
              <span>{t("dropHint")}</span>
            </span>
          </div>
        </div>

        <label className="gdes-field">
          <span>{t("fldTitle")}</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>

        <div className="gdes-field">
          <span>{t("fldLevel")}</span>
          <div className="cp-seg">
            {NIVELES.map((n) => (
              <button key={n} type="button" className={`cp-seg-cell${nivel === n ? " cp-seg-on" : ""}`} onClick={() => setNivel(n)}>
                {niveles[n]}
              </button>
            ))}
          </div>
        </div>

        <div className="gdes-field">
          <span>{t("fldCategory")}</span>
          <div className="cp-seg">
            {CATEGORIAS.map((c) => (
              <button key={c} type="button" className={`cp-seg-cell${categoria === c ? " cp-seg-on" : ""}`} onClick={() => setCategoria(c)}>
                {categorias[c]}
              </button>
            ))}
          </div>
        </div>

        <label className="gdes-field">
          <span>{t("fldDestination")}</span>
          <input value={destino} onChange={(e) => setDestino(e.target.value)} />
        </label>

        <label className="gdes-field">
          <span>{t("fldDescription")}</span>
          <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>

        <label className="gdes-field">
          <span>{t("fldTake")}</span>
          <textarea rows={2} value={queTomar} onChange={(e) => setQueTomar(e.target.value)} />
        </label>

        <label className="gdes-field">
          <span>{t("fldSource")}</span>
          <input value={fuente} onChange={(e) => setFuente(e.target.value)} />
        </label>

        <label className="gdes-field">
          <span>{t("fldTags")}</span>
          <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} />
        </label>

        {error && <p className="amsg err">{error}</p>}

        <div className="gdes-detail-actions">
          <button type="button" className="cp-btn cp-btn-acc" onClick={guardar} disabled={guardando}>
            {guardando ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}