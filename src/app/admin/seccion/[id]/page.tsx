"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { EditorEvaluaciones } from "@/components/admin/EditorEvaluaciones";
import { GrillaNotas } from "@/components/admin/GrillaNotas";
import { Guardia } from "@/components/admin/Guardia";
import { Importador } from "@/components/admin/Importador";
import type { Estudiante, Evaluacion, Notas } from "@/components/admin/tipos";
import { supabaseNavegador } from "@/lib/supabase/cliente";

type Cabecera = {
  codigo: string;
  materias: { nombre: string; slug: string };
  lapsos: { codigo: string; activo: boolean };
};

export default function PaginaSeccion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Guardia>
      <Seccion id={id} />
    </Guardia>
  );
}

function Seccion({ id }: { id: string }) {
  const sb = supabaseNavegador();
  const [cab, setCab] = useState<Cabecera | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [notas, setNotas] = useState<Notas>({});
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [s, ev, ins] = await Promise.all([
      sb.from("secciones").select("codigo, materias(nombre, slug), lapsos(codigo, activo)").eq("id", id).single(),
      sb.from("evaluaciones").select("id, nombre, puntos, orden").eq("seccion_id", id).order("orden"),
      sb.from("inscripciones").select("estudiantes(id, cedula, nombre)").eq("seccion_id", id),
    ]);
    if (s.error) return setError("No se encontró la sección.");
    setCab(s.data as unknown as Cabecera);
    const evs = (ev.data ?? []).map((e) => ({ ...e, puntos: Number(e.puntos) }));
    setEvaluaciones(evs);
    const ests = ((ins.data ?? []) as unknown as { estudiantes: Estudiante }[])
      .map((r) => r.estudiantes)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    setEstudiantes(ests);

    const mapa: Notas = {};
    if (evs.length) {
      const { data } = await sb
        .from("notas")
        .select("evaluacion_id, estudiante_id, puntos")
        .in("evaluacion_id", evs.map((e) => e.id));
      for (const n of data ?? []) (mapa[n.evaluacion_id] ??= {})[n.estudiante_id] = Number(n.puntos);
    }
    setNotas(mapa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <div className="mensaje error">{error}</div>;
  if (!cab) return <p className="estado-tenue">Cargando…</p>;

  const rutaPublica = `/${cab.materias.slug}/seccion-${cab.codigo.toLowerCase()}${
    cab.lapsos.activo ? "" : `?lapso=${encodeURIComponent(cab.lapsos.codigo)}`
  }`;

  return (
    <>
      <div className="enlinea" style={{ justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <Link href="/admin" className="estado-tenue" style={{ fontSize: 14 }}>
            Volver a lapsos y secciones
          </Link>
          <h1>
            {cab.materias.nombre}, sección {cab.codigo}
          </h1>
          <span className="estado-tenue">Lapso {cab.lapsos.codigo}</span>
        </div>
        <Link href={rutaPublica} target="_blank" className="btn">
          Abrir ranking público
        </Link>
      </div>

      <div className="rejilla-2">
        <EditorEvaluaciones seccionId={id} evaluaciones={evaluaciones} notas={notas} alCambiar={cargar} />
        <Importador
          seccionId={id}
          evaluaciones={evaluaciones}
          estudiantes={estudiantes}
          notas={notas}
          alCambiar={cargar}
        />
      </div>
      <div style={{ marginTop: 20 }}>
        <GrillaNotas
          seccionId={id}
          evaluaciones={evaluaciones}
          estudiantes={estudiantes}
          notas={notas}
          alCambiar={cargar}
        />
      </div>
    </>
  );
}
