// Datos de demostración: se usan solo cuando Supabase no está configurado,
// para poder ver el sitio público sin base de datos. Nombres ficticios.

import type { Lapso, Materia, Seccion } from "./datos";
import type { Puntaje } from "./ranking";

type Evaluacion = { id: string; seccion_id: string; nombre: string; puntos: number; orden: number };
type Estudiante = { id: string; cedula: string; nombre: string };

const nombres = ["Luis", "María", "Ana", "Carlos", "Daniela", "José", "Valeria", "Andrés", "Gabriela", "Miguel", "Sofía", "Javier", "Camila", "Ricardo", "Paola", "Diego", "Isabel", "Fernando", "Lucía", "Alejandro", "Mariana", "Samuel", "Verónica", "Héctor", "Elena", "Rafael", "Natalia", "Óscar"];
const apellidos = ["Pérez", "González", "Rojas", "Medina", "Suárez", "Ramírez", "Castro", "Hernández", "Rodríguez", "Martínez", "López", "Díaz", "Moreno", "Álvarez", "Romero", "Torres", "Blanco", "Silva", "Gutiérrez", "Mendoza", "Rivas", "Salazar", "Guzmán", "Marcano"];

// Generador pseudoaleatorio con semilla para que la demo sea estable.
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const materias: Materia[] = [
  { id: "m1", slug: "dibujo-1", nombre: "Dibujo Técnico I", tema: "dibujo" },
  { id: "m2", slug: "dibujo-2", nombre: "Dibujo Técnico II", tema: "dibujo-ii" },
];

export const lapsos: Lapso[] = [
  { id: "l2", codigo: "2026-II", activo: true },
  { id: "l1", codigo: "2026-I", activo: false },
];

export const secciones: Seccion[] = [
  { id: "s1", materia_id: "m1", lapso_id: "l2", codigo: "01" },
  { id: "s2", materia_id: "m1", lapso_id: "l2", codigo: "02" },
  { id: "s3", materia_id: "m2", lapso_id: "l2", codigo: "01" },
  { id: "s4", materia_id: "m1", lapso_id: "l1", codigo: "01" },
];

const planes: Record<string, [string, number, boolean][]> = {
  s1: [["Lámina 1 · Caligrafía técnica", 15, true], ["Lámina 2 · Construcciones geométricas", 20, true], ["Parcial 1", 25, true], ["Lámina 3 · Proyecciones", 20, false], ["Parcial 2", 20, false]],
  s2: [["Lámina 1 · Caligrafía técnica", 15, true], ["Lámina 2 · Construcciones geométricas", 20, true], ["Parcial 1", 25, false], ["Lámina 3 · Proyecciones", 20, false], ["Parcial 2", 20, false]],
  s3: [["Lámina 1 · Vistas auxiliares", 20, true], ["Lámina 2 · Cortes y secciones", 20, true], ["Parcial 1", 30, false], ["Proyecto final", 30, false]],
  s4: [["Lámina 1", 20, true], ["Lámina 2", 20, true], ["Parcial 1", 30, true], ["Parcial 2", 30, true]],
};

const evaluaciones: Evaluacion[] = [];
const notas = new Map<string, number>(); // `${evaluacion}|${estudiante}` → puntos
const estudiantes: Estudiante[] = [];
const inscripciones: [string, string][] = []; // [seccion, estudiante]

const tamanos: Record<string, number> = { s1: 28, s2: 24, s3: 22, s4: 20 };
const r = azar(117);
let consecutivo = 0;
for (const s of secciones) {
  planes[s.id].forEach(([nombre, puntos], i) =>
    evaluaciones.push({ id: `${s.id}e${i}`, seccion_id: s.id, nombre, puntos, orden: i }),
  );
  for (let k = 0; k < tamanos[s.id]; k++) {
    const id = `est${consecutivo++}`;
    const nombre = `${nombres[Math.floor(r() * nombres.length)]} ${apellidos[Math.floor(r() * apellidos.length)]}`;
    const cedula = `V${25000000 + Math.floor(r() * 6000000)}`;
    estudiantes.push({ id, cedula, nombre });
    inscripciones.push([s.id, id]);
    const habilidad = 0.45 + r() * 0.55;
    planes[s.id].forEach(([, puntos, cargada], i) => {
      if (!cargada) return;
      const nota = Math.min(puntos, Math.max(0, puntos * (habilidad + (r() - 0.5) * 0.3)));
      notas.set(`${s.id}e${i}|${id}`, Math.round(nota * 2) / 2);
    });
  }
}

const enmascarar = (c: string) => `${c[0]}-${c.slice(1, Math.max(c.length - 6, 2))}.***.${c.slice(-3)}`;

// Equivalente en TypeScript de la función SQL puntajes().
export function puntajes(materiaId: string, lapsoId: string): Puntaje[] {
  const filas: Puntaje[] = [];
  for (const s of secciones.filter((x) => x.materia_id === materiaId && x.lapso_id === lapsoId)) {
    const conNotas = evaluaciones
      .filter((e) => e.seccion_id === s.id && [...notas.keys()].some((k) => k.startsWith(`${e.id}|`)))
      .sort((a, b) => b.orden - a.orden);
    const reciente = conNotas[0]?.id;
    const evaluado = conNotas.reduce((t, e) => t + e.puntos, 0);
    const evaluadoPrevio = conNotas.slice(1).reduce((t, e) => t + e.puntos, 0);
    for (const [sid, eid] of inscripciones) {
      if (sid !== s.id) continue;
      const est = estudiantes.find((e) => e.id === eid)!;
      let puntos = 0;
      let previos = 0;
      for (const e of conNotas) {
        const n = notas.get(`${e.id}|${eid}`) ?? 0;
        puntos += n;
        if (e.id !== reciente) previos += n;
      }
      filas.push({
        seccion_id: s.id,
        seccion: s.codigo,
        estudiante_id: eid,
        nombre: est.nombre,
        cedula: enmascarar(est.cedula),
        puntos,
        puntos_previos: previos,
        evaluado,
        evaluado_previo: evaluadoPrevio,
      });
    }
  }
  return filas;
}

export function buscarCedula(normalizada: string): string | null {
  return estudiantes.find((e) => e.cedula === normalizada)?.id ?? null;
}

// Para probar la búsqueda en la demo: la cédula completa del 5.º estudiante.
export const cedulaDeEjemplo = estudiantes[4].cedula;
