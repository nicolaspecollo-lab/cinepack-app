"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type Konva from "konva";
import { Stage, Layer, Rect, Text, Group, Transformer, Image as KonvaImage } from "react-konva";
import { createClient } from "@/lib/supabase/client";
import { safeKey } from "../lib/storageKey";
import {
  MOODBOARD_DEPARTAMENTO,
  MOODBOARD_HERRAMIENTA_ID,
  type ElementoImagen,
  type ElementoMoodboard,
  type ElementoNota,
} from "./moodboardFilas";

type Props = {
  elementos: ElementoMoodboard[];
  editable: boolean;
  guardar: (elementos: ElementoMoodboard[]) => Promise<void>;
};

// Alto fijo del tablero; el ancho se adapta al contenedor.
const ALTO_TABLERO = 560;
// Tamaño mínimo de un elemento al redimensionarlo.
const MINIMO = 60;
// Ancho máximo con el que entra una imagen recién subida.
const ANCHO_INICIAL_IMAGEN = 320;
// Colores del lienzo (van dentro del <canvas>, el CSS no llega).
const COLOR_FONDO = "#15151c";
const COLOR_NOTA = "#f2d16b";
const COLOR_TEXTO_NOTA = "#15151c";
const COLOR_HUECO_IMAGEN = "#2a2a35";

type Geometria = Partial<Pick<ElementoMoodboard, "x" | "y" | "ancho" | "alto" | "rotacion">>;

// Carga una imagen del navegador. crossOrigin permite luego exportar el tablero a PNG.
function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

