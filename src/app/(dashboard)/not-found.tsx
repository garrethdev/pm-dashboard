import { NotFoundState } from "@/components/shell/not-found-state";
import { Search } from "@/components/ui/icons";

/**
 * Any other address that leads nowhere (P13 review). It lives in the dashboard
 * group rather than at the app root so the menu and top bar stay on screen;
 * `[...missing]/page.tsx` is what routes an unknown address here.
 */
export default function PageNotFound() {
  return (
    <NotFoundState icon={Search} href="/" linkLabel="Dashboard">
      This page doesn&apos;t exist
    </NotFoundState>
  );
}
