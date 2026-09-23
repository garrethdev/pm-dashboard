import { Suspense } from "react";
import { notFound } from "next/navigation";

/**
 * Catches every address no other route matches, so it can be answered inside
 * the dashboard frame by `../not-found.tsx`. A root `app/not-found.tsx` would
 * also catch them, but it renders outside this group's layout: no menu, no top
 * bar. Real routes always win over a catch-all, so this never shadows a page.
 *
 * `notFound()` is called inside a Suspense boundary, so the answer streams the
 * way a missing phone's does. Called at the top of the page instead, Next
 * sends a bare 404 and React redraws the whole document in the browser; the
 * root layout's theme script then trips a React console error, which the dev
 * server shows as an "Issue" (P13 follow-up, 2026-09-23). The status is 200
 * as a result, which costs nothing on a signed-in internal app.
 */
export default function MissingPage() {
  return (
    <Suspense fallback={null}>
      <Missing />
    </Suspense>
  );
}

async function Missing(): Promise<never> {
  notFound();
}
