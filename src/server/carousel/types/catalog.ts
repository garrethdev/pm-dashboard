import { sbRestAll } from "@/lib/data/supabase";
import { carouselCatalog, type RegistryCarouselRow } from "@/lib/carousel/types/catalog";

/** Read only the shared registry; generator setup will have its own repository.
 * Explicit columns prevent leaking unrelated registry configuration to clients.
 */
export async function readCarouselTypes() {
  const rows = await sbRestAll<RegistryCarouselRow>(
    "content_type_registry?select=content_type,display_name,character_name:character,media_shape,lifecycle&media_shape=eq.image_carousel&order=content_type.asc",
  );
  return carouselCatalog(rows);
}
