import * as XLSX from "xlsx";
import { normalizarCedula } from "./cedula";

export type Hoja = { encabezados: string[]; filas: unknown[][]; primeraLinea: number };
export type Columnas = { nombre: number; apellido: number; cedula: number; nota: number };

export type FilaImportada = {
  linea: number; // número de fila en el archivo, para los mensajes
  nombre: string;
  cedula: string | null; // normalizada
  cedulaOriginal: string;
  puntos: number | null;
  error?: string;
};

// Lee la primera hoja de un .xlsx/.xls/.csv. La fila de encabezados es la
// primera con al menos dos celdas de texto.
export async function leerArchivo(archivo: File): Promise<Hoja> {
  let libro: XLSX.WorkBook;
  if (/\.(csv|txt)$/i.test(archivo.name)) {
    const texto = await archivo.text();
    // Excel en español guarda los CSV con ";" (la coma es el decimal).
    const inicio = texto.split(/\r?\n/, 6).join("\n");
    const separador = (inicio.match(/;/g)?.length ?? 0) >= (inicio.match(/,/g)?.length ?? 0) ? ";" : ",";
    libro = XLSX.read(texto, { type: "string", FS: separador, raw: true });
  } else {
    libro = XLSX.read(await archivo.arrayBuffer(), { type: "array" });
  }
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false, defval: "" });
  const inicio = matriz.findIndex((f) => f.filter((c) => typeof c === "string" && c.trim()).length >= 2);
  if (inicio < 0) return { encabezados: [], filas: [], primeraLinea: 1 };
  return {
    encabezados: matriz[inicio].map((c) => String(c).trim()),
    filas: matriz.slice(inicio + 1),
    primeraLinea: inicio + 2,
  };
}

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Adivina qué columna es cuál por el texto del encabezado.
export function detectarColumnas(encabezados: string[]): Columnas {
  const h = encabezados.map(sinAcentos);
  const buscar = (patron: RegExp, excluir = -1) => h.findIndex((x, i) => i !== excluir && patron.test(x));
  const apellido = buscar(/^apellidos?$/);
  let nombre = buscar(/^(nombres?|nombreyapellido|nombresyapellidos|apellidosynombres|estudiante|alumno|participante)/);
  if (nombre < 0) nombre = buscar(/nombre|estudiante|alumno/, apellido);
  return {
    nombre,
    apellido: apellido === nombre ? -1 : apellido,
    cedula: buscar(/^(cedula|ci|cid|cedulaidentidad|cedulade|documento|identificacion)/),
    nota: buscar(/^(nota|puntos|puntaje|calificacion|pts|total|definitiva)/),
  };
}

function aNumero(v: unknown): number | null {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Convierte las filas crudas en filas validadas. maximo = valor de la evaluación
// (null si solo se importa la lista).
export function interpretar(hoja: Hoja, col: Columnas, maximo: number | null): FilaImportada[] {
  const vistas = new Set<string>();
  const salida: FilaImportada[] = [];
  hoja.filas.forEach((f, i) => {
    const celda = (k: number) => (k >= 0 ? String(f[k] ?? "").trim() : "");
    const nombre = [celda(col.nombre), celda(col.apellido)].filter(Boolean).join(" ").replace(/\s+/g, " ");
    const cedulaOriginal = celda(col.cedula);
    if (!nombre && !cedulaOriginal) return; // fila vacía
    const cedula = normalizarCedula(cedulaOriginal);
    const puntos = maximo !== null && col.nota >= 0 ? aNumero(f[col.nota]) : null;
    const fila: FilaImportada = { linea: hoja.primeraLinea + i, nombre, cedula, cedulaOriginal, puntos };

    if (!cedula) fila.error = `Cédula inválida: "${cedulaOriginal || "vacía"}"`;
    else if (vistas.has(cedula)) fila.error = "Cédula repetida en el archivo";
    else if (!nombre) fila.error = "Falta el nombre";
    else if (puntos !== null && Number.isNaN(puntos)) fila.error = `Nota no numérica: "${celda(col.nota)}"`;
    else if (puntos !== null && maximo !== null && (puntos < 0 || puntos > maximo))
      fila.error = `Nota ${puntos} fuera de rango (0–${maximo})`;

    if (cedula) vistas.add(cedula);
    salida.push(fila);
  });
  return salida;
}
