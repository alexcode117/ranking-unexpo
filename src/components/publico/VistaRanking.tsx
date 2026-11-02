import Link from "next/link";
import { notFound } from "next/navigation";
import { formatearCedula } from "@/lib/cedula";
import {
  listarLapsos,
  materiaPorSlug,
  modoDemo,
  puntajesDe,
  resolverLapso,
  seccionesDe,
} from "@/lib/datos";
import { cedulaDeEjemplo } from "@/lib/demo";
import { rankingMateria, rankingSeccion } from "@/lib/ranking";
import { obtenerTema } from "@/lib/temas";
import { SelectorLapso } from "./SelectorLapso";
import { TablaRanking } from "./TablaRanking";

export const slugSeccion = (codigo: string) => `seccion-${codigo.toLowerCase()}`;

// Página pública de ranking: de toda la materia (sin seccionSlug) o de una sección.
export async function VistaRanking({
  materiaSlug,
  seccionSlug,
  lapsoCodigo,
}: {
  materiaSlug: string;
  seccionSlug?: string;
  lapsoCodigo?: string;
}) {
  const materia = await materiaPorSlug(materiaSlug);
  if (!materia) notFound();
  const tema = obtenerTema(materia.tema);
  const lapso = await resolverLapso(lapsoCodigo);
  if (!lapso) {
    return (
      <main className={`plano ${tema.clase}`}>
        <div className="lamina">
          <h1 className="rotulo">{materia.nombre}</h1>
          <HojaEnBlanco hayEstudiantes={false} />
        </div>
      </main>
    );
  }

  const [lapsos, secciones, puntajes] = await Promise.all([
    listarLapsos(),
    seccionesDe(materia.id, lapso.id),
    puntajesDe(materia.id, lapso.id),
  ]);
  const seccion = seccionSlug ? secciones.find((s) => slugSeccion(s.codigo) === seccionSlug) : null;
  if (seccionSlug && !seccion) notFound();

  const consulta = lapso.activo ? "" : `?lapso=${encodeURIComponent(lapso.codigo)}`;
  const base = `/${materia.slug}`;
  const rutaActual = seccion ? `${base}/${slugSeccion(seccion.codigo)}` : base;

  const propias = seccion ? puntajes.filter((p) => p.seccion_id === seccion.id) : puntajes;
  const evaluado = seccion ? (propias[0]?.evaluado ?? 0) : Math.max(0, ...propias.map((p) => p.evaluado));
  const filas = seccion
    ? rankingSeccion(propias, tema)
    : rankingMateria(propias.filter((p) => p.evaluado > 0), tema);

  return (
    <main className={`plano ${tema.clase}`}>
      <div className="lamina">
        <header className="cajetin">
          <div>
            <span className="campo">Institución</span>
            <strong>
              <Link href="/">UNEXPO</Link>
            </strong>
          </div>
          <div>
            <span className="campo">Vista</span>
            <strong>{seccion ? `Sección ${seccion.codigo}` : "Toda la materia"}</strong>
          </div>
          <div>
            <label className="campo" htmlFor="lapso">
              Lapso
            </label>
            <SelectorLapso lapsos={lapsos} actual={lapso.codigo} ruta={rutaActual} />
          </div>
          <div>
            <span className="campo">Escala de rangos</span>
            <strong>Dureza del lápiz</strong>
            {modoDemo && <span className="demo"> (datos de prueba)</span>}
          </div>
        </header>

        <h1 className="rotulo">{materia.nombre}</h1>
        <p className="bajada">{tema.lema}</p>

        {secciones.length > 0 && (
          <nav className="pestanas" aria-label="Secciones">
            <Link className="pestana" href={`${base}${consulta}`} aria-current={!seccion ? "page" : undefined}>
              Toda la materia
            </Link>
            {secciones.map((s) => (
              <Link
                key={s.id}
                className="pestana"
                href={`${base}/${slugSeccion(s.codigo)}${consulta}`}
                aria-current={seccion?.id === s.id ? "page" : undefined}
              >
                Sección {s.codigo}
              </Link>
            ))}
          </nav>
        )}

        {filas.length === 0 || evaluado === 0 ? (
          <HojaEnBlanco hayEstudiantes={propias.length > 0} />
        ) : (
          <TablaRanking
            filas={filas}
            modo={seccion ? "seccion" : "materia"}
            evaluado={evaluado}
            tema={tema}
            cedulaEjemplo={modoDemo ? formatearCedula(cedulaDeEjemplo) : undefined}
          />
        )}
      </div>
    </main>
  );
}

function HojaEnBlanco({ hayEstudiantes }: { hayEstudiantes: boolean }) {
  return (
    <section className="hoja-blanca">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="10" y="6" width="44" height="52" />
        <path d="M10 46h44M34 46v12" />
        <path d="M18 18h28M18 26h20" strokeDasharray="3 3" />
      </svg>
      <h2>Hoja en blanco</h2>
      <p>
        {hayEstudiantes
          ? "Aún no hay notas cargadas en este lapso. El ranking aparece con la primera evaluación."
          : "Esta lista todavía no tiene estudiantes. Vuelve cuando el profesor publique la lista."}
      </p>
    </section>
  );
}
