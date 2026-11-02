import { VistaRanking } from "@/components/publico/VistaRanking";

export default async function PaginaSeccion({
  params,
  searchParams,
}: {
  params: Promise<{ materia: string; seccion: string }>;
  searchParams: Promise<{ lapso?: string }>;
}) {
  const [{ materia, seccion }, { lapso }] = await Promise.all([params, searchParams]);
  return <VistaRanking materiaSlug={materia} seccionSlug={seccion} lapsoCodigo={lapso} />;
}
