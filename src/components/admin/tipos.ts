export type Evaluacion = { id: string; nombre: string; puntos: number; orden: number };
export type Estudiante = { id: string; cedula: string; nombre: string };
// notas[evaluacionId][estudianteId] = puntos
export type Notas = Record<string, Record<string, number>>;
