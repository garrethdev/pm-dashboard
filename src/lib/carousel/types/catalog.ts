/** Browser-safe view model. Registry keys are strings, not generator UUIDs. */
export interface CarouselTypeSummary {
  id: string;
  name: string;
  character: string;
  lifecycle: string;
}

export interface RegistryCarouselRow {
  content_type: string;
  display_name: string | null;
  character_name: string | null;
  media_shape: string;
  lifecycle: string;
}

/** Do not infer slide counts, Writing readiness or batch state from posting data. */
export function carouselCatalog(rows: readonly RegistryCarouselRow[]): CarouselTypeSummary[] {
  return rows.filter(row => row.media_shape === "image_carousel").map(row => ({
    id: row.content_type,
    name: row.display_name || row.content_type,
    character: row.character_name || "Unassigned",
    lifecycle: row.lifecycle,
  })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
