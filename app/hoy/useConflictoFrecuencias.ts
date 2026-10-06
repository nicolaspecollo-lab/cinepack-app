import { useMemo } from "react";

export type EstadoAprobacion = "pendiente" | "aprobada";
export type NivelInterferencia = "ok" | "advertencia" | "conflicto";

export type FrecuenciaDatos = {
  jornada: string;
  equipo: string;
  modelo_fabricante?: string;
  departamento_responsable: string;
  frecuencia_mhz: number | null; // en MHz — umbrales de Nicolás están en kHz (400 kHz = 0.4 MHz)
  frecuencia_sugerida_mhz?: number;
  estado_aprobacion: EstadoAprobacion;
  creado_por_departamento: string;
  notas?: string;
};

export type ResultadoInterferencia = {
  nivel: NivelInterferencia;
  motivo?: "separacion_portadora" | "intermodulacion";
  causadoPor?: string[];
};

const UMBRAL_PORTADORA_MHZ = 0.4;
const TOLERANCIA_PORTADORA_MHZ = 0.5;
const UMBRAL_INTERMODULACION_MHZ = 0.1;
const TOLERANCIA_INTERMODULACION_MHZ = 0.15;

export function useConflictoFrecuencias(
  filas: Array<{ id: string; datos: FrecuenciaDatos }>
): Array<{ id: string; datos: FrecuenciaDatos; resultado: ResultadoInterferencia }> {
  return useMemo(() => {
    const resultados = new Map<string, ResultadoInterferencia>();
    filas.forEach((f) => resultados.set(f.id, { nivel: "ok" }));

    const porJornada = new Map<string, Array<{ id: string; freq: number }>>();
    for (const fila of filas) {
      if (fila.datos.frecuencia_mhz === null) continue;
      const lista = porJornada.get(fila.datos.jornada) ?? [];
      lista.push({ id: fila.id, freq: Number(fila.datos.frecuencia_mhz) });
      porJornada.set(fila.datos.jornada, lista);
    }

    const marcar = (id: string, nivel: NivelInterferencia, motivo: ResultadoInterferencia["motivo"], otroId: string) => {
      const actual = resultados.get(id)!;
      if (actual.nivel === "conflicto" && nivel !== "conflicto") return;
      if (actual.nivel === "advertencia" && nivel === "ok") return;
      resultados.set(id, {
        nivel: actual.nivel === "conflicto" ? "conflicto" : nivel,
        motivo: actual.nivel === "conflicto" ? actual.motivo : motivo,
        causadoPor: [...new Set([...(actual.causadoPor ?? []), otroId])],
      });
    };

    for (const [, activas] of porJornada) {
      for (let i = 0; i < activas.length; i++) {
        for (let j = i + 1; j < activas.length; j++) {
          const diff = Math.abs(activas[i].freq - activas[j].freq);
          if (diff <= UMBRAL_PORTADORA_MHZ) {
            marcar(activas[i].id, "conflicto", "separacion_portadora", activas[j].id);
            marcar(activas[j].id, "conflicto", "separacion_portadora", activas[i].id);
          } else if (diff <= TOLERANCIA_PORTADORA_MHZ) {
            marcar(activas[i].id, "advertencia", "separacion_portadora", activas[j].id);
            marcar(activas[j].id, "advertencia", "separacion_portadora", activas[i].id);
          }
        }
      }

      for (let i = 0; i < activas.length; i++) {
        for (let j = i + 1; j < activas.length; j++) {
          const { id: idA, freq: f1 } = activas[i];
          const { id: idB, freq: f2 } = activas[j];
          const productos = [2 * f1 - f2, 2 * f2 - f1];

          for (const tercera of activas) {
            if (tercera.id === idA || tercera.id === idB) continue;
            for (const p of productos) {
              const distancia = Math.abs(tercera.freq - p);
              if (distancia <= UMBRAL_INTERMODULACION_MHZ) {
                marcar(idA, "conflicto", "intermodulacion", tercera.id);
                marcar(idB, "conflicto", "intermodulacion", tercera.id);
                marcar(tercera.id, "conflicto", "intermodulacion", idA);
                marcar(tercera.id, "conflicto", "intermodulacion", idB);
              } else if (distancia <= TOLERANCIA_INTERMODULACION_MHZ) {
                marcar(idA, "advertencia", "intermodulacion", tercera.id);
                marcar(idB, "advertencia", "intermodulacion", tercera.id);
                marcar(tercera.id, "advertencia", "intermodulacion", idA);
                marcar(tercera.id, "advertencia", "intermodulacion", idB);
              }
            }
          }
        }
      }
    }

    return filas.map((fila) => ({
      id: fila.id,
      datos: fila.datos,
      resultado: resultados.get(fila.id)!,
    }));
  }, [filas]);
}