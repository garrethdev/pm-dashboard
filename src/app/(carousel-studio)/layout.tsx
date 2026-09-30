/*
 * The Studio's frame (D6): full-bleed, with no dashboard menu and no top bar.
 * The canvas needs the width, and the Studio carries its own top strip with
 * the way back, the title, Discard and Save. A route group of its own rather
 * than a nested layout, because a nested layout can only add to the shell,
 * never take the menu away.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-4 text-text-primary md:px-6">
      {children}
    </div>
  );
}
