"use client";

import { useMemo, useRef, useState } from "react";
import { formatearCedula } from "@/lib/cedula";
import { detectarColumnas, interpretar, leerArchivo, type Columnas, type Hoja } from "@/lib/importar";
import { formatear } from "@/lib/ranking";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { mensajeError } from "./Guardia";
import type { Estudiante, Evaluacion, Notas } from "./tipos";

const SOLO_LISTA = "";

export function Importador({
  seccionId,
  evaluaciones,
  estudiantes,
  notas,
  alCambiar,
}: {
  seccionId: string;
  evaluaciones: Evaluacion[];
  estudiantes: Estudiante[];
  notas: Notas;
  alCambiar: () => Promise<void>;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState("");
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [col, setCol] = useState<Columnas | null>(null);
  const [destino, setDestino] = useState(SOLO_LISTA);
  const [arrastrando, setArrastrando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const evaluacion = evaluaciones.find((e) => e.id === destino) ?? null;
  const filas = useMemo(
    () => (hoja && col ? interpretar(hoja, col, evaluacion ? evaluacion.puntos : null) : []),
    [hoja, col, evaluacion],
  );

  const porCedula = useMemo(() => new Map(estudiantes.map((e) => [e.cedula, e])), [estudiantes]);
  const validas = filas.filter((f) => !f.error);
  const errores = filas.filter((f) => f.error);
  const nuevos = validas.filter((f) => !porCedula.has(f.cedula!));
  const anteriores = evaluacion ? notas[evaluacion.id] ?? {} : {};
  const cambian = validas.filter((f) => {
    const est = porCedula.get(f.cedula!);
    return est && f.puntos !== null && anteriores[est.id] !== undefined && anteriores[est.id] !== f.puntos;
  });
  const sinNota = evaluacion ? validas.filter((f) => f.puntos === null) : [];

  async function abrir(f: File | undefined) {
    if (!f) return;
    setMsg(null);
    try {
      const h = await leerArchivo(f);
      if (h.encabezados.length === 0) throw new Error("No se encontró una fila de encabezados.");
      setArchivo(f.name);
      setHoja(h);
      setCol(detectarColumnas(h.encabezados));
    } catch (e) {
      setHoja(null);
      setMsg({ tipo: "error", texto: `No se pudo leer el archivo: ${mensajeError(e)}` });
    }
  }

  async function confirmar() {
    setGuardando(true);
    setMsg(null);
    const { data, error } = await supabaseNavegador().rpc("importar_lista", {
      p_seccion: seccionId,
      p_evaluacion: evaluacion?.id ?? null,
      p_filas: validas.map((f) => ({ cedula: f.cedula, nombre: f.nombre, puntos: f.puntos })),
    });
    setGuardando(false);
    if (error) return setMsg({ tipo: "error", texto: mensajeError(error) });
    setMsg({
      tipo: "ok",
      texto: `${data} estudiantes procesados${evaluacion ? ` con notas de "${evaluacion.nombre}"` : ""}.`,
    });
    setHoja(null);
    setArchivo("");
    if (entrada.current) entrada.current.value = "";
    await alCambiar();
  }

  const faltaColumna = col && (col.cedula < 0 || col.nombre < 0 || (evaluacion && col.nota < 0));

  return (
    <section className="panel">
      <h2>Cargar desde archivo</h2>

      <label style={{ display: "grid", gap: 4, margin: "12px 0", fontSize: 14 }}>
        ¿Qué contiene el archivo?
        <select value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value={SOLO_LISTA}>Solo la lista de estudiantes (nombre y cédula)</option>
          {evaluaciones.map((e) => (
            <option key={e.id} value={e.id}>
              Notas de: {e.nombre} (vale {formatear(e.puntos)} pts)
            </option>
          ))}
        </select>
      </label>

      <div
        className={`zona-carga${arrastrando ? " activa" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => entrada.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && entrada.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          abrir(e.dataTransfer.files[0]);
        }}
      >
        <strong>{archivo || "Arrastra el archivo aquí o haz clic para elegirlo"}</strong>
        <span style={{ fontSize: 13 }}>Columnas esperadas: nombre, cédula y nota (en cualquier orden)</span>
        <input
          ref={entrada}
          type="file"
          hidden
          accept=".csv,.txt,.xlsx,.xls,.ods"
          onChange={(e) => abrir(e.target.files?.[0])}
        />
      </div>

      {msg && <div className={`mensaje ${msg.tipo}`}>{msg.texto}</div>}

      {hoja && col && (
        <>
          <div className="rejilla-2" style={{ marginTop: 14, gap: 10 }}>
            {(
              [
                ["nombre", "Nombre"],
                ["apellido", "Apellido (opcional)"],
                ["cedula", "Cédula"],
                ["nota", "Nota"],
              ] as [keyof Columnas, string][]
            ).map(([clave, texto]) => (
              <label key={clave} style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Columna de {texto}
                <select
                  value={col[clave]}
                  onChange={(e) => setCol({ ...col, [clave]: Number(e.target.value) })}
                  disabled={clave === "nota" && !evaluacion}
                >
                  <option value={-1}>—</option>
                  {hoja.encabezados.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Columna ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {faltaColumna ? (
            <div className="mensaje error">Indica qué columna es la cédula, el nombre{evaluacion && " y la nota"}.</div>
          ) : (
            <>
              <ul style={{ fontSize: 14, lineHeight: 1.9, paddingLeft: 18 }}>
                <li className="estado-ok">{validas.length} filas listas para guardar</li>
                {nuevos.length > 0 && <li className="estado-nuevo">{nuevos.length} estudiantes nuevos en esta sección</li>}
                {cambian.length > 0 && <li className="estado-nuevo">{cambian.length} notas existentes cambiarán</li>}
                {sinNota.length > 0 && <li className="estado-tenue">{sinNota.length} filas sin nota (se agregan a la lista)</li>}
                {errores.length > 0 && <li className="estado-error">{errores.length} filas con errores (no se guardarán)</li>}
              </ul>

              {errores.length > 0 && (
                <table className="tabla" style={{ marginBottom: 12 }}>
                  <tbody>
                    {errores.slice(0, 20).map((f) => (
                      <tr key={f.linea}>
                        <td className="cifra">Fila {f.linea}</td>
                        <td>{f.nombre || "—"}</td>
                        <td className="estado-error">{f.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <details>
                <summary style={{ cursor: "pointer", fontSize: 14 }}>Vista previa ({validas.length})</summary>
                <div className="desplazable" style={{ maxHeight: 320, overflowY: "auto" }}>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Cédula</th>
                        <th>Nombre</th>
                        {evaluacion && <th className="derecha">Nota</th>}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {validas.map((f) => (
                        <tr key={f.cedula}>
                          <td className="cifra">{formatearCedula(f.cedula!)}</td>
                          <td>{f.nombre}</td>
                          {evaluacion && <td className="derecha cifra">{f.puntos === null ? "—" : formatear(f.puntos)}</td>}
                          <td className="estado-nuevo">{porCedula.has(f.cedula!) ? "" : "nuevo"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              <div className="enlinea" style={{ marginTop: 12 }}>
                <button className="btn primario" onClick={confirmar} disabled={guardando || validas.length === 0}>
                  {guardando ? "Guardando…" : `Guardar ${validas.length} filas`}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setHoja(null);
                    setArchivo("");
                  }}
                >
                  Descartar
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
