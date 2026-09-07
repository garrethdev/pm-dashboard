/**
 * Sidebar toggle glyph — a rounded panel with its rail filled in, matching the
 * reference dashboard. Drawn here rather than pulled from the icon set because
 * lucide's panel icons are stroke-only, and the solid rail is the whole point:
 * it reads as "the sidebar", not as a generic square.
 */
export function SidebarToggleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 4h1.5a0 0 0 0 1 0 0v16a0 0 0 0 1 0 0H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        fill="currentColor"
      />
    </svg>
  );
}
