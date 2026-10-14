"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type Konva from "konva";
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage, Transformer } from "react-konva";
import {
  COLOR_CELDA,
  COLOR_CONFLICTO,
  COLOR_ESTADO,
  COLOR_FONDO,
  COLOR_TITULO,
} from "./moodboardFotoColores";
import { cajaOcupada, meterDentro } from "./moodboardFotoLimites";
import {
  ALTO_CELDA,
  ALTO_MINIMO,
  ALTO_TITULO,
  ANCHO_CELDA_IDEAL,
  GROSOR_BORDE,
  MARGEN,
  OPACIDAD_DESCARTADA,
  RELLENO_TITULO_X,
  RELLENO_TITULO_Y,
  TAMANO_MINIMO,
  TAMANO_TITULO,
} from "./moodboardFotoMedidas";
import type { Geometria } from "./moodboardFotoFilas";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  referencias: FilaReferencia[];
  urls: Record<string, string>;
  conflictos: Set<string>;
  editable: boolean;
  onAbrir: (id: string) => void;
  onGuardar: (cambios: Record<string, Geometria>) => Promise<void>;
};

// Carga una imagen del navegador a partir de su URL firmada.
function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

// Dos geometrías son iguales si coinciden en los cinco valores.
function mismaGeometria(a: Geometria, b: Geometria | undefined): boolean {
  return !!b && a.x === b.x && a.y === b.y && a.ancho === b.ancho && a.alto === b.alto && a.rotacion === b.rotacion;
}

