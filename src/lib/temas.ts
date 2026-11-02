// Cada materia elige un tema (columna materias.tema). El tema define la
// clase CSS que pinta la página y la escala de rangos de esa materia.
// Para una materia nueva: agregar un tema aquí y sus colores en globals.css.

export type Rango = {
  codigo: string;
  nombre: string;
  // Percentil superior (exclusivo) que cubre este rango: 0.05 = top 5 %.
  hasta: number;
  // Grosor del trazo de muestra: las minas blandas marcan más grueso.
  trazo: number;
};

export type Tema = {
  clase: string;
  lema: string;
  rangos: Rango[];
};

// Escala por dureza del lápiz: de lo más preciso (9H) a lo más blando (6B).
const lapiz: Rango[] = [
  { codigo: "9H", nombre: "Arquitecto del plano", hasta: 0.05, trazo: 0.9 },
  { codigo: "4H", nombre: "Maestro del trazo", hasta: 0.15, trazo: 1.4 },
  { codigo: "2H", nombre: "Proyectista", hasta: 0.3, trazo: 2 },
  { codigo: "HB", nombre: "Delineante", hasta: 0.5, trazo: 3 },
  { codigo: "2B", nombre: "Croquis", hasta: 0.7, trazo: 4.2 },
  { codigo: "4B", nombre: "Boceto", hasta: 0.85, trazo: 5.6 },
  { codigo: "6B", nombre: "Garabato", hasta: 1.01, trazo: 7.2 },
];

const temas: Record<string, Tema> = {
  dibujo: { clase: "tema-dibujo", lema: "Cada evaluación afila tu mina: del garabato 6B al trazo preciso 9H.", rangos: lapiz },
  "dibujo-ii": { clase: "tema-dibujo-ii", lema: "Vistas, cortes y proyecto final: cada lámina te acerca al 9H.", rangos: lapiz },
};

export function obtenerTema(nombre: string): Tema {
  return temas[nombre] ?? temas.dibujo;
}

export function rangoPorPercentil(tema: Tema, percentil: number): Rango {
  return tema.rangos.find((r) => percentil < r.hasta) ?? tema.rangos[tema.rangos.length - 1];
}
