/**
 * NuvoPatents: two open claim brackets joined by the diagonal of an N.
 * Refined from a QuiverAI concept onto a simple 64-unit grid.
 * Keep this geometry shared by the inline mark and all exported icon files.
 */
export const MARK_VIEWBOX = "0 0 64 64";
export const BRAND_BLUE = "#2563eb";
export const BRAND_INK = "#0f172a";

export const MARK_PATHS = [
  { name: "left-claim-bracket", outline: "M27 8H8V56H27V48H16V16H27Z" },
  { name: "connecting-diagonal", outline: "M8 8H19L56 56H45Z" },
  { name: "right-claim-bracket", outline: "M37 8H56V56H37V48H48V16H37Z" },
] as const;

/** Plain SVG only: no scripts, text, fonts, filters, or external references. */
export function createMarkSvg(color = BRAND_BLUE, tileBackground?: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" fill="none">`,
    "  <!-- NuvoPatents claim-bracket mark. Editable 64-unit geometry. -->",
    ...(tileBackground ? [`  <rect width="64" height="64" rx="12" fill="${tileBackground}"/>`] : []),
    ...MARK_PATHS.map(path => `  <path id="${path.name}" d="${path.outline}" fill="${color}"/>`),
    "</svg>",
    "",
  ].join("\n");
}
