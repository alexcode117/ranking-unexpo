import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="plano tema-dibujo">
      <div className="lamina">
        <h1 className="rotulo">Lámina no encontrada</h1>
        <p className="bajada">
          Esa materia o sección no existe en este lapso. Vuelve a la <Link href="/">portada</Link> y elige desde allí.
        </p>
      </div>
    </main>
  );
}
