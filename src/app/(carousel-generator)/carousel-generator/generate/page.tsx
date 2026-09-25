import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateForm } from "@/components/carousel/generate-form";
import { readCarouselTypes } from "@/server/carousel/types/catalog";

export default async function GeneratePage({ searchParams }: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { type: id } = await searchParams;
  if (typeof id !== "string" || !id) notFound();
  let types;
  try { types = await readCarouselTypes(); }
  catch {
    return <section role="alert"><h1 className="text-xl font-semibold">Unable to load this carousel type</h1><p className="my-4 text-sm text-text-muted">The registry is unavailable. Please return to the catalog and retry.</p><Link href="/carousel-generator" className="text-accent">Carousel types</Link></section>;
  }
  const type = types.find(item => item.id === id);
  if (!type) notFound();
  return <GenerateForm type={type} />;
}
