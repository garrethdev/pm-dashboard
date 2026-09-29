import { TrendsView } from "@/components/carousel/trends-view";

/* Trends (D10 round three): Feed, Digests, Knowledge and Saved on a rail, one search box over them. */
export const dynamic = "force-dynamic";

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ section?: string; q?: string }> }) {
  const { section, q } = await searchParams;
  return <TrendsView section={section} query={q} />;
}
