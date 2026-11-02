import Link from "next/link";
import { listarMaterias, modoDemo, resolverLapso } from "@/lib/datos";
import { obtenerTema } from "@/lib/temas";

// Dibujo de cada lámina en la portada: una pieza con su línea de eje.
const dibujos: Record<string, React.ReactNode> = {
  dibujo: (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <rect x="20" y="30" width="80" height="60" />
      <circle cx="60" cy="60" r="18" />
      <path className="oculta" d="M42 30v60M78 30v60" />
      <path className="eje" d="M60 20v80M10 60h100" />
    </svg>
  ),
  "dibujo-ii": (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 18l38 22v40l-38 22-38-22V40z" />
      <path d="M22 40l38 22 38-22M60 62v40" />
      <path className="oculta" d="M60 18v44" />
      <path className="eje" d="M60 8v104" />
    </svg>
  ),
};

export default async function Portada() {
  const [materias, lapso] = await Promise.all([listarMaterias(), resolverLapso()]);
  return (
    <main className="plano tema-dibujo">
      <div className="lamina">
        <header className="cajetin">
          <div>
            <span className="campo">Institución</span>
            <strong>UNEXPO</strong>
          </div>
          <div>
            <span className="campo">Área</span>
            <strong>Dibujo Técnico</strong>
          </div>
          <div>
            <span className="campo">Lapso</span>
            <strong>{lapso?.codigo ?? "Por definir"}</strong>
          </div>
          <div>
            <span className="campo">Escala de rangos</span>
            <strong>Dureza del lápiz</strong>
            {modoDemo && <span className="demo"> (datos de prueba)</span>}
          </div>
        </header>

        <h1 className="rotulo">Ranking de la lámina</h1>
        <p className="bajada">
          Elige tu materia, ubícate con tu cédula y mira cuántos puntos llevas. Con cada evaluación tu mina se afila,
          del garabato 6B al trazo preciso 9H.
        </p>

        <div className="laminas">
          {materias.map((m) => {
            const tema = obtenerTema(m.tema);
            return (
              <Link key={m.id} href={`/${m.slug}`} className={`tarjeta-lamina ${tema.clase}`}>
                <div className="dibujo">{dibujos[m.tema] ?? dibujos.dibujo}</div>
                <div className="pie">
                  <h2>{m.nombre}</h2>
                  <div>Ver ranking</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