// Lienzo del moodboard. Se carga solo en el cliente (Konva necesita el navegador).
export default function MoodboardLienzo({ elementos, editable, guardar }: Props) {
  const t = useTranslations("moodboard");
  const contenedorRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const escenarioRef = useRef<Konva.Stage>(null);
  const entradaArchivoRef = useRef<HTMLInputElement>(null);
  const nodos = useRef<Record<string, Konva.Group | null>>({});
  // Rutas de imagen cuya carga ya se ha pedido, para no repetirla.
  const cargadas = useRef<Set<string>>(new Set());

  const [ancho, setAncho] = useState(0);
  // Copia local: todo lo que se hace en el tablero cambia esto; GUARDAR lo envía a la base de datos.
  const [items, setItems] = useState<ElementoMoodboard[]>(elementos);
  // Imágenes ya cargadas, por ruta de Storage.
  const [imagenes, setImagenes] = useState<Record<string, HTMLImageElement>>({});
  const [seleccion, setSeleccion] = useState<string | null>(null);
  // Nota cuyo texto se está editando sobre el tablero (doble clic).
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);

  // Medimos el contenedor y lo seguimos si la ventana cambia de tamaño.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Las imágenes guardadas se piden a Storage con URLs temporales (1 h) y se cargan una sola vez.
  useEffect(() => {
    const rutas = elementos.flatMap((e) => (e.tipo === "imagen" && !cargadas.current.has(e.ruta) ? [e.ruta] : []));
    if (rutas.length === 0) return;
    rutas.forEach((r) => cargadas.current.add(r));
    createClient()
      .storage.from("documentos")
      .createSignedUrls(rutas, 3600)
      .then(({ data, error }) => {
        if (error) {
          setErrorSubida(error.message);
          return;
        }
        (data ?? []).forEach(async (item) => {
          if (!item.signedUrl || !item.path) return;
          const ruta = item.path;
          try {
            const img = await cargarImagen(item.signedUrl);
            setImagenes((prev) => ({ ...prev, [ruta]: img }));
          } catch (e) {
            setErrorSubida(e instanceof Error ? e.message : String(e));
          }
        });
      });
  }, [elementos]);

  // El transformador (tiradores de tamaño y giro) se engancha al elemento seleccionado.
  // Mientras se edita el texto de una nota, no se muestra.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodo = seleccion && editable && !editando ? nodos.current[seleccion] : null;
    tr.nodes(nodo ? [nodo] : []);
    tr.moveToTop();
    tr.getLayer()?.batchDraw();
  }, [seleccion, editando, editable, items, imagenes, ancho]);

  function anadirNota() {
    const desplazamiento = (items.length % 6) * 24;
    const nueva: ElementoNota = {
      id: crypto.randomUUID(),
      tipo: "nota",
      x: 40 + desplazamiento,
      y: 40 + desplazamiento,
      ancho: 200,
      alto: 140,
      rotacion: 0,
      texto: t("noteDefault"),
    };
    setItems([...items, nueva]);
    setSeleccion(nueva.id);
  }

  // Sube la imagen elegida a Storage y la añade al tablero.
  async function subirImagen(ev: React.ChangeEvent<HTMLInputElement>) {
    const archivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!archivo) return;
    const projectId = localStorage.getItem("cinepack-proyecto-id");
    if (!projectId) {
      setErrorSubida(t("noProject"));
      return;
    }
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const supabase = createClient();
      const ruta = `${projectId}/${safeKey(MOODBOARD_DEPARTAMENTO)}/herramientas/${safeKey(MOODBOARD_HERRAMIENTA_ID)}/_tablero/${Date.now()}-${safeKey(archivo.name)}`;
      const { error: errSubida } = await supabase.storage.from("documentos").upload(ruta, archivo);
      if (errSubida) throw errSubida;
      const { data, error: errFirma } = await supabase.storage.from("documentos").createSignedUrl(ruta, 3600);
      if (errFirma || !data) throw errFirma ?? new Error("No se pudo firmar la URL de la imagen");
      const img = await cargarImagen(data.signedUrl);
      cargadas.current.add(ruta);
      setImagenes((prev) => ({ ...prev, [ruta]: img }));

      const escala = Math.min(1, ANCHO_INICIAL_IMAGEN / img.naturalWidth);
      const desplazamiento = (items.length % 6) * 24;
      const nueva: ElementoImagen = {
        id: crypto.randomUUID(),
        tipo: "imagen",
        x: 40 + desplazamiento,
        y: 40 + desplazamiento,
        ancho: Math.round(img.naturalWidth * escala),
        alto: Math.round(img.naturalHeight * escala),
        rotacion: 0,
        ruta,
      };
      setItems((prev) => [...prev, nueva]);
      setSeleccion(nueva.id);
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : String(e));
    } finally {
      setSubiendo(false);
    }
  }

  // Seleccionar también trae el elemento al frente (el último de la lista se dibuja encima).
  function seleccionar(id: string) {
    if (!editable) return;
    setSeleccion(id);
    setItems((prev) => {
      const elegido = prev.find((e) => e.id === id);
      if (!elegido || prev[prev.length - 1].id === id) return prev;
      return [...prev.filter((e) => e.id !== id), elegido];
    });
  }

  function cambiarGeometria(id: string, cambios: Geometria) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  function cambiarTexto(id: string, texto: string) {
    setItems((prev) => prev.map((e) => (e.id === id && e.tipo === "nota" ? { ...e, texto } : e)));
  }

  function eliminar() {
    if (!seleccion) return;
    setItems((prev) => prev.filter((e) => e.id !== seleccion));
    setSeleccion(null);
    setEditando(null);
  }

  // Exporta el tablero a PNG. Se ocultan los tiradores un instante para que no salgan en la imagen.
  function descargar() {
    const escenario = escenarioRef.current;
    if (!escenario) return;
    const transformador = transformerRef.current;
    try {
      transformador?.visible(false);
      escenario.draw();
      const url = escenario.toDataURL({ mimeType: "image/png", pixelRatio: 2 });
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `moodboard-${new Date().toISOString().slice(0, 10)}.png`;
      enlace.click();
      setErrorSubida(null);
    } catch (e) {
      setErrorSubida(e instanceof Error ? e.message : String(e));
    } finally {
      transformador?.visible(true);
      escenario.draw();
    }
  }

  async function guardarTablero() {
    setGuardando(true);
    await guardar(items);
    setGuardando(false);
  }

  // Props comunes a notas e imágenes: arrastrar, seleccionar y convertir la escala en tamaño real.
  function propsElemento(e: ElementoMoodboard) {
    return {
      x: e.x,
      y: e.y,
      rotation: e.rotacion,
      draggable: editable && editando !== e.id,
      onMouseDown: () => seleccionar(e.id),
      onTouchStart: () => seleccionar(e.id),
      onDragEnd: (ev: Konva.KonvaEventObject<DragEvent>) =>
        cambiarGeometria(e.id, { x: ev.target.x(), y: ev.target.y() }),
      onTransformEnd: (ev: Konva.KonvaEventObject<Event>) => {
        // Konva escala el grupo; lo convertimos a ancho/alto reales y reseteamos la escala.
        const nodo = ev.target;
        const sx = nodo.scaleX();
        const sy = nodo.scaleY();
        nodo.scaleX(1);
        nodo.scaleY(1);
        cambiarGeometria(e.id, {
          x: nodo.x(),
          y: nodo.y(),
          rotacion: nodo.rotation(),
          ancho: Math.max(MINIMO, e.ancho * sx),
          alto: Math.max(MINIMO, e.alto * sy),
        });
      },
    };
  }

  const elementoSeleccionado = items.find((e) => e.id === seleccion);
  const notaEditando = items.find((e): e is ElementoNota => e.id === editando && e.tipo === "nota");

  return (
    <>
      {editable && (
        <div className="mb-barra">
          <button className="cp-btn" onClick={() => entradaArchivoRef.current?.click()} disabled={subiendo}>
            + {t("addImage")}
          </button>
          <button className="cp-btn" onClick={anadirNota}>
            + {t("addNote")}
          </button>
          <button className="cp-btn" onClick={eliminar} disabled={!seleccion}>
            {t("delete")}
          </button>
          <button className="cp-btn cp-btn-acc" onClick={guardarTablero} disabled={guardando}>
            {t("save")}
          </button>
          <button className="cp-btn" onClick={descargar}>
            {t("download")}
          </button>
          <input ref={entradaArchivoRef} type="file" accept="image/*" hidden onChange={subirImagen} />
        </div>
      )}

      {errorSubida && <p className="amsg err">{errorSubida}</p>}

      <div ref={contenedorRef} className="mb-lienzo">
        {ancho > 0 && (
          <Stage
            ref={escenarioRef}
            width={ancho}
            height={ALTO_TABLERO}
            onMouseDown={(ev) => {
              // Clic en el fondo vacío: se deselecciona.
              if (ev.target === ev.target.getStage()) setSeleccion(null);
            }}
            onTouchStart={(ev) => {
              if (ev.target === ev.target.getStage()) setSeleccion(null);
            }}
          >
            <Layer>
              <Rect x={0} y={0} width={ancho} height={ALTO_TABLERO} fill={COLOR_FONDO} listening={false} />

              {items.map((e) => (
                <Group
                  key={e.id}
                  ref={(nodo) => {
                    nodos.current[e.id] = nodo;
                  }}
                  {...propsElemento(e)}
                  onDblClick={() => e.tipo === "nota" && editable && setEditando(e.id)}
                  onDblTap={() => e.tipo === "nota" && editable && setEditando(e.id)}
                >
                  {e.tipo === "nota" ? (
                    <>
                      <Rect width={e.ancho} height={e.alto} fill={COLOR_NOTA} />
                      <Text
                        width={e.ancho}
                        height={e.alto}
                        padding={10}
                        text={e.texto}
                        fontSize={14}
                        lineHeight={1.2}
                        fill={COLOR_TEXTO_NOTA}
                        visible={editando !== e.id}
                      />
                    </>
                  ) : (
                    <>
                      <Rect width={e.ancho} height={e.alto} fill={COLOR_HUECO_IMAGEN} />
                      <KonvaImage image={imagenes[e.ruta]} width={e.ancho} height={e.alto} />
                    </>
                  )}
                </Group>
              ))}

              {editable && (
                <Transformer
                  ref={transformerRef}
                  keepRatio={elementoSeleccionado?.tipo === "imagen"}
                  boundBoxFunc={(anterior, nuevo) =>
                    nuevo.width < MINIMO || nuevo.height < MINIMO ? anterior : nuevo
                  }
                />
              )}
            </Layer>
          </Stage>
        )}

        {editable && notaEditando && (
          <textarea
            className="hp-cell-area mb-editor"
            autoFocus
            onFocus={(ev) => ev.target.select()}
            value={notaEditando.texto}
            onChange={(ev) => cambiarTexto(notaEditando.id, ev.target.value)}
            onBlur={() => setEditando(null)}
            onKeyDown={(ev) => {
              if (ev.key === "Escape") setEditando(null);
            }}
            style={{
              left: notaEditando.x,
              top: notaEditando.y,
              width: notaEditando.ancho,
              height: notaEditando.alto,
              transform: `rotate(${notaEditando.rotacion}deg)`,
            }}
          />
        )}
      </div>
    </>
  );
}