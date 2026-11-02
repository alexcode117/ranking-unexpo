import { rangoPorPercentil, type Rango, type Tema } from "./temas";

// Una fila tal como la devuelve la función SQL puntajes().
export type Puntaje = {
  seccion_id: string;
  seccion: string;
  estudiante_id: string;
  nombre: string;
  cedula: string; // ya enmascarada
  puntos: number;
  puntos_previos: number;
  evaluado: number;
  evaluado_previo: number;
};

export type FilaRanking = Puntaje & {
  posicion: number;
  rango: Rango;
  // Puestos ganados (+) o perdidos (−) desde la evaluación anterior; null si no aplica.
  tendencia: number | null;
  rendimiento: number; // 0–1, puntos / evaluado
  // Solo en ranking por sección: puntos que faltan para entrar al rango siguiente.
  siguiente?: { rango: Rango; faltan: number };
};

// Ranking de competencia: empates comparten puesto (1, 2, 2, 4).
function posiciones<T>(items: T[], valor: (x: T) => number): Map<T, number> {
  const ordenados = [...items].sort((a, b) => valor(b) - valor(a));
  const out = new Map<T, number>();
  ordenados.forEach((x, i) => {
    const anterior = ordenados[i - 1];
    out.set(x, anterior && valor(anterior) === valor(x) ? out.get(anterior)! : i + 1);
  });
  return out;
}

function rankear(
  filas: Puntaje[],
  tema: Tema,
  actual: (p: Puntaje) => number,
  previo: ((p: Puntaje) => number) | null,
): FilaRanking[] {
  const n = filas.length;
  const ahora = posiciones(filas, actual);
  const antes = previo ? posiciones(filas, previo) : null;
  return filas
    .map((f) => {
      const posicion = ahora.get(f)!;
      return {
        ...f,
        posicion,
        rango: rangoPorPercentil(tema, (posicion - 1) / n),
        tendencia: antes ? antes.get(f)! - posicion : null,
        rendimiento: f.evaluado > 0 ? f.puntos / f.evaluado : 0,
      };
    })
    .sort((a, b) => a.posicion - b.posicion || a.nombre.localeCompare(b.nombre, "es"));
}

// Dentro de una sección todos tienen el mismo plan: se comparan puntos absolutos.
// Además calcula cuántos puntos le faltan a cada uno para alcanzar el rango siguiente.
export function rankingSeccion(filas: Puntaje[], tema: Tema): FilaRanking[] {
  const hayPrevio = filas.some((f) => f.evaluado_previo > 0);
  const ranking = rankear(filas, tema, (f) => f.puntos, hayPrevio ? (f) => f.puntos_previos : null);
  const minimoPorRango = new Map<string, number>();
  for (const f of ranking) {
    const m = minimoPorRango.get(f.rango.codigo);
    if (m === undefined || f.puntos < m) minimoPorRango.set(f.rango.codigo, f.puntos);
  }
  return ranking.map((f) => {
    const i = tema.rangos.findIndex((r) => r.codigo === f.rango.codigo);
    // El rango inmediatamente mejor que tenga a alguien dentro.
    for (let j = i - 1; j >= 0; j--) {
      const minimo = minimoPorRango.get(tema.rangos[j].codigo);
      if (minimo !== undefined && minimo > f.puntos) {
        return { ...f, siguiente: { rango: tema.rangos[j], faltan: minimo - f.puntos } };
      }
    }
    return f;
  });
}

// Cuántas filas hay en cada rango, en el orden de la escala.
export function distribucion(filas: FilaRanking[], tema: Tema) {
  return tema.rangos.map((r) => ({ rango: r, cantidad: filas.filter((f) => f.rango.codigo === r.codigo).length }));
}

// Entre secciones el avance difiere: se compara el rendimiento (puntos / evaluado).
export function rankingMateria(filas: Puntaje[], tema: Tema): FilaRanking[] {
  const rend = (p: number, e: number) => (e > 0 ? p / e : 0);
  const hayPrevio = filas.some((f) => f.evaluado_previo > 0);
  return rankear(
    filas,
    tema,
    (f) => rend(f.puntos, f.evaluado),
    hayPrevio ? (f) => rend(f.puntos_previos, f.evaluado_previo) : null,
  );
}

const fmt = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });
export const formatear = (n: number) => fmt.format(n);
export const porcentaje = (n: number) => `${fmt.format(n * 100)} %`;
