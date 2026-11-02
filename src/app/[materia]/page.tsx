import { VistaRanking } from "@/components/publico/VistaRanking";

export default async function PaginaMateria({
  params,
  searchParams,
}: {
  params: Promise<{ materia: string }>;
  searchParams: Promise<{ lapso?: string }>;
}) {
  const [{ materia }, { lapso }] = await Promise.all([params, searchParams]);
  return <VistaRanking materiaSlug={materia} lapsoCodigo={lapso} />;
}
