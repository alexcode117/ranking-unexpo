"use client";

import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { formatear } from "@/lib/ranking";
import { mensajeError } from "./Guardia";
import type { Evaluacion, Notas } from "./tipos";

export function EditorEvaluaciones({
  seccionId,
  evaluaciones,
  notas,
  alCambiar,
}: {
  seccionId: string;
  evaluaciones: Evaluacion[];
  notas: Notas;
  alCambiar: () => Promise<void>;
}) {
  const sb = supabaseNavegador();
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState({ nombre: "", puntos: "" });
  const [nueva, setNueva] = useState({ nombre: "", puntos: "" });
  const [error, setError] = useState("");

  const total = evaluaciones.reduce((t, e) => t + e.puntos, 0);
  const aNum = (s: string) => Number(s.replace(",", "."));

  async function guardar(accion: PromiseLike<{ error: unknown }>) {
    setError("");
    const { error } = await accion;
    if (error) {
      setError(mensajeError(error));
      return false;
    }
    await alCambiar();
    return true;
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const puntos = aNum(nueva.puntos);
    if (!nueva.nombre.trim() || !(puntos > 0)) return setError("Escribe un nombre y un valor mayor a 0.");
    const orden = Math.max(0, ...evaluaciones.map((x) => x.orden)) + 1;
    const ok = await guardar(
      sb.from("evaluaciones").insert({ seccion_id: seccionId, nombre: nueva.nombre.trim(), puntos, orden }),
    );
    if (ok) setNueva({ nombre: "", puntos: "" });
  }

  async function actualizar(id: string) {
    const puntos = aNum(borrador.puntos);
    if (!borrador.nombre.trim() || !(puntos > 0)) return setError("Escribe un nombre y un valor mayor a 0.");
    const ok = await guardar(sb.from("evaluaciones").update({ nombre: borrador.nombre.trim(), puntos }).eq("id", id));
    if (ok) setEditando(null);
  }

  async function borrar(ev: Evaluacion) {
    const cargadas = Object.keys(notas[ev.id] ?? {}).length;
    const aviso = cargadas
      ? `¿Borrar "${ev.nombre}" y sus ${cargadas} notas? No se puede deshacer.`
      : `¿Borrar "${ev.nombre}"?`;
    if (confirm(aviso)) await guardar(sb.from("evaluaciones").delete().eq("id", ev.id));
  }

  async function mover(i: number, dir: -1 | 1) {
    const a = evaluaciones[i];
    const b = evaluaciones[i + dir];
    if (!a || !b) return;
    await guardar(sb.from("evaluaciones").update({ orden: b.orden }).eq("id", a.id));
    await guardar(sb.from("evaluaciones").update({ orden: a.orden }).eq("id", b.id));
  }

  return (
    <section className="panel">
      <div className="enlinea" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Plan de evaluación</h2>
        </div>
        <div style={{ minWidth: 180 }}>
          <div className={total === 100 ? "estado-ok" : total > 100 ? "estado-error" : "estado-tenue"} style={{ fontSize: 13 }}>
            Ponderación: {formatear(total)} / 100 pts
          </div>
          <div className={`medidor${total > 100 ? " excedido" : ""}`}>
            <span style={{ width: `${Math.min(total, 100)}%` }} />
          </div>
        </div>
      </div>
      {error && <div className="mensaje error">{error}</div>}
      <table className="tabla" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Orden</th>
            <th>Nombre</th>
            <th className="derecha">Vale</th>
            <th className="derecha">Cargadas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {evaluaciones.map((ev, i) => (
            <tr key={ev.id}>
              <td>
                <button className="btn chico" aria-label="Subir" onClick={() => mover(i, -1)} disabled={i === 0}>
                  ↑
                </button>{" "}
                <button
                  className="btn chico"
                  aria-label="Bajar"
                  onClick={() => mover(i, 1)}
                  disabled={i === evaluaciones.length - 1}
                >
                  ↓
                </button>
              </td>
              {editando === ev.id ? (
                <>
                  <td>
                    <input
                      value={borrador.nombre}
                      onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </td>
                  <td className="derecha">
                    <input
                      value={borrador.puntos}
                      inputMode="decimal"
                      onChange={(e) => setBorrador({ ...borrador, puntos: e.target.value })}
                      style={{ width: 70, textAlign: "right" }}
                    />
                  </td>
                  <td />
                  <td className="derecha">
                    <button className="btn chico primario" onClick={() => actualizar(ev.id)}>
                      Guardar
                    </button>{" "}
                    <button className="btn chico" onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td>{ev.nombre}</td>
                  <td className="derecha cifra">{formatear(ev.puntos)}</td>
                  <td className="derecha cifra">{Object.keys(notas[ev.id] ?? {}).length}</td>
                  <td className="derecha">
                    <button
                      className="btn chico"
                      onClick={() => {
                        setEditando(ev.id);
                        setBorrador({ nombre: ev.nombre, puntos: String(ev.puntos) });
                      }}
                    >
                      Editar
                    </button>{" "}
                    <button className="btn chico peligro" onClick={() => borrar(ev)}>
                      Borrar
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <form className="enlinea" style={{ marginTop: 12 }} onSubmit={crear}>
        <input
          placeholder="Lámina 4: perspectiva"
          value={nueva.nombre}
          onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
          style={{ flex: "1 1 200px" }}
        />
        <input
          placeholder="Pts"
          inputMode="decimal"
          value={nueva.puntos}
          onChange={(e) => setNueva({ ...nueva, puntos: e.target.value })}
          style={{ width: 80 }}
        />
        <button className="btn">Agregar evaluación</button>
      </form>
    </section>
  );
}
