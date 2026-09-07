/**
 * The page's light source: two tall, heavily blurred ellipses.
 *
 * Geometry is ported from Garreth's Figma edit (node 9:2, "Background light"),
 * where the frame is 1600x1000 and the content column starts at x=240. The
 * ellipses are 333x845 at (651, -204) and (1573, 140), so relative to the
 * 1360-wide column that is 24.5% x 84.5% at 30.2%/-20.4% and 98%/14%.
 *
 * Percentages rather than pixels so the light keeps its position in the layout
 * at other widths; the blur stays fixed, since scaling it with the viewport
 * makes it bloom absurdly on a wide monitor.
 */
export function PageGlow() {
  return (
    <div className="glow-layer" aria-hidden>
      <span
        style={{
          left: "30.2%",
          top: "-20.4%",
          width: "24.5%",
          height: "84.5%",
          background: "var(--glow-a)",
        }}
      />
      <span
        style={{
          left: "98%",
          top: "14%",
          width: "24.5%",
          height: "84.5%",
          background: "var(--glow-b)",
        }}
      />
    </div>
  );
}