// Lienzo del moodboard de Fotografía (estilo Collage). Se carga solo en el cliente.
export default function MoodboardFotoLienzo({ referencias, urls, conflictos, editable, onAbrir, onGuardar }: Props) {
  const t = useTranslations("moodboardFoto");
  const contenedorRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodos = useRef<Record<string, Konva.Group | null>>({});
  // Rutas de imagen cuya carga ya se ha pedido, para no repetirla.
  const cargadas = useRef<Set<string>>(new Set());

  const [ancho, setAncho] = useState(0);
  // Imágenes ya cargadas, por ruta de Storage.
  const [imagenes, setImagenes] = useState<Record<string, HTMLImageElement>>({});
  const [seleccion, setSeleccion] = useState<string | null>(null);
  // Posiciones cambiadas en el lienzo que todavía no se han guardado, por id de referencia.
  const [pendientes, setPendientes] = useState<Record<string, Geometria>>({});
  const [guardando, setGuardando] = useState(false);

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

  // Cada imagen se carga una sola vez, cuando ya tiene URL firmada.
  useEffect(() => {
    referencias.forEach((r) => {
      const ruta = r.datos.ruta;
      const url = urls[ruta];
      if (!ruta || !url || cargadas.current.has(ruta)) return;
      cargadas.current.add(ruta);
      cargarImagen(url)
        .then((img) => setImagenes((prev) => ({ ...prev, [ruta]: img })))
        .catch(() => cargadas.current.delete(ruta));
    });
  }, [referencias, urls]);

  // El transformador (tiradores de tamaño y giro) se engancha a la referencia seleccionada.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodo = seleccion && editable ? nodos.current[seleccion] : null;
    tr.nodes(nodo ? [nodo] : []);
    tr.moveToTop();
    tr.getLayer()?.batchDraw();
  }, [seleccion, editable, referencias, pendientes, imagenes, ancho]);

  // Cuadrícula automática: cuántas columnas caben y cuánto mide cada celda.
  const columnas = Math.max(1, Math.floor(ancho / ANCHO_CELDA_IDEAL));
  const anchoCelda = ancho / columnas;
  const filas = Math.ceil(referencias.length / columnas);

  // Dónde y con qué tamaño se dibuja cada referencia: lo cambiado sin guardar, si no lo guardado
  // y, si nunca se ha movido, su sitio en la cuadrícula automática (ajustada a la imagen).
  // Lo guardado se mete dentro del lienzo: así se rescatan las referencias que quedaron fuera.
  function geometriaDe(r: FilaReferencia, i: number): Geometria {
    const propia = pendientes[r.id] ?? r.datos.geometria;
    if (propia) return ancho > 0 ? meterDentro(propia, ancho) : propia;
    const x = (i % columnas) * anchoCelda + MARGEN / 2;
    const y = Math.floor(i / columnas) * ALTO_CELDA + MARGEN / 2;
    const anchoUtil = anchoCelda - MARGEN;
    const altoUtil = ALTO_CELDA - MARGEN;
    const img = imagenes[r.datos.ruta];
    if (!img) return { x, y, ancho: anchoUtil, alto: altoUtil, rotacion: 0 };
    const escala = Math.min(anchoUtil / img.naturalWidth, (altoUtil - ALTO_TITULO) / img.naturalHeight);
    return { x, y, ancho: img.naturalWidth * escala, alto: img.naturalHeight * escala + ALTO_TITULO, rotacion: 0 };
  }

  const elementos = referencias.map((r, i) => ({ r, g: geometriaDe(r, i) }));
  // La referencia seleccionada se dibuja la última para que quede por encima de las demás.
  const dibujadas = seleccion
    ? [...elementos.filter((e) => e.r.id !== seleccion), ...elementos.filter((e) => e.r.id === seleccion)]
    : elementos;

  // Se usa la caja real de cada referencia (con su giro), no solo y + alto, para que no se corte la esquina más baja.
  const fondo = Math.max(0, ...elementos.map((e) => cajaOcupada(e.g).maxY)) + MARGEN;
  const alto = Math.max(ALTO_MINIMO, filas * ALTO_CELDA, fondo);

  // Cambios aún sin guardar: los que difieren de lo que ya hay en la base de datos.
  const sinGuardar = Object.entries(pendientes).filter(
    ([id, g]) => !mismaGeometria(g, referencias.find((r) => r.id === id)?.datos.geometria),
  );

  function cambiar(id: string, g: Geometria) {
    setPendientes((prev) => ({
      ...prev,
      [id]: {
        x: Math.round(g.x),
        y: Math.round(g.y),
        ancho: Math.round(g.ancho),
        alto: Math.round(g.alto),
        rotacion: Math.round(g.rotacion),
      },
    }));
  }

  async function guardar() {
    setGuardando(true);
    await onGuardar(Object.fromEntries(sinGuardar));
    setGuardando(false);
  }

  // Cursor de mano (o de mover, si se puede arrastrar) al pasar por encima de una referencia.
  function cursor(ev: Konva.KonvaEventObject<MouseEvent>, valor: string) {
    const contenedor = ev.target.getStage()?.container();
    if (contenedor) contenedor.style.cursor = valor;
  }

  return (
    <>
      {editable && (
        <>
          <div className="mb-barra">
            <button className="cp-btn cp-btn-acc" onClick={guardar} disabled={guardando || sinGuardar.length === 0}>
              {guardando ? t("saving") : t("saveLayout")}
            </button>
          </div>
          <p className="amsg">{t("collageHint")}</p>
        </>
      )}

      <div ref={contenedorRef} className="mb-lienzo">
        {ancho > 0 && (
          <Stage
            width={ancho}
            height={alto}
            onMouseDown={(ev) => {
              // Clic en el fondo vacío: se deselecciona.
              if (ev.target === ev.target.getStage()) setSeleccion(null);
            }}
            onTouchStart={(ev) => {
              if (ev.target === ev.target.getStage()) setSeleccion(null);
            }}
          >
            <Layer>
              <Rect x={0} y={0} width={ancho} height={alto} fill={COLOR_FONDO} listening={false} />

              {dibujadas.map(({ r, g }) => {
                const d = r.datos;
                const img = imagenes[d.ruta];
                const color = conflictos.has(r.id) ? COLOR_CONFLICTO : COLOR_ESTADO[d.estado];
                const abrir = () => onAbrir(r.id);

                return (
                  <Group
                    key={r.id}
                    ref={(nodo) => {
                      nodos.current[r.id] = nodo;
                    }}
                    x={g.x}
                    y={g.y}
                    rotation={g.rotacion}
                    opacity={d.estado === "descartada" ? OPACIDAD_DESCARTADA : 1}
                    draggable={editable}
                    // Mientras se arrastra, la referencia no puede salir por arriba, izquierda ni derecha.
                    dragBoundFunc={(pos) => {
                      const dentro = meterDentro({ ...g, x: pos.x, y: pos.y }, ancho);
                      return { x: dentro.x, y: dentro.y };
                    }}
                    onMouseDown={() => editable && setSeleccion(r.id)}
                    onTouchStart={() => editable && setSeleccion(r.id)}
                    onClick={editable ? undefined : abrir}
                    onTap={editable ? undefined : abrir}
                    onDblClick={editable ? abrir : undefined}
                    onDblTap={editable ? abrir : undefined}
                    onMouseEnter={(ev) => cursor(ev, editable ? "move" : "pointer")}
                    onMouseLeave={(ev) => cursor(ev, "default")}
                    onDragEnd={(ev) => cambiar(r.id, { ...g, x: ev.target.x(), y: ev.target.y() })}
                    onTransformEnd={(ev) => {
                      // Konva escala el grupo; lo convertimos a ancho/alto reales y reseteamos la escala.
                      const nodo = ev.target;
                      const sx = nodo.scaleX();
                      const sy = nodo.scaleY();
                      nodo.scaleX(1);
                      nodo.scaleY(1);
                      // Al escalar o girar también se puede salir del lienzo: se vuelve a meter dentro.
                      const nueva = meterDentro(
                        {
                          x: nodo.x(),
                          y: nodo.y(),
                          rotacion: nodo.rotation(),
                          ancho: Math.max(TAMANO_MINIMO, g.ancho * sx),
                          alto: Math.max(TAMANO_MINIMO, g.alto * sy),
                        },
                        ancho,
                      );
                      nodo.position({ x: nueva.x, y: nueva.y });
                      cambiar(r.id, nueva);
                    }}
                  >
                    <Rect width={g.ancho} height={g.alto} fill={COLOR_CELDA} stroke={color} strokeWidth={GROSOR_BORDE} />
                    {img && <KonvaImage image={img} width={g.ancho} height={g.alto - ALTO_TITULO} />}
                    <Text
                      x={RELLENO_TITULO_X}
                      y={g.alto - ALTO_TITULO + RELLENO_TITULO_Y}
                      width={g.ancho - 2 * RELLENO_TITULO_X}
                      height={ALTO_TITULO - 2 * RELLENO_TITULO_Y}
                      text={d.titulo}
                      fontSize={TAMANO_TITULO}
                      fill={COLOR_TITULO}
                      wrap="none"
                      ellipsis
                    />
                  </Group>
                );
              })}

              {editable && (
                <Transformer
                  ref={transformerRef}
                  keepRatio
                  boundBoxFunc={(anterior, nuevo) =>
                    nuevo.width < TAMANO_MINIMO || nuevo.height < TAMANO_MINIMO ? anterior : nuevo
                  }
                />
              )}
            </Layer>
          </Stage>
        )}
      </div>
    </>
  );
}