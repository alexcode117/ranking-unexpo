"use client";

import { useState } from "react";
import { formatearCedula, normalizarCedula } from "@/lib/cedula";
import { formatear } from "@/lib/ranking";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { mensajeError } from "./Guardia";
import type { Estudiante, Evaluacion, Notas } from "./tipos";

type EstadoCelda = "guardando" | "guardado" | "error";

// Hoja de cálculo de notas: cada celda se guarda al salir de ella.
// Dejar una celda vacía borra la nota.
export function GrillaNotas({
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
  const sb = supabaseNavegador();
  const [estados, setEstados] = useState<Record<string, EstadoCelda>>({});
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");
  const [nuevo, setNuevo] = useState({ cedula: "", nombre: "" });

  async function guardarCelda(ev: Evaluacion, est: Estudiante, texto: string) {
    const clave = `${ev.id}|${est.id}`;
    const actual = notas[ev.id]?.[est.id];
    const limpio = texto.trim().replace(",", ".");
    const valor = limpio === "" ? null : Number(limpio);
    if (valor === (actual ?? null)) return;
    if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > ev.puntos)) {
      setEstados((s) => ({ ...s, [clave]: "error" }));
      setError(`La nota de ${est.nombre} en "${ev.nombre}" debe estar entre 0 y ${ev.puntos}.`);
      return;
    }
    setError("");
    setEstados((s) => ({ ...s, [clave]: "guardando" }));
    const { error } =
      valor === null
        ? await sb.from("notas").delete().match({ evaluacion_id: ev.id, estudiante_id: est.id })
        : await sb.from("notas").upsert({ evaluacion_id: ev.id, estudiante_id: est.id, puntos: valor });
    if (error) {
      setEstados((s) => ({ ...s, [clave]: "error" }));
      setError(mensajeError(error));
      return;
    }
    setEstados((s) => ({ ...s, [clave]: "guardado" }));
    await alCambiar();
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const cedula = normalizarCedula(nuevo.cedula);
    if (!cedula || !nuevo.nombre.trim()) return setError("Escribe una cédula válida y el nombre.");
    const { error } = await sb.rpc("importar_lista", {
      p_seccion: seccionId,
      p_evaluacion: null,
      p_filas: [{ cedula, nombre: nuevo.nombre.trim(), puntos: null }],
    });
    if (error) return setError(mensajeError(error));
    setNuevo({ cedula: "", nombre: "" });
    setError("");
    await alCambiar();
  }

  async function retirar(est: Estudiante) {
    if (!confirm(`¿Retirar a ${est.nombre} de esta sección? Sus notas de esta sección se borrarán.`)) return;
    const ids = evaluaciones.map((e) => e.id);
    if (ids.length) {
      const r = await sb.from("notas").delete().eq("estudiante_id", est.id).in("evaluacion_id", ids);
      if (r.error) return setError(mensajeError(r.error));
    }
    const { error } = await sb.from("inscripciones").delete().match({ seccion_id: seccionId, estudiante_id: est.id });
    if (error) return setError(mensajeError(error));
    await alCambiar();
  }

  const f = filtro.trim().toLowerCase();
  const digitos = f.replace(/\D/g, "");
  const visibles = estudiantes.filter(
    (e) => !f || e.nombre.toLowerCase().includes(f) || (digitos && e.cedula.includes(digitos)),
  );

  return (
    <section className="panel">
      <div className="enlinea" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Notas de {estudiantes.length} estudiantes</h2>
        </div>
        <input placeholder="Filtrar por nombre o cédula" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>
      {error && <div className="mensaje error">{error}</div>}

      <div className="desplazable" style={{ marginTop: 10 }}>
        <table className="tabla grilla-notas">
          <thead>
            <tr>
              <th className="fija">Estudiante</th>
              {evaluaciones.map((ev) => (
                <th key={ev.id} className="derecha" title={ev.nombre}>
                  {ev.nombre.length > 16 ? `${ev.nombre.slice(0, 15)}…` : ev.nombre}
                  <br />/ {formatear(ev.puntos)}
                </th>
              ))}
              <th className="derecha">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((est) => {
              const total = evaluaciones.reduce((t, ev) => t + (notas[ev.id]?.[est.id] ?? 0), 0);
              return (
                <tr key={est.id}>
                  <td className="fija">
                    {est.nombre}
                    <div className="cifra estado-tenue" style={{ fontSize: 12 }}>
                      {formatearCedula(est.cedula)}
                    </div>
                  </td>
                  {evaluaciones.map((ev) => {
                    const clave = `${ev.id}|${est.id}`;
                    const v = notas[ev.id]?.[est.id];
                    return (
                      <td key={ev.id} className="derecha">
                        <input
                          key={`${clave}-${v ?? ""}`}
                          defaultValue={v === undefined ? "" : String(v).replace(".", ",")}
                          inputMode="decimal"
                          aria-label={`Nota de ${est.nombre} en ${ev.nombre}`}
                          className={estados[clave] ?? ""}
                          onBlur={(e) => guardarCelda(ev, est, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        />
                      </td>
                    );
                  })}
                  <td className="derecha cifra">
                    <strong>{formatear(total)}</strong>
                  </td>
                  <td className="derecha">
                    <button className="btn chico peligro" onClick={() => retirar(est)}>
                      Retirar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form className="enlinea" style={{ marginTop: 12 }} onSubmit={agregar}>
        <input
          placeholder="V-27.123.481"
          value={nuevo.cedula}
          onChange={(e) => setNuevo({ ...nuevo, cedula: e.target.value })}
          style={{ width: 150 }}
        />
        <input
          placeholder="Nombre y apellido"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          style={{ flex: "1 1 200px" }}
        />
        <button className="btn">Agregar estudiante</button>
      </form>
    </section>
  );
}
