"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage } from "react-konva";
import { COLOR_CELDA, COLOR_CONFLICTO, COLOR_ESTADO, COLOR_FONDO, COLOR_TITULO,} from "./moodboardFotoColores";
import { ALTO_CELDA, ALTO_MINIMO, ALTO_TITULO, ANCHO_CELDA_IDEAL, GROSOR_BORDE, MARGEN, OPACIDAD_DESCARTADA, RELLENO_TITULO_X, RELLENO_TITULO_Y, TAMANO_TITULO,} from "./moodboardFotoMedidas";
import type { FilaReferencia } from "./useMoodboardFotoFilas";

type Props = {
  referencias: FilaReferencia[];
  urls: Record<string, string>;
  conflictos: Set<string>;
  onAbrir: (id: string) => void;
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

// Lienzo del moodboard de Fotografía (estilo Collage). Se carga solo en el cliente.
export default function MoodboardFotoLienzo({ referencias, urls, conflictos, onAbrir }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  // Rutas de imagen cuya carga ya se ha pedido, para no repetirla.
  const cargadas = useRef<Set<string>>(new Set());

  const [ancho, setAncho] = useState(0);
  // Imágenes ya cargadas, por ruta de Storage.
  const [imagenes, setImagenes] = useState<Record<string, HTMLImageElement>>({});

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

  // Cuadrícula automática: cuántas columnas caben y cuánto mide cada celda.
  const columnas = Math.max(1, Math.floor(ancho / ANCHO_CELDA_IDEAL));
  const anchoCelda = ancho / columnas;
  const filas = Math.ceil(referencias.length / columnas);
  const alto = Math.max(ALTO_MINIMO, filas * ALTO_CELDA);

  // Cursor de mano al pasar por encima de una referencia.
  function cursor(ev: Konva.KonvaEventObject<MouseEvent>, valor: string) {
    const contenedor = ev.target.getStage()?.container();
    if (contenedor) contenedor.style.cursor = valor;
  }

  return (
    <div ref={contenedorRef} className="mb-lienzo">
      {ancho > 0 && (
        <Stage width={ancho} height={alto}>
          <Layer>
            <Rect x={0} y={0} width={ancho} height={alto} fill={COLOR_FONDO} listening={false} />

            {referencias.map((r, i) => {
              const d = r.datos;
              const x = (i % columnas) * anchoCelda + MARGEN / 2;
              const y = Math.floor(i / columnas) * ALTO_CELDA + MARGEN / 2;
              const anchoUtil = anchoCelda - MARGEN;
              const altoUtil = ALTO_CELDA - MARGEN;
              const img = imagenes[d.ruta];

              // La imagen se ajusta dentro de su celda sin deformarse y se centra.
              const zonaAlto = altoUtil - ALTO_TITULO;
              const escala = img ? Math.min(anchoUtil / img.naturalWidth, zonaAlto / img.naturalHeight) : 1;
              const anchoImg = img ? img.naturalWidth * escala : 0;
              const altoImg = img ? img.naturalHeight * escala : 0;

              const color = conflictos.has(r.id) ? COLOR_CONFLICTO : COLOR_ESTADO[d.estado];

              return (
                <Group
                  key={r.id}
                  x={x}
                  y={y}
                  opacity={d.estado === "descartada" ? OPACIDAD_DESCARTADA : 1}
                  onClick={() => onAbrir(r.id)}
                  onTap={() => onAbrir(r.id)}
                  onMouseEnter={(ev) => cursor(ev, "pointer")}
                  onMouseLeave={(ev) => cursor(ev, "default")}
                >
                  <Rect width={anchoUtil} height={altoUtil} fill={COLOR_CELDA} stroke={color} strokeWidth={GROSOR_BORDE} />
                  {img && (
                    <KonvaImage
                      image={img}
                      x={(anchoUtil - anchoImg) / 2}
                      y={(zonaAlto - altoImg) / 2}
                      width={anchoImg}
                      height={altoImg}
                    />
                  )}
                  <Text
                    x={RELLENO_TITULO_X}
                    y={altoUtil - ALTO_TITULO + RELLENO_TITULO_Y}
                    width={anchoUtil - 2 * RELLENO_TITULO_X}
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
          </Layer>
        </Stage>
      )}
    </div>
  );
}