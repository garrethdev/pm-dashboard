import { fontStylesheetHref } from "@/lib/carousel/fonts";

/** Loads the slide fonts on a page that draws slides (the Studio, the batch page). */
export function SlideFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontStylesheetHref()} />
    </>
  );
}
