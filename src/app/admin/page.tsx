"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Guardia, mensajeError } from "@/components/admin/Guardia";
import { supabaseNavegador } from "@/lib/supabase/cliente";

type Lapso = { id: string; codigo: string; activo: boolean };
type Materia = { id: string; nombre: string; slug: string };
type Seccion = { id: string; codigo: string; materia_id: string; inscripciones: { count: number }[] };

export default function InicioAdmin() {
  return (
    <Guardia>
      <Escritorio />
    </Guardia>
  );
}

function Escritorio() {
  const sb = supabaseNavegador();
  const [lapsos, setLapsos] = useState<Lapso[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [lapsoId, setLapsoId] = useState("");
  const [nuevoLapso, setNuevoLapso] = useState("");
  const [nuevaSeccion, setNuevaSeccion] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cargarBase = useCallback(async () => {
    const [l, m] = await Promise.all([
      sb.from("lapsos").select("id, codigo, activo").order("creado", { ascending: false }),
      sb.from("materias").select("id, nombre, slug").order("orden"),
    ]);
    setLapsos(l.data ?? []);
    setMaterias(m.data ?? []);
    setLapsoId((actual) => actual || l.data?.find((x) => x.activo)?.id || l.data?.[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarSecciones = useCallback(async () => {
    if (!lapsoId) return setSecciones([]);
    const { data } = await sb
      .from("secciones")
      .select("id, codigo, materia_id, inscripciones(count)")
      .eq("lapso_id", lapsoId)
      .order("codigo");
    setSecciones((data as Seccion[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lapsoId]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);
  useEffect(() => {
    cargarSecciones();
  }, [cargarSecciones]);

  async function ejecutar(accion: () => PromiseLike<{ error: unknown }>, exito: string) {
    setMsg(null);
    const { error } = await accion();
    if (error) setMsg({ tipo: "error", texto: mensajeError(error) });
    else setMsg({ tipo: "ok", texto: exito });
    return !error;
  }

  async function crearLapso(e: React.FormEvent) {
    e.preventDefault();
    const codigo = nuevoLapso.trim();
    if (!codigo) return;
    const primero = lapsos.length === 0;
    if (await ejecutar(() => sb.from("lapsos").insert({ codigo, activo: primero }), `Lapso ${codigo} creado`)) {
      setNuevoLapso("");
      await cargarBase();
    }
  }

  async function activar(id: string) {
    // Primero se desactiva el actual para respetar "un solo lapso activo".
    await sb.from("lapsos").update({ activo: false }).eq("activo", true);
    await ejecutar(() => sb.from("lapsos").update({ activo: true }).eq("id", id), "Lapso activo actualizado");
    await cargarBase();
  }

  async function crearSeccion(materiaId: string) {
    const codigo = (nuevaSeccion[materiaId] ?? "").trim().padStart(2, "0");
    if (!codigo || !lapsoId) return;
    const ok = await ejecutar(
      () => sb.from("secciones").insert({ materia_id: materiaId, lapso_id: lapsoId, codigo }),
      `Sección ${codigo} creada`,
    );
    if (ok) {
      setNuevaSeccion((s) => ({ ...s, [materiaId]: "" }));
      await cargarSecciones();
    }
  }

  const lapso = lapsos.find((l) => l.id === lapsoId);

  return (
    <>
      {msg && <div className={`mensaje ${msg.tipo}`}>{msg.texto}</div>}
      <div className="rejilla-2">
        <section className="panel">
          <span className="paso">Paso 1</span>
          <h2>Lapsos académicos</h2>
          <table className="tabla" style={{ marginTop: 8 }}>
            <tbody>
              {lapsos.map((l) => (
                <tr key={l.id}>
                  <td>
                    <label className="enlinea" style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="lapso"
                        style={{ height: "auto" }}
                        checked={l.id === lapsoId}
                        onChange={() => setLapsoId(l.id)}
                      />
                      <strong>{l.codigo}</strong>
                    </label>
                  </td>
                  <td className="derecha">
                    {l.activo ? (
                      <span className="estado-ok">● En curso (visible por defecto)</span>
                    ) : (
                      <button className="btn chico" onClick={() => activar(l.id)}>
                        Marcar en curso
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="enlinea" style={{ marginTop: 12 }} onSubmit={crearLapso}>
            <input placeholder="2027-I" value={nuevoLapso} onChange={(e) => setNuevoLapso(e.target.value)} />
            <button className="btn">Crear lapso</button>
          </form>
          <p className="estado-tenue" style={{ fontSize: 13 }}>
            Los lapsos anteriores quedan guardados y se pueden consultar desde el sitio público.
          </p>
        </section>

        <section className="panel">
          <span className="paso">Paso 2</span>
          <h2>Secciones {lapso ? `del lapso ${lapso.codigo}` : ""}</h2>
          {!lapso && <p className="estado-tenue">Crea un lapso primero.</p>}
          {lapso &&
            materias.map((m) => (
              <div key={m.id} className="materia-bloque" style={{ marginTop: 16 }}>
                <h3>{m.nombre}</h3>
                <div className="lista-secciones">
                  {secciones
                    .filter((s) => s.materia_id === m.id)
                    .map((s) => (
                      <Link key={s.id} href={`/admin/seccion/${s.id}`}>
                        <strong>Sección {s.codigo}</strong>
                        <span className="estado-tenue">{s.inscripciones[0]?.count ?? 0} estudiantes</span>
                      </Link>
                    ))}
                </div>
                <div className="enlinea" style={{ marginTop: 8 }}>
                  <input
                    placeholder="01"
                    style={{ width: 80 }}
                    value={nuevaSeccion[m.id] ?? ""}
                    onChange={(e) => setNuevaSeccion((s) => ({ ...s, [m.id]: e.target.value }))}
                  />
                  <button className="btn chico" onClick={() => crearSeccion(m.id)}>
                    Agregar sección
                  </button>
                </div>
              </div>
            ))}
        </section>
      </div>
    </>
  );
}
